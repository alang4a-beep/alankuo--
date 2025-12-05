
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls } from '../hooks/useControls';
import { 
  ACCELERATION, 
  BRAKING, 
  FRICTION, 
  MAX_SPEED, 
  TURN_SPEED, 
  TRACK_WIDTH, 
  OFF_ROAD_FRICTION,
  GameStatus,
  TrackChunkData,
  BOOST_MULTIPLIER,
  PENALTY_MULTIPLIER,
  ObstacleType,
  GRAVITY,
  JUMP_FORCE
} from '../types';
import { useGameStore } from '../store';

const CarModel = () => {
  return (
    <group>
      {/* Chassis */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 0.5, 2]} />
        <meshStandardMaterial color="#0066cc" metalness={0.6} roughness={0.2} />
      </mesh>
      
      {/* Spoiler */}
      <mesh position={[0, 0.9, -0.8]} castShadow>
        <boxGeometry args={[1.2, 0.1, 0.4]} />
        <meshStandardMaterial color="#004499" />
      </mesh>

      {/* Cockpit */}
      <mesh position={[0, 0.7, 0.2]}>
        <boxGeometry args={[0.7, 0.4, 0.8]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Wheels */}
      <mesh position={[0.6, 0.3, 0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.6, 0.3, 0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.6, 0.3, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.6, 0.3, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      
      {/* Headlights */}
      <mesh position={[0.3, 0.5, 1]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.15]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-0.3, 0.5, 1]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.15]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
      </mesh>
    </group>
  );
};

