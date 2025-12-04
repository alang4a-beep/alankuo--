import { create } from 'zustand';
import { Vector3, CatmullRomCurve3 } from 'three';
import { 
  GameStatus, 
  ChunkType, 
  TrackChunkData, 
  CHUNK_LENGTH, 
  CHUNKS_TO_RENDER,
  QuizQuestion,
  BOOST_MULTIPLIER,
  PENALTY_MULTIPLIER,
  EFFECT_DURATION,
  TRACK_WIDTH,
  ItemBoxData,
  ObstacleData,
  ObstacleType
} from './types';

// Question Bank
const QUESTIONS: QuizQuestion[] = [
  { id: 1, question: "「ㄘㄞˇ」虹", options: ["採", "彩", "踩"], correctIndex: 1 },
  { id: 2, question: "「ㄆㄥ」然心動", options: ["怦", "砰", "抨"], correctIndex: 0 },
  { id: 3, question: "一「ㄓㄢˇ」燈", options: ["展", "斬", "盞"], correctIndex: 2 },
  { id: 4, question: "「ㄓㄨˋ」立", options: ["佇", "注", "住"], correctIndex: 0 },
  { id: 5, question: "斑「ㄅㄛˊ」", options: ["伯", "駁", "博"], correctIndex: 1 },
];

interface GameState {
  status: GameStatus;
  score: number; // Distance
  bonusScore: number; // From coins
  bestScore: number;
  speed: number;
  carPosition: { x: number; z: number };
  
  // Track State
  chunks: TrackChunkData[];
  playerChunkIndex: number;
  
  // Quiz State
  currentQuestion: QuizQuestion;
  boostTimer: number;   // > 0 means active
  penaltyTimer: number; // > 0 means active
  feedbackMessage: string | null;
  
  // Actions
  startGame: () => void;
  resetGame: () => void;
  setSpeed: (speed: number) => void;
  setCarPosition: (x: number, z: number, chunkIndex: number, progressInChunk: number) => void;
  generateInitialTrack: () => void;
  answerQuestion: (isCorrect: boolean) => void;
  collectItem: (chunkId: number, boxId: string) => void;
  collectCoin: (chunkId: number, obsId: string) => void;
  tickTimers: () => void; // Call every frame
}

let nextChunkId = 0;

// Helper to get a random question
const getRandomQuestion = (): QuizQuestion => {
    return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
};

// Check if a set of points collides with existing track chunks
const checkCollision = (points: Vector3[], history: TrackChunkData[]): boolean => {
    // Only check against chunks that are not immediate neighbors
    // e.g. if we are generating chunk 10, we ignore 9 and 8. We check 0..7.
    // Also limit check to last 50 chunks for performance
    if (history.length < 5) return false;
    
    const endIdx = history.length - 2;
    const startIdx = Math.max(0, history.length - 50);
    const SAFE_DISTANCE = TRACK_WIDTH * 2; // 24 units

    for (let i = startIdx; i < endIdx; i++) {
        const chunk = history[i];
        for (const p1 of points) {
            // Check against control points of previous chunks
            for (const p2 of chunk.controlPoints) {
                if (p1.distanceTo(p2) < SAFE_DISTANCE) {
                    return true;
                }
            }
        }
    }
    return false;
};

