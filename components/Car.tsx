
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
import { soundManager } from '../audio';

const CarModel = () => {
  const primaryColor = "#0055ff"; // Racing Blue
  const secondaryColor = "#ffffff"; // White stripes
  const tireColor = "#1a1a1a";
  const rimColor = "#333333";

  return (
    <group position={[0, -0.2, 0]}> 
      {/* --- Main Body Chassis --- */}
      {/* Central Body */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.4, 2.2]} />
        <meshStandardMaterial color={primaryColor} roughness={0.3} metalness={0.7} />
      </mesh>
      
      {/* Front Nose Cone (Tapered look using scale or just a smaller box) */}
      <mesh position={[0, 0.45, 1.4]} castShadow>
        <boxGeometry args={[0.4, 0.2, 0.8]} />
        <meshStandardMaterial color={primaryColor} />
      </mesh>

      {/* Front Wing */}
      <mesh position={[0, 0.25, 1.7]} castShadow>
        <boxGeometry args={[1.6, 0.1, 0.4]} />
        <meshStandardMaterial color={secondaryColor} />
      </mesh>
      {/* Front Wing Flaps */}
      <mesh position={[0.7, 0.35, 1.65]} rotation={[0.2, 0, 0]}>
         <boxGeometry args={[0.2, 0.2, 0.3]} />
         <meshStandardMaterial color={primaryColor} />
      </mesh>
      <mesh position={[-0.7, 0.35, 1.65]} rotation={[0.2, 0, 0]}>
         <boxGeometry args={[0.2, 0.2, 0.3]} />
         <meshStandardMaterial color={primaryColor} />
      </mesh>

      {/* --- Side Pods (Air Intakes) --- */}
      <group position={[0, 0, 0.2]}>
        {/* Left Pod */}
        <mesh position={[0.55, 0.5, 0]} castShadow>
             <boxGeometry args={[0.5, 0.35, 1.2]} />
             <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0.55, 0.5, 0.61]} rotation={[Math.PI/2, 0, 0]}>
             <planeGeometry args={[0.4, 0.3]} />
             <meshStandardMaterial color="#111" /> {/* Intake hole */}
        </mesh>
        
        {/* Right Pod */}
        <mesh position={[-0.55, 0.5, 0]} castShadow>
             <boxGeometry args={[0.5, 0.35, 1.2]} />
             <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[-0.55, 0.5, 0.61]} rotation={[Math.PI/2, 0, 0]}>
             <planeGeometry args={[0.4, 0.3]} />
             <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      {/* --- Rear Wing / Spoiler --- */}
      <group position={[0, 0.9, -1.0]}>
        {/* Side Plates */}
        <mesh position={[0.7, 0, 0]}>
             <boxGeometry args={[0.05, 0.6, 0.6]} />
             <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[-0.7, 0, 0]}>
             <boxGeometry args={[0.05, 0.6, 0.6]} />
             <meshStandardMaterial color={primaryColor} />
        </mesh>
        {/* Main Wing Blades */}
        <mesh position={[0, 0.2, 0.1]} rotation={[-0.1, 0, 0]}>
             <boxGeometry args={[1.4, 0.05, 0.3]} />
             <meshStandardMaterial color={secondaryColor} />
        </mesh>
        <mesh position={[0, -0.1, 0]} rotation={[-0.1, 0, 0]}>
             <boxGeometry args={[1.4, 0.05, 0.3]} />
             <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      {/* --- Engine Area --- */}
      <mesh position={[0, 0.6, -0.8]} castShadow>
          <boxGeometry args={[0.55, 0.45, 0.6]} />
          <meshStandardMaterial color="#222" />
      </mesh>
      {/* Exhaust Pipes */}
      <mesh position={[0.15, 0.5, -1.15]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2]} />
          <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[-0.15, 0.5, -1.15]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2]} />
          <meshStandardMaterial color="#555" />
      </mesh>

      {/* --- Cockpit & Driver --- */}
      <mesh position={[0, 0.75, -0.1]}>
         <boxGeometry args={[0.5, 0.3, 0.8]} />
         <meshStandardMaterial color="#111" />
      </mesh>
      {/* Steering Wheel */}
      <mesh position={[0, 0.9, 0.1]} rotation={[0.5, 0, 0]}>
         <boxGeometry args={[0.3, 0.2, 0.05]} />
         <meshStandardMaterial color="#333" />
      </mesh>
      {/* Driver Helmet */}
      <group position={[0, 1.0, -0.2]}>
          <mesh>
             <sphereGeometry args={[0.22, 16, 16]} />
             <meshStandardMaterial color="white" roughness={0.2} />
          </mesh>
          {/* Visor */}
          <mesh position={[0, 0.02, 0.18]}>
             <sphereGeometry args={[0.12, 16, 16]} />
             <meshStandardMaterial color="black" roughness={0} />
          </mesh>
      </group>

      {/* --- Wheels --- */}
      {/* Front Wheels (Thinner) */}
      <mesh position={[0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.35, 24]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      <mesh position={[0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]}> {/* Rim */}
        <cylinderGeometry args={[0.2, 0.2, 0.36, 12]} />
        <meshStandardMaterial color={rimColor} />
      </mesh>

      <mesh position={[-0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.35, 24]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      <mesh position={[-0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]}> {/* Rim */}
        <cylinderGeometry args={[0.2, 0.2, 0.36, 12]} />
        <meshStandardMaterial color={rimColor} />
      </mesh>

      {/* Rear Wheels (Fat & Bigger) */}
      <mesh position={[0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 24]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      <mesh position={[0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]}> {/* Rim */}
        <cylinderGeometry args={[0.25, 0.25, 0.51, 12]} />
        <meshStandardMaterial color={rimColor} />
      </mesh>

      <mesh position={[-0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 24]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      <mesh position={[-0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]}> {/* Rim */}
        <cylinderGeometry args={[0.25, 0.25, 0.51, 12]} />
        <meshStandardMaterial color={rimColor} />
      </mesh>

      {/* --- Lights --- */}
      {/* Front Headlights */}
      <mesh position={[0.2, 0.45, 1.8]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.08]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} />
      </mesh>
      <mesh position={[-0.2, 0.45, 1.8]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.08]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} />
      </mesh>
      
      {/* Rear Brake Light (Center) */}
      <mesh position={[0, 0.4, -1.2]}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
      </mesh>

    </group>
  );
};