export const Car: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const controls = useControls();
  const { camera } = useThree();
  
  const gameStatus = useGameStore((state) => state.status);
  const setGameSpeed = useGameStore((state) => state.setSpeed);
  const setCarPosition = useGameStore((state) => state.setCarPosition);
  const generateInitialTrack = useGameStore((state) => state.generateInitialTrack);
  const chunks = useGameStore((state) => state.chunks);
  const playerChunkIndex = useGameStore((state) => state.playerChunkIndex);
  
  const tickTimers = useGameStore((state) => state.tickTimers);
  const boostTimer = useGameStore((state) => state.boostTimer);
  const penaltyTimer = useGameStore((state) => state.penaltyTimer);
  const collectItem = useGameStore((state) => state.collectItem);
  const collectCoin = useGameStore((state) => state.collectCoin);
  const answerQuestion = useGameStore((state) => state.answerQuestion);

  // Initialize track
  useEffect(() => {
    generateInitialTrack();
  }, []);

  // Physics state
  const speed = useRef(0);
  const rotation = useRef(0);
  const velocityY = useRef(0); // Vertical speed
  const position = useRef(new THREE.Vector3(0, 0, 0));
  
  const lookAtOffset = new THREE.Vector3(0, 1, 5);

  useFrame((state, delta) => {
    if (!group.current) return;

    tickTimers();

    let currentMaxSpeed = MAX_SPEED;
    if (boostTimer > 0) currentMaxSpeed *= BOOST_MULTIPLIER;
    if (penaltyTimer > 0) currentMaxSpeed *= PENALTY_MULTIPLIER;

    // 1. Controls & Horizontal Physics
    if (gameStatus === GameStatus.RACING) {
        if (controls.forward) {
            speed.current = Math.min(speed.current + ACCELERATION, currentMaxSpeed);
        } else if (controls.backward) {
            speed.current = Math.max(speed.current - BRAKING, -currentMaxSpeed / 2);
        } else {
            if (speed.current > 0) speed.current = Math.max(0, speed.current - FRICTION);
            if (speed.current < 0) speed.current = Math.min(0, speed.current + FRICTION);
        }

        if (speed.current > currentMaxSpeed) {
            speed.current = Math.max(currentMaxSpeed, speed.current - FRICTION * 2);
        }

        // Only turn if car is moving and on ground (mostly)
        if (Math.abs(speed.current) > 0.01 && position.current.y < 2) {
            const dir = speed.current > 0 ? 1 : -1;
            
            // Drift Logic: Sharper turn when drifting
            const driftMultiplier = controls.drift ? 2.5 : 1.0;
            const currentTurnSpeed = TURN_SPEED * driftMultiplier;

            if (controls.left) rotation.current += currentTurnSpeed * dir;
            if (controls.right) rotation.current -= currentTurnSpeed * dir;
        }
    } else {
        if (gameStatus === GameStatus.FINISHED) {
             speed.current = Math.max(0, speed.current - FRICTION * 2);
        } else if (gameStatus === GameStatus.IDLE) {
            if (position.current.x !== 0 || position.current.z !== 0) {
                position.current.set(0,0,0);
                rotation.current = 0;
                speed.current = 0;
                velocityY.current = 0;
            }
        }
    }

    // 2. Vertical Physics (Gravity & Jumping)
    position.current.y += velocityY.current;
    
    // Apply gravity if in air
    if (position.current.y > 0) {
        velocityY.current -= GRAVITY;
    } 
    
    // Floor collision
    if (position.current.y < 0) {
        position.current.y = 0;
        velocityY.current = 0;
    }

    // 3. Collision Detection
    const currentPos = position.current.clone();
    const relevantChunks = chunks.filter(c => Math.abs(c.id - playerChunkIndex) <= 1);
    
    let minDistance = Infinity;
    let closestPoint = new THREE.Vector3();
    let activeChunkId = playerChunkIndex;
    let progressInChunk = 0; 

    for (const chunk of relevantChunks) {
        // Road Logic
        const curve = new THREE.CatmullRomCurve3(chunk.controlPoints, false);
        const divisions = 20;
        for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const p = curve.getPointAt(t);
            // We ignore Y for track center distance in this simple model
            const flatP = new THREE.Vector3(p.x, 0, p.z);
            const flatCar = new THREE.Vector3(currentPos.x, 0, currentPos.z);
            const d = flatP.distanceTo(flatCar);
            
            if (d < minDistance) {
                minDistance = d;
                closestPoint = flatP;
                if (d < TRACK_WIDTH / 2 + 10) { // Broad phase
                    activeChunkId = chunk.id;
                    progressInChunk = t;
                }
            }
        }

        // Quiz Items
        chunk.items.forEach(item => {
            if (!item.isCollected) {
                const dist = currentPos.distanceTo(item.position);
                if (dist < 2.5) { 
                    collectItem(chunk.id, item.id);
                    answerQuestion(item.isCorrect);
                }
            }
        });

        // Obstacles (Coins, Crates, Ramps)
        chunk.obstacles.forEach(obs => {
            const dist = currentPos.distanceTo(obs.position);
            
            if (obs.type === ObstacleType.COIN && !obs.isCollected) {
                if (dist < 2.0) {
                    collectCoin(chunk.id, obs.id);
                }
            }
            
            else if (obs.type === ObstacleType.CRATE) {
                // Hard collision box for crate
                // Reduced collision distance to 1.2 for smaller crates (was 2.5)
                if (dist < 1.2) {
                    // Simple impulse bounce
                    speed.current = -speed.current * 0.5;
                    // Move car back slightly to prevent sticking
                    const bounceDir = currentPos.clone().sub(obs.position).normalize();
                    position.current.add(bounceDir.multiplyScalar(0.5));
                }
            }
            
            else if (obs.type === ObstacleType.RAMP) {
                // Trigger Jump if entering from roughly the front
                if (dist < 3.0 && position.current.y < 1.0) {
                    // Only jump if moving fast enough
                    if (Math.abs(speed.current) > 0.1) {
                         velocityY.current = JUMP_FORCE;
                         // Slight forward boost on jump
                         speed.current = Math.min(speed.current * 1.2, currentMaxSpeed * 1.5);
                    }
                }
            }
        });
    }

    // 4. Wall Collision (Bounds check)
    // Track Width is total width. Half width is center to wall.
    // Car width is approx 1. So allowed distance is HalfWidth - 1.
    const allowedDist = (TRACK_WIDTH / 2) - 1.0; 
    
    if (minDistance > allowedDist && position.current.y < 2) {
        // We hit the wall
        
        // 1. Calculate direction from closest track point to car
        const pushDir = currentPos.clone().sub(closestPoint).normalize();
        
        // 2. Clamp position to edge
        const clampedPos = closestPoint.clone().add(pushDir.multiplyScalar(allowedDist));
        position.current.x = clampedPos.x;
        position.current.z = clampedPos.z;

        // 3. Friction penalty for scraping wall
        speed.current *= 0.95; 
    }

    // 5. Move Car
    const velocity = new THREE.Vector3(0, 0, 1)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.current)
      .multiplyScalar(speed.current);
    
    position.current.x += velocity.x;
    position.current.z += velocity.z;
    
    setGameSpeed(speed.current);
    setCarPosition(position.current.x, position.current.z, activeChunkId, progressInChunk);

    // 6. Update Ref
    group.current.position.copy(position.current);
    group.current.rotation.y = rotation.current;
    
    // Pitch up when jumping
    const pitch = velocityY.current * 0.5; 
    group.current.rotation.x = pitch;

    // Enhanced lean on drift
    const driftLean = controls.drift ? 1.5 : 0.8;
    const leanAngle = (controls.left ? 1 : controls.right ? -1 : 0) * (speed.current * driftLean); 
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, -leanAngle, 0.1);

    // 7. Camera
    const isBoosting = boostTimer > 0;
    const boostCamDist = isBoosting ? -12 : -8;
    
    const carRotation = new THREE.Euler(0, rotation.current, 0);
    // Camera follows Y movement but dampened
    const camY = Math.max(4, 4 + position.current.y * 0.8); 
    
    const offset = new THREE.Vector3(0, camY, boostCamDist);
    const idealCamPos = position.current.clone().add(offset.clone().applyEuler(carRotation));
    const idealLookAt = position.current.clone().add(lookAtOffset.clone().applyEuler(carRotation));
    // Look at slightly higher point when jumping
    idealLookAt.y += position.current.y * 0.5;

    camera.position.lerp(idealCamPos, 0.1);
    camera.lookAt(idealLookAt);
  });

  return (
    <group ref={group}>
        <CarModel />
        {/* Visual drift smoke or spark could go here, for now simple indicators */}
        {boostTimer > 0 && (
             <group position={[0, 0.5, -2]}>
                 <mesh position={[0.4, 0, 0]}>
                    <coneGeometry args={[0.2, 1, 8]} />
                    <meshBasicMaterial color="orange" transparent opacity={0.8} />
                 </mesh>
                 <mesh position={[-0.4, 0, 0]}>
                    <coneGeometry args={[0.2, 1, 8]} />
                    <meshBasicMaterial color="orange" transparent opacity={0.8} />
                 </mesh>
             </group>
        )}
        {penaltyTimer > 0 && (
             <mesh position={[0, 1, -1]}>
                 <sphereGeometry args={[0.5]} />
                 <meshBasicMaterial color="gray" transparent opacity={0.5} />
             </mesh>
        )}
    </group>
  );
};