const createChunk = (prevChunk: TrackChunkData | null, existingChunks: TrackChunkData[]): TrackChunkData => {
  const id = nextChunkId++;
  const isQuizChunk = id > 4 && id % 10 === 0;

  // 1. Determine Type & Geometry with Collision Avoidance
  let type = ChunkType.STRAIGHT;
  let points: Vector3[] = [];
  let currentPos = new Vector3(0,0,0);
  let currentAngle = 0;
  let startPoint = new Vector3(0,0,0);
  let startAngle = 0;

  if (prevChunk) {
      startPoint = prevChunk.endPoint.clone();
      startAngle = prevChunk.endAngle;
  }

  // Geometry Generator Helper
  const generateGeometry = (testType: ChunkType) => {
      const pts: Vector3[] = [startPoint];
      const segments = 5;
      const segmentLength = CHUNK_LENGTH / segments;
      let angle = startAngle;
      let pos = startPoint.clone();

      for (let i = 1; i <= segments; i++) {
          let angleChange = 0;
          if (testType === ChunkType.LEFT) angleChange = 0.15;
          if (testType === ChunkType.RIGHT) angleChange = -0.15;
          if (testType === ChunkType.U_TURN_LEFT) angleChange = 0.5;
          if (testType === ChunkType.U_TURN_RIGHT) angleChange = -0.5;

          angle += angleChange;
          const dx = Math.sin(angle) * segmentLength;
          const dz = Math.cos(angle) * segmentLength;
          pos = new Vector3(pos.x + dx, 0, pos.z + dz);
          pts.push(pos.clone());
      }
      return { pts, finalPos: pos, finalAngle: angle };
  };

  // Select Candidate Types
  let candidates: ChunkType[] = [];
  
  if (!prevChunk || isQuizChunk) {
      candidates = [ChunkType.STRAIGHT];
  } else {
      // Logic for random selection
      // Check U-Turn Cooldown (prevent spiraling)
      let lastUTurnId = -100;
      for (let i = existingChunks.length - 1; i >= 0; i--) {
          if (existingChunks[i].type === ChunkType.U_TURN_LEFT || existingChunks[i].type === ChunkType.U_TURN_RIGHT) {
              lastUTurnId = existingChunks[i].id;
              break;
          }
      }
      const canUTurn = (id - lastUTurnId) > 8;

      const roll = Math.random();
      let preferred: ChunkType = ChunkType.STRAIGHT;

      if (canUTurn && roll < 0.1) preferred = ChunkType.U_TURN_LEFT;
      else if (canUTurn && roll < 0.2) preferred = ChunkType.U_TURN_RIGHT;
      else if (roll < 0.5) preferred = ChunkType.LEFT;
      else if (roll < 0.8) preferred = ChunkType.RIGHT;
      else preferred = ChunkType.STRAIGHT;

      candidates.push(preferred);
      // Fallbacks if preferred collides
      if (preferred !== ChunkType.STRAIGHT) candidates.push(ChunkType.STRAIGHT);
      if (preferred !== ChunkType.LEFT && preferred !== ChunkType.RIGHT) candidates.push(ChunkType.LEFT);
  }

  // Attempt generation
  let success = false;
  for (const candidate of candidates) {
      const result = generateGeometry(candidate);
      if (!checkCollision(result.pts, existingChunks)) {
          type = candidate;
          points = result.pts;
          currentPos = result.finalPos;
          currentAngle = result.finalAngle;
          success = true;
          break;
      }
  }

  // Fail-safe: If all collided, force Straight (it usually punches through)
  if (!success) {
      const result = generateGeometry(ChunkType.STRAIGHT);
      type = ChunkType.STRAIGHT;
      points = result.pts;
      currentPos = result.finalPos;
      currentAngle = result.finalAngle;
  }

  // Temporary curve to calculate positions for items
  const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5);

  const items: ItemBoxData[] = [];
  const obstacles: ObstacleData[] = [];
  let assignedQuestion: QuizQuestion | undefined;

  // 1. Generate Quiz Items
  if (isQuizChunk) {
      assignedQuestion = getRandomQuestion();
      
      const midIndex = Math.floor(points.length / 2);
      const midPoint = points[midIndex];
      const t = 0.5;
      const tangent = curve.getTangentAt(t).normalize();
      const up = new Vector3(0, 1, 0);
      const side = new Vector3().crossVectors(up, tangent).normalize();
      const spacing = TRACK_WIDTH / 3;

      items.push({
          id: `${id}-opt-0`,
          position: midPoint.clone().sub(side.clone().multiplyScalar(spacing)),
          text: assignedQuestion.options[0],
          isCorrect: assignedQuestion.correctIndex === 0,
          isCollected: false
      });
      items.push({
          id: `${id}-opt-1`,
          position: midPoint.clone(),
          text: assignedQuestion.options[1],
          isCorrect: assignedQuestion.correctIndex === 1,
          isCollected: false
      });
      items.push({
          id: `${id}-opt-2`,
          position: midPoint.clone().add(side.clone().multiplyScalar(spacing)),
          text: assignedQuestion.options[2],
          isCorrect: assignedQuestion.correctIndex === 2,
          isCollected: false
      });
  } 
  // 2. Generate Obstacles (Coins, Crates, Ramps) if NOT a quiz chunk
  else if (id > 2) { 
      const rand = Math.random();
      
      // Helper to get orientation
      const getPosAndRot = (t: number, offset: number) => {
          const pt = curve.getPointAt(t);
          const tan = curve.getTangentAt(t).normalize();
          const up = new Vector3(0, 1, 0);
          const s = new Vector3().crossVectors(up, tan).normalize();
          const angle = Math.atan2(tan.x, tan.z);
          return {
              pos: pt.clone().add(s.multiplyScalar(offset)),
              rot: angle,
              tangent: tan
          };
      };

      // A. Ramps (15% chance)
      if (rand < 0.15) {
          const { pos, rot, tangent } = getPosAndRot(0.5, 0);
          obstacles.push({
              id: `${id}-ramp`,
              type: ObstacleType.RAMP,
              position: pos,
              rotation: rot
          });

          // Reward Coins in the air above the ramp
          for(let i=0; i<3; i++) {
              const distForward = 4 + (i * 2.5);
              const height = 3.5 + Math.sin(i * 1.5) * 1.5;
              const coinPos = pos.clone().add(tangent.clone().multiplyScalar(distForward));
              coinPos.y += height;

              obstacles.push({
                  id: `${id}-ramp-coin-${i}`,
                  type: ObstacleType.COIN,
                  position: coinPos,
                  rotation: rot,
                  isCollected: false
              });
          }
      }
      // B. Crates (20% chance)
      else if (rand < 0.35) {
          const side = Math.random() > 0.5 ? -1 : 1;
          const offset = (TRACK_WIDTH / 4) * side;
          
          for(let k=0; k<3; k++) {
              const t = 0.4 + (k * 0.05);
              const { pos, rot } = getPosAndRot(t, offset);
              obstacles.push({
                  id: `${id}-crate-${k}`,
                  type: ObstacleType.CRATE,
                  position: pos,
                  rotation: rot
              });
              if (k === 1) {
                   const { pos: pos2 } = getPosAndRot(t, offset * 0.5);
                   obstacles.push({
                       id: `${id}-crate-inner`,
                       type: ObstacleType.CRATE,
                       position: pos2,
                       rotation: rot
                   });
              }
          }
      }
      // C. Coins (Remaining chance)
      else if (rand < 0.75) {
           const pattern = Math.random();
           for(let k=0; k<5; k++) {
               const t = 0.3 + (k * 0.1);
               const offset = pattern > 0.5 ? 0 : Math.sin(k) * 3; 
               const { pos, rot } = getPosAndRot(t, offset);
               
               pos.y = 0.6; // Lift off floor

               obstacles.push({
                   id: `${id}-coin-${k}`,
                   type: ObstacleType.COIN,
                   position: pos,
                   rotation: rot,
                   isCollected: false
               });
           }
      }
  }

  return {
    id,
    type,
    startPoint,
    endPoint: currentPos,
    startAngle,
    endAngle: currentAngle,
    controlPoints: points,
    items,
    obstacles,
    assignedQuestion
  };
};

