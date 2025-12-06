
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
  ObstacleType,
  Competitor
} from './types';
import { soundManager } from './audio';

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
  
  // Competitors
  competitors: Competitor[];

  // Actions
  startGame: () => void;
  resetGame: () => void;
  setSpeed: (speed: number) => void;
  setCarPosition: (x: number, z: number, chunkIndex: number, progressInChunk: number) => void;
  generateInitialTrack: () => void;
  answerQuestion: (isCorrect: boolean) => void;
  collectItem: (chunkId: number, boxId: string) => void;
  collectCoin: (chunkId: number, obsId: string) => void;
  destroyObstacle: (chunkId: number, obsId: string) => void;
  tickTimers: () => void; // Call every frame
  updateCompetitors: (dt: number) => void;
}

let nextChunkId = 0;

// Helper to get a random question
const getRandomQuestion = (): QuizQuestion => {
    return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
};

// Check if a set of points collides with existing track chunks
const checkCollision = (points: Vector3[], history: TrackChunkData[]): boolean => {
    if (history.length < 5) return false;
    
    const endIdx = history.length - 2;
    const startIdx = Math.max(0, history.length - 50);
    const SAFE_DISTANCE = TRACK_WIDTH * 2; 

    for (let i = startIdx; i < endIdx; i++) {
        const chunk = history[i];
        for (const p1 of points) {
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
  const isPreQuizChunk = (id + 1) > 4 && (id + 1) % 10 === 0;

  // 1. Determine Type & Geometry
  let type = ChunkType.STRAIGHT;
  let points: Vector3[] = [];
  let currentPos = new Vector3(0,0,0);
  let currentAngle = 0;
  let startPoint = new Vector3(0,0,0);
  let startAngle = 0;
  let angleDeltaPerSeg = 0;
  const segments = 5;
  const segmentLength = CHUNK_LENGTH / segments;

  if (prevChunk) {
      startPoint = prevChunk.endPoint.clone();
      startAngle = prevChunk.endAngle;
  }

  const generateGeometry = (testType: ChunkType) => {
      const pts: Vector3[] = [startPoint];
      let angle = startAngle;
      let pos = startPoint.clone();
      let dAngle = 0;

      if (testType === ChunkType.LEFT) dAngle = 0.15;
      if (testType === ChunkType.RIGHT) dAngle = -0.15;
      if (testType === ChunkType.U_TURN_LEFT) dAngle = 0.5;
      if (testType === ChunkType.U_TURN_RIGHT) dAngle = -0.5;

      for (let i = 1; i <= segments; i++) {
          angle += dAngle;
          const dx = Math.sin(angle) * segmentLength;
          const dz = Math.cos(angle) * segmentLength;
          pos = new Vector3(pos.x + dx, 0, pos.z + dz);
          pts.push(pos.clone());
      }
      return { pts, finalPos: pos, finalAngle: angle, dAngle };
  };

  let candidates: ChunkType[] = [];
  
  if (!prevChunk || isQuizChunk || isPreQuizChunk) {
      candidates = [ChunkType.STRAIGHT];
  } else {
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
      if (preferred !== ChunkType.STRAIGHT) candidates.push(ChunkType.STRAIGHT);
      if (preferred !== ChunkType.LEFT && preferred !== ChunkType.RIGHT) candidates.push(ChunkType.LEFT);
  }

  let success = false;
  for (const candidate of candidates) {
      const result = generateGeometry(candidate);
      if (!checkCollision(result.pts, existingChunks)) {
          type = candidate;
          points = result.pts;
          currentPos = result.finalPos;
          currentAngle = result.finalAngle;
          angleDeltaPerSeg = result.dAngle;
          success = true;
          break;
      }
  }

  if (!success) {
      const result = generateGeometry(ChunkType.STRAIGHT);
      type = ChunkType.STRAIGHT;
      points = result.pts;
      currentPos = result.finalPos;
      currentAngle = result.finalAngle;
      angleDeltaPerSeg = 0;
  }

  // --- Ghost Point Calculation ---
  let ghostStart: Vector3;
  if (prevChunk && prevChunk.controlPoints.length >= 2) {
      ghostStart = prevChunk.controlPoints[prevChunk.controlPoints.length - 2].clone();
  } else {
      const dx = Math.sin(startAngle) * segmentLength;
      const dz = Math.cos(startAngle) * segmentLength;
      ghostStart = startPoint.clone().sub(new Vector3(dx, 0, dz));
  }

  const ghostEndAngle = currentAngle + angleDeltaPerSeg;
  const gdx = Math.sin(ghostEndAngle) * segmentLength;
  const gdz = Math.cos(ghostEndAngle) * segmentLength;
  const ghostEnd = currentPos.clone().add(new Vector3(gdx, 0, gdz));

  const renderPoints = [ghostStart, ...points, ghostEnd];
  
  // --------------------------------------------------

  const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5);

  const items: ItemBoxData[] = [];
  const obstacles: ObstacleData[] = [];
  let assignedQuestion: QuizQuestion | undefined;

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
  else if (id > 2) { 
      const rand = Math.random();
      
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

      // Ensure ramps only appear on straight sections
      if (rand < 0.15 && type === ChunkType.STRAIGHT) {
          const { pos, rot, tangent } = getPosAndRot(0.5, 0);
          obstacles.push({
              id: `${id}-ramp`,
              type: ObstacleType.RAMP,
              position: pos,
              rotation: rot
          });

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
      else if (rand < 0.75) {
           const pattern = Math.random();
           for(let k=0; k<5; k++) {
               const t = 0.3 + (k * 0.1);
               const offset = pattern > 0.5 ? 0 : Math.sin(k) * 3; 
               const { pos, rot } = getPosAndRot(t, offset);
               pos.y = 0.6;
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
    renderPoints,
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

  competitors: [],

  generateInitialTrack: () => {
    nextChunkId = 0;
    const chunks: TrackChunkData[] = [];
    let prev: TrackChunkData | null = null;
    
    // First chunk
    const first = createChunk(null, []);
    first.type = ChunkType.STRAIGHT; 
    first.endPoint = new Vector3(0, 0, CHUNK_LENGTH);
    first.endAngle = 0;
    first.controlPoints = [new Vector3(0,0,0), new Vector3(0,0, CHUNK_LENGTH)];
    
    const startP = new Vector3(0,0,0);
    const endP = new Vector3(0,0, CHUNK_LENGTH);
    first.renderPoints = [
        new Vector3(0,0,-CHUNK_LENGTH),
        startP,
        endP,
        new Vector3(0,0, CHUNK_LENGTH*2)
    ];

    first.items = []; 
    first.obstacles = [];
    chunks.push(first);
    prev = first;

    for (let i = 0; i < CHUNKS_TO_RENDER; i++) {
      const next = createChunk(prev, chunks);
      
      if (prev && prev.renderPoints && next.controlPoints.length > 1) {
          prev.renderPoints[prev.renderPoints.length - 1] = next.controlPoints[1].clone();
      }

      chunks.push(next);
      prev = next;
    }

    set({ chunks, playerChunkIndex: 0, boostTimer: 0, penaltyTimer: 0, bonusScore: 0, competitors: [] });
  },

  startGame: () => {
    const { chunks } = get();
    if (chunks.length === 0) get().generateInitialTrack();
    
    soundManager.resume();
    soundManager.startMusic();
    soundManager.startEngine();
    soundManager.playSfx('boost');

    // Spawn 3 initial competitors with speeds between 70km/h (0.35) and 110km/h (0.55)
    const newCompetitors: Competitor[] = [
        { id: 'bot-1', chunkId: 0, progress: 0.8, laneOffset: -5, speed: 0.35, color: '#ff0000', modelOffset: 0 }, // 70 km/h
        { id: 'bot-2', chunkId: 0, progress: 0.6, laneOffset: 5, speed: 0.45, color: '#00ff00', modelOffset: 1 },  // 90 km/h
        { id: 'bot-3', chunkId: 1, progress: 0.2, laneOffset: 0, speed: 0.50, color: '#ffff00', modelOffset: 2 }   // 100 km/h
    ];

    set({ 
      status: GameStatus.RACING, 
      score: 0,
      bonusScore: 0,
      speed: 0,
      boostTimer: 0,
      penaltyTimer: 0,
      feedbackMessage: null,
      competitors: newCompetitors
    });
  },

  resetGame: () => {
    get().generateInitialTrack();
    soundManager.stopEngine();
    soundManager.startMusic();
    
    set({ 
      status: GameStatus.IDLE, 
      score: 0,
      bonusScore: 0,
      speed: 0,
      carPosition: { x: 0, z: 0 },
      playerChunkIndex: 0,
      boostTimer: 0,
      penaltyTimer: 0,
      feedbackMessage: null,
      competitors: []
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
          soundManager.playSfx('correct');
          soundManager.playSfx('boost');
          set({ 
              boostTimer: EFFECT_DURATION, 
              penaltyTimer: 0,
              feedbackMessage: "CORRECT! NITRO BOOST!",
          });
      } else {
          soundManager.playSfx('wrong');
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

          soundManager.playSfx('coin');

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
  
  destroyObstacle: (chunkId, obsId) => {
      set(state => {
          const newChunks = state.chunks.map(c => {
              if (c.id !== chunkId) return c;
              return {
                  ...c,
                  obstacles: c.obstacles.map(o => o.id === obsId ? { ...o, isCollected: true } : o)
              };
          });
          return { chunks: newChunks };
      });
  },
  
  updateCompetitors: (dt: number) => {
      set(state => {
          if (state.status !== GameStatus.RACING) return {};
          
          let newCompetitors = [...state.competitors];
          
          // Remove competitors too far behind
          newCompetitors = newCompetitors.filter(c => c.chunkId >= state.playerChunkIndex - 1);

          // Spawn new ones if needed (maintain at least 3 ahead)
          const aheadCount = newCompetitors.filter(c => c.chunkId > state.playerChunkIndex).length;
          if (aheadCount < 3) {
              const id = Math.random().toString(36).substr(2, 5);
              const chunkId = state.playerChunkIndex + 4; // Spawn 4 chunks ahead
              newCompetitors.push({
                  id: `bot-${id}`,
                  chunkId: chunkId,
                  progress: 0,
                  laneOffset: (Math.random() * TRACK_WIDTH) - (TRACK_WIDTH/2),
                  // Random speed 0.35 (70kmh) to 0.55 (110kmh)
                  speed: 0.35 + (Math.random() * 0.20), 
                  color: '#' + Math.floor(Math.random()*16777215).toString(16),
                  modelOffset: Math.floor(Math.random() * 3)
              });
          }

          // Move them
          newCompetitors = newCompetitors.map(c => {
              let nextProgress = c.progress + (c.speed * dt * 30 / CHUNK_LENGTH); // Approximate frame diff
              let nextChunkId = c.chunkId;
              
              if (nextProgress >= 1) {
                  nextProgress -= 1;
                  nextChunkId += 1;
              }
              
              return { ...c, progress: nextProgress, chunkId: nextChunkId };
          });
          
          return { competitors: newCompetitors };
      });
  },

  setCarPosition: (x, z, chunkIndex, progressInChunk) => {
    const { chunks, playerChunkIndex, bestScore, bonusScore } = get();
    const distScore = Math.floor((chunkIndex * CHUNK_LENGTH) + (progressInChunk * CHUNK_LENGTH));
    const totalScore = distScore + bonusScore;
    
    let newChunks = chunks;
    let newPlayerChunkIndex = playerChunkIndex;

    if (chunkIndex > playerChunkIndex) {
        newPlayerChunkIndex = chunkIndex;
        const lastChunk = chunks[chunks.length - 1];
        const next = createChunk(lastChunk, chunks);

        const updatedLastChunk = { ...lastChunk, renderPoints: [...(lastChunk.renderPoints || [])] };
        
        if (updatedLastChunk.renderPoints.length > 0 && next.controlPoints.length > 1) {
             updatedLastChunk.renderPoints[updatedLastChunk.renderPoints.length - 1] = next.controlPoints[1].clone();
        }

        newChunks = [...chunks.slice(0, -1), updatedLastChunk, next];
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