export const Car: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const controls = useControls();
  const { camera, size } = useThree();
  
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
  const destroyObstacle = useGameStore((state) => state.destroyObstacle);
  
  const competitors = useGameStore((state) => state.competitors);

  const lastScrapeTime = useRef(0);
  const lastDriftTime = useRef(0);
  const lastCompHitTime = useRef(0);

  // Initialize track
  useEffect(() => {
    generateInitialTrack();
  }, []);

  // Physics state
  const speed = useRef(0);
  const rotation = useRef(0); // Facing direction (Model)
  const courseRotation = useRef(0); // Movement direction (Inertia/Velocity)
  const velocityY = useRef(0); // Vertical speed
  const position = useRef(new THREE.Vector3(0, 0, 0));
  
  // Drift State
  const driftDuration = useRef(0); // How long shift is held

  // Progressive Steering State
  const steerDuration = useRef(0);
  const lastSteerDir = useRef(0); // -1: Right, 1: Left

  // Responsive Camera settings
  const isMobile = size.width < 768;
  const baseLookAhead = isMobile ? 8 : 5;
  const baseCamDist = isMobile ? -6.5 : -8; // Closer on mobile (was -11)
  const baseCamHeight = isMobile ? 3.2 : 4; // Lower on mobile (was 5.5)
  const baseFov = isMobile ? 55 : 50; // Standard FOV on mobile (was 60)
  
  const lookAtOffset = new THREE.Vector3(0, 1, baseLookAhead);

  useFrame((state, delta) => {
    if (!group.current) return;

    // --- PHYSICS LOOP ---
    // Only run physics if actually racing
    if (gameStatus === GameStatus.RACING) {
        
        tickTimers();

        let currentMaxSpeed = MAX_SPEED;
        if (boostTimer > 0) currentMaxSpeed *= BOOST_MULTIPLIER;
        if (penaltyTimer > 0) currentMaxSpeed *= PENALTY_MULTIPLIER;

        // Update Engine Sound Pitch
        soundManager.updateEnginePitch(speed.current / MAX_SPEED);

        // 1. Controls & Horizontal Physics
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

        // Turning Physics (Rotation of the Car Model)
        if (Math.abs(speed.current) > 0.01 && position.current.y < 2) {
            const dir = speed.current > 0 ? 1 : -1;
            
            const isDrifting = controls.drift && Math.abs(speed.current) > 0.15;
            
            // Progressive Drift Logic
            const MAX_DRIFT_TIME = 1.2; 
            if (isDrifting) {
                driftDuration.current = Math.min(driftDuration.current + delta, MAX_DRIFT_TIME);
            } else {
                driftDuration.current = 0;
            }

            // Drift Multiplier: 1.1x -> 4.0x
            const driftProgress = driftDuration.current / MAX_DRIFT_TIME;
            const driftBonus = driftProgress * 2.9; 
            const driftMultiplier = isDrifting ? (1.1 + driftBonus) : 1.0;

            // Progressive Steering Logic (Simulate Steering Wheel)
            const turnInput = controls.left ? 1 : (controls.right ? -1 : 0);
            if (turnInput !== 0) {
                if (turnInput !== lastSteerDir.current) {
                    steerDuration.current = 0; // Reset if direction changed
                    lastSteerDir.current = turnInput;
                }
                // Ramp up over 0.6 seconds
                steerDuration.current = Math.min(steerDuration.current + delta, 0.6);
            } else {
                // Return to center quickly
                steerDuration.current = Math.max(steerDuration.current - delta * 5, 0);
                if (steerDuration.current === 0) lastSteerDir.current = 0;
            }

            // Steer Multiplier: 0.6x (Tap/Fine Control) -> 1.5x (Full Lock)
            const steerProgress = steerDuration.current / 0.6;
            const steerMultiplier = 0.6 + (steerProgress * 0.9);

            const currentTurnSpeed = TURN_SPEED * steerMultiplier * driftMultiplier;

            if (controls.left) rotation.current += currentTurnSpeed * dir;
            if (controls.right) rotation.current -= currentTurnSpeed * dir;

            // Course Correction (Inertia/Grip Logic)
            const grip = isDrifting ? 0.06 + (driftDuration.current * 0.02) : 0.15;
            
            // Lerp courseRotation towards rotation
            const angleDiff = rotation.current - courseRotation.current;
            courseRotation.current += angleDiff * grip;

            // Drift Sound (Throttled)
            if (isDrifting) {
                 const now = state.clock.elapsedTime;
                 if (now - lastDriftTime.current > 0.2) {
                     soundManager.playSfx('drift');
                     lastDriftTime.current = now;
                 }
            }
        } else {
            // Not moving much, course aligns with rotation
            courseRotation.current = rotation.current;
            driftDuration.current = 0;
            steerDuration.current = 0;
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
            // Road Logic with Ghosts support
            const useGhost = chunk.renderPoints && chunk.renderPoints.length > 0;
            const points = useGhost ? chunk.renderPoints! : chunk.controlPoints;
            const curve = new THREE.CatmullRomCurve3(points, false);
            
            const divisions = 20;
            const len = points.length;
            // Map division loop to valid segment t range
            const tStart = useGhost ? 1 / (len - 1) : 0;
            const tEnd = useGhost ? (len - 2) / (len - 1) : 1;

            for (let i = 0; i <= divisions; i++) {
                const linearT = i / divisions;
                const t = tStart + linearT * (tEnd - tStart);

                const p = curve.getPointAt(t);
                const flatP = new THREE.Vector3(p.x, 0, p.z);
                const flatCar = new THREE.Vector3(currentPos.x, 0, currentPos.z);
                const d = flatP.distanceTo(flatCar);
                
                if (d < minDistance) {
                    minDistance = d;
                    closestPoint = flatP;
                    if (d < TRACK_WIDTH / 2 + 10) { // Broad phase
                        activeChunkId = chunk.id;
                        progressInChunk = linearT; // Use linear progress for gameplay logic
                    }
                }
            }

            // Quiz Items
            chunk.items.forEach(item => {
                if (!item.isCollected) {
                    const dist = currentPos.distanceTo(item.position);
                    if (dist < 3.5) { 
                        collectItem(chunk.id, item.id);
                        answerQuestion(item.isCorrect);
                    }
                }
            });

            // Obstacles (Coins, Ramps)
            chunk.obstacles.forEach(obs => {
                if (obs.isCollected) return;

                const dist = currentPos.distanceTo(obs.position);
                
                if (obs.type === ObstacleType.COIN) {
                    if (dist < 2.0) {
                        collectCoin(chunk.id, obs.id);
                    }
                }
                else if (obs.type === ObstacleType.RAMP) {
                    if (dist < 3.0 && position.current.y < 1.0) {
                        if (Math.abs(speed.current) > 0.1) {
                             velocityY.current = JUMP_FORCE;
                             soundManager.playSfx('jump');
                             speed.current = Math.min(speed.current * 1.2, currentMaxSpeed * 1.5);
                        }
                    }
                }
            });
        }

        // --- Competitor Collision ---
        competitors.forEach(comp => {
            if (Math.abs(comp.chunkId - playerChunkIndex) <= 1) {
                const chunk = chunks.find(c => c.id === comp.chunkId);
                if (chunk) {
                    const points = chunk.renderPoints || chunk.controlPoints;
                    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
                    const useGhost = !!chunk.renderPoints;
                    const len = points.length;
                    const tStart = useGhost ? 1 / (len - 1) : 0;
                    const tEnd = useGhost ? (len - 2) / (len - 1) : 1;
                    const realT = tStart + comp.progress * (tEnd - tStart);
                    const p = curve.getPointAt(realT);
                    const tan = curve.getTangentAt(realT).normalize();
                    const up = new THREE.Vector3(0, 1, 0);
                    const side = new THREE.Vector3().crossVectors(up, tan).normalize();
                    const botPos = p.add(side.multiplyScalar(comp.laneOffset));
                    
                    const dist = currentPos.distanceTo(botPos);
                    if (dist < 1.8) { 
                        const pushDir = currentPos.clone().sub(botPos).normalize();
                        position.current.add(pushDir.multiplyScalar(0.2));
                        speed.current *= 0.9;
                        const now = state.clock.elapsedTime;
                        if (now - lastCompHitTime.current > 0.5) {
                            soundManager.playSfx('crash');
                            lastCompHitTime.current = now;
                        }
                    }
                }
            }
        });
        
        // 4. Wall Collision
        const allowedDist = (TRACK_WIDTH / 2) - 1.0; 
        
        if (minDistance > allowedDist && position.current.y < 2) {
            const pushDir = currentPos.clone().sub(closestPoint).normalize();
            const clampedPos = closestPoint.clone().add(pushDir.multiplyScalar(allowedDist));
            position.current.x = clampedPos.x;
            position.current.z = clampedPos.z;

            speed.current *= 0.95; 
            
            if (Math.abs(speed.current) > 0.1) {
                const now = state.clock.elapsedTime;
                if (now - lastScrapeTime.current > 0.4) {
                     soundManager.playSfx('scrape');
                     lastScrapeTime.current = now;
                }
            }
        }

        // 5. Move Car
        const velocity = new THREE.Vector3(0, 0, 1)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), courseRotation.current)
          .multiplyScalar(speed.current);
        
        position.current.x += velocity.x;
        position.current.z += velocity.z;
        
        setGameSpeed(speed.current);
        setCarPosition(position.current.x, position.current.z, activeChunkId, progressInChunk);

    } else {
        // --- NON-RACING STATES ---
        soundManager.updateEnginePitch(0);
        
        if (gameStatus === GameStatus.FINISHED) {
             speed.current = Math.max(0, speed.current - FRICTION * 2);
             courseRotation.current = rotation.current; // No drift when finished
             driftDuration.current = 0;
             // Still apply basic friction logic to stop the car
        } else if (gameStatus === GameStatus.IDLE) {
            if (position.current.x !== 0 || position.current.z !== 0) {
                position.current.set(0,0,0);
                rotation.current = 0;
                courseRotation.current = 0;
                speed.current = 0;
                velocityY.current = 0;
                driftDuration.current = 0;
                steerDuration.current = 0;
            }
        }
        // If PAUSED, we simply skip updates, freezing the car in place.
    }

    // --- RENDER UPDATES (Visuals always update even if paused, but positions won't change) ---
    group.current.position.copy(position.current);
    group.current.rotation.y = rotation.current;
    
    const pitch = velocityY.current * 0.5; 
    group.current.rotation.x = pitch;

    const isDrifting = controls.drift && Math.abs(speed.current) > 0.15;
    const leanAngle = (controls.left ? 1 : controls.right ? -1 : 0) * (speed.current * 0.5 + (isDrifting ? 0.3 : 0)); 
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, -leanAngle, 0.1);

    // 7. Camera (Enhanced with Dynamic FOV and Shake)
    const isBoosting = boostTimer > 0;
    const boostOffset = isBoosting ? -4 : 0; 
    
    // Dynamic FOV based on speed ratio
    const speedRatio = Math.abs(speed.current) / MAX_SPEED;
    // Scale FOV less aggressively on mobile to prevent "tiny car" effect
    const maxFovBoost = isMobile ? 15 : 20;
    const targetFov = baseFov + (speedRatio * maxFovBoost); 
    
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
    camera.updateProjectionMatrix();

    const camRotation = new THREE.Euler(0, courseRotation.current, 0); 
    const camY = Math.max(baseCamHeight, baseCamHeight + position.current.y * 0.8); 
    
    const offset = new THREE.Vector3(0, camY, baseCamDist + boostOffset);
    const idealCamPos = position.current.clone().add(offset.clone().applyEuler(camRotation));
    
    // Camera Shake when speeding > 80%
    if (speedRatio > 0.8) {
        const shakeIntensity = (speedRatio - 0.8) * 0.2; // Max 0.04 magnitude
        idealCamPos.x += (Math.random() - 0.5) * shakeIntensity;
        idealCamPos.y += (Math.random() - 0.5) * shakeIntensity;
        idealCamPos.z += (Math.random() - 0.5) * shakeIntensity;
    }

    const idealLookAt = position.current.clone().add(lookAtOffset.clone().applyEuler(camRotation));
    idealLookAt.y += position.current.y * 0.5;

    camera.position.lerp(idealCamPos, 0.1);
    camera.lookAt(idealLookAt);
  });

  return (
    <group ref={group}>
        <CarModel />
        {(boostTimer > 0 || (controls.drift && Math.abs(speed.current) > 0.15)) && (
             <group position={[0, 0.2, -1.8]}>
                 <mesh position={[0.4, 0, 0]}>
                    <sphereGeometry args={[0.2, 8, 8]} />
                    <meshBasicMaterial 
                        color={
                            boostTimer > 0 ? "orange" : 
                            driftDuration.current > 0.8 ? "#00ffff" : 
                            driftDuration.current > 0.4 ? "#ffaa00" : 
                            "white"
                        } 
                        transparent opacity={0.6} 
                    />
                 </mesh>
                 <mesh position={[-0.4, 0, 0]}>
                    <sphereGeometry args={[0.2, 8, 8]} />
                    <meshBasicMaterial 
                         color={
                            boostTimer > 0 ? "orange" : 
                            driftDuration.current > 0.8 ? "#00ffff" : 
                            driftDuration.current > 0.4 ? "#ffaa00" : 
                            "white"
                        } 
                        transparent opacity={0.6} 
                    />
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