export const useGameStore = create<GameState>((set, get) => ({
  status: GameStatus.IDLE,
  score: 0,
  bonusScore: 0,
  bestScore: 0,
  speed: 0,
  carPosition: { x: 0, z: 0 },
  chunks: [],
  playerChunkIndex: 0,
  
  currentQuestion: QUESTIONS[0],
  boostTimer: 0,
  penaltyTimer: 0,
  feedbackMessage: null,

  generateInitialTrack: () => {
    nextChunkId = 0;
    const chunks: TrackChunkData[] = [];
    let prev: TrackChunkData | null = null;
    
    // First chunk (Straight Start)
    // We pass empty array for history since it's the first
    const first = createChunk(null, []);
    // Override first chunk to be perfectly straight and clean
    first.type = ChunkType.STRAIGHT; 
    first.endPoint = new Vector3(0, 0, CHUNK_LENGTH);
    first.endAngle = 0;
    first.controlPoints = [new Vector3(0,0,0), new Vector3(0,0, CHUNK_LENGTH)];
    first.items = []; 
    first.obstacles = [];
    chunks.push(first);
    prev = first;

    for (let i = 0; i < CHUNKS_TO_RENDER; i++) {
      const next = createChunk(prev, chunks);
      chunks.push(next);
      prev = next;
    }

    set({ chunks, playerChunkIndex: 0, boostTimer: 0, penaltyTimer: 0, bonusScore: 0 });
  },

  startGame: () => {
    const { chunks } = get();
    if (chunks.length === 0) get().generateInitialTrack();
    
    set({ 
      status: GameStatus.RACING, 
      score: 0,
      bonusScore: 0,
      speed: 0,
      boostTimer: 0,
      penaltyTimer: 0,
      feedbackMessage: null,
    });
  },

  resetGame: () => {
    get().generateInitialTrack();
    set({ 
      status: GameStatus.IDLE, 
      score: 0,
      bonusScore: 0,
      speed: 0,
      carPosition: { x: 0, z: 0 },
      playerChunkIndex: 0,
      boostTimer: 0,
      penaltyTimer: 0,
      feedbackMessage: null
    });
  },

  setSpeed: (speed) => set({ speed }),
  
  tickTimers: () => {
      set(state => ({
          boostTimer: Math.max(0, state.boostTimer - 1),
          penaltyTimer: Math.max(0, state.penaltyTimer - 1)
      }));
  },

  answerQuestion: (isCorrect) => {
      if (isCorrect) {
          set({ 
              boostTimer: EFFECT_DURATION, 
              penaltyTimer: 0,
              feedbackMessage: "CORRECT! NITRO BOOST!",
          });
      } else {
          set({ 
              boostTimer: 0, 
              penaltyTimer: EFFECT_DURATION,
              feedbackMessage: "WRONG! SPEED DOWN!",
          });
      }
      setTimeout(() => set({ feedbackMessage: null }), 2000);
  },

  collectItem: (chunkId, boxId) => {
      set(state => {
          const newChunks = state.chunks.map(c => {
              if (c.id !== chunkId) return c;
              return {
                  ...c,
                  items: c.items.map(i => i.id === boxId ? { ...i, isCollected: true } : i)
              };
          });
          return { chunks: newChunks };
      });
  },

  collectCoin: (chunkId, obsId) => {
      set(state => {
          const chunk = state.chunks.find(c => c.id === chunkId);
          if (!chunk) return {};
          
          const obs = chunk.obstacles.find(o => o.id === obsId);
          if (!obs || obs.isCollected) return {};

          const newChunks = state.chunks.map(c => {
              if (c.id !== chunkId) return c;
              return {
                  ...c,
                  obstacles: c.obstacles.map(o => o.id === obsId ? { ...o, isCollected: true } : o)
              };
          });
          
          return { 
              chunks: newChunks,
              bonusScore: state.bonusScore + 50
          };
      });
  },
  
  setCarPosition: (x, z, chunkIndex, progressInChunk) => {
    const { chunks, playerChunkIndex, bestScore, bonusScore } = get();
    
    // Distance score + Bonus Score
    const distScore = Math.floor((chunkIndex * CHUNK_LENGTH) + (progressInChunk * CHUNK_LENGTH));
    const totalScore = distScore + bonusScore;
    
    let newChunks = chunks;
    let newPlayerChunkIndex = playerChunkIndex;

    // Extend track if player is advancing
    if (chunkIndex > playerChunkIndex) {
        newPlayerChunkIndex = chunkIndex;
        const lastChunk = chunks[chunks.length - 1];
        // Pass current chunks to allow collision checking
        const next = createChunk(lastChunk, chunks);
        newChunks = [...chunks, next];
    }

    let nextQuizChunk = newChunks.find(c => c.id >= chunkIndex && c.assignedQuestion && c.items.some(i => !i.isCollected));
    if (nextQuizChunk && nextQuizChunk.id === chunkIndex && progressInChunk > 0.6) {
         nextQuizChunk = newChunks.find(c => c.id > chunkIndex && c.assignedQuestion);
    }
    
    const nextQuestion = nextQuizChunk?.assignedQuestion || get().currentQuestion;

    set({ 
      carPosition: { x, z },
      chunks: newChunks,
      playerChunkIndex: newPlayerChunkIndex,
      score: totalScore,
      bestScore: Math.max(bestScore, totalScore),
      currentQuestion: nextQuestion
    });
  },
}));