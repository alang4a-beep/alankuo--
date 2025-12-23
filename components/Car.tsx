
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
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.4, 2.2]} />
        <meshStandardMaterial color={primaryColor} roughness={0.3} metalness={0.7} />
      </mesh>
      
      <mesh position={[0, 0.45, 1.4]} castShadow>
        <boxGeometry args={[0.4, 0.2, 0.8]} />
        <meshStandardMaterial color={primaryColor} />
      </mesh>

      <mesh position={[0, 0.25, 1.7]} castShadow>
        <boxGeometry args={[1.6, 0.1, 0.4]} />
        <meshStandardMaterial color={secondaryColor} />
      </mesh>
      <mesh position={[0.7, 0.35, 1.65]} rotation={[0.2, 0, 0]}>
         <boxGeometry args={[0.2, 0.2, 0.3]} />
         <meshStandardMaterial color={primaryColor} />
      </mesh>
      <mesh position={[-0.7, 0.35, 1.65]} rotation={[0.2, 0, 0]}>
         <boxGeometry args={[0.2, 0.2, 0.3]} />
         <meshStandardMaterial color={primaryColor} />
      </mesh>

      <group position={[0, 0, 0.2]}>
        <mesh position={[0.55, 0.5, 0]} castShadow>
             <boxGeometry args={[0.5, 0.35, 1.2]} />
             <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0.55, 0.5, 0.61]} rotation={[Math.PI/2, 0, 0]}>
             <planeGeometry args={[0.4, 0.3]} />
             <meshStandardMaterial color="#111" />
        </mesh>
        
        <mesh position={[-0.55, 0.5, 0]} castShadow>
             <boxGeometry args={[0.5, 0.35, 1.2]} />
             <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[-0.55, 0.5, 0.61]} rotation={[Math.PI/2, 0, 0]}>
             <planeGeometry args={[0.4, 0.3]} />
             <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      <group position={[0, 0.9, -1.0]}>
        <mesh position={[0.7, 0, 0]}>
             <boxGeometry args={[0.05, 0.6, 0.6]} />
             <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[-0.7, 0, 0]}>
             <boxGeometry args={[0.05, 0.6, 0.6]} />
             <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, 0.2, 0.1]} rotation={[-0.1, 0, 0]}>
             <boxGeometry args={[1.4, 0.05, 0.3]} />
             <meshStandardMaterial color={secondaryColor} />
        </mesh>
        <mesh position={[0, -0.1, 0]} rotation={[-0.1, 0, 0]}>
             <boxGeometry args={[1.4, 0.05, 0.3]} />
             <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      <mesh position={[0, 0.6, -0.8]} castShadow>
          <boxGeometry args={[0.55, 0.45, 0.6]} />
          <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.15, 0.5, -1.15]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2]} />
          <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[-0.15, 0.5, -1.15]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2]} />
          <meshStandardMaterial color="#555" />
      </mesh>

      <mesh position={[0, 0.75, -0.1]}>
         <boxGeometry args={[0.5, 0.3, 0.8]} />
         <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, 0.9, 0.1]} rotation={[0.5, 0, 0]}>
         <boxGeometry args={[0.3, 0.2, 0.05]} />
         <meshStandardMaterial color="#333" />
      </mesh>
      <group position={[0, 1.0, -0.2]}>
          <mesh>
             <sphereGeometry args={[0.22, 16, 16]} />
             <meshStandardMaterial color="white" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.02, 0.18]}>
             <sphereGeometry args={[0.12, 16, 16]} />
             <meshStandardMaterial color="black" roughness={0} />
          </mesh>
      </group>

      <mesh position={[0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.35, 24]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      <mesh position={[0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.36, 12]} />
        <meshStandardMaterial color={rimColor} />
      </mesh>
      <mesh position={[-0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.35, 24]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      <mesh position={[-0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.36, 12]} />
        <meshStandardMaterial color={rimColor} />
      </mesh>

      <mesh position={[0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 24]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      <mesh position={[0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.51, 12]} />
        <meshStandardMaterial color={rimColor} />
      </mesh>
      <mesh position={[-0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 24]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      <mesh position={[-0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.51, 12]} />
        <meshStandardMaterial color={rimColor} />
      </mesh>

      <mesh position={[0.2, 0.45, 1.8]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.08]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} />
      </mesh>
      <mesh position={[-0.2, 0.45, 1.8]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.08]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} />
      </mesh>
      
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
  
  const competitors = useGameStore((state) => state.competitors);

  const lastScrapeTime = useRef(0);
  const lastDriftTime = useRef(0);
  const lastCompHitTime = useRef(0);

  useEffect(() => { generateInitialTrack(); }, []);

  const speed = useRef(0);
  const rotation = useRef(0);
  const courseRotation = useRef(0);
  const velocityY = useRef(0);
  const position = useRef(new THREE.Vector3(0, 0, 0));
  const driftDuration = useRef(0);
  const steerDuration = useRef(0);
  const lastSteerDir = useRef(0);

  const isMobile = size.width < 768;
  const baseLookAhead = isMobile ? 8 : 6;
  const baseCamDist = isMobile ? -9.0 : -8.0; 
  const baseCamHeight = isMobile ? 4.5 : 4.0; 
  const baseFov = isMobile ? 55 : 50; 
  
  const lookAtOffset = new THREE.Vector3(0, 1.0, baseLookAhead);

  useFrame((state, delta) => {
    if (!group.current) return;

    if (gameStatus === GameStatus.RACING) {
        tickTimers();
        let currentMaxSpeed = MAX_SPEED;
        if (boostTimer > 0) currentMaxSpeed *= BOOST_MULTIPLIER;
        if (penaltyTimer > 0) currentMaxSpeed *= PENALTY_MULTIPLIER;

        soundManager.updateEnginePitch(speed.current / MAX_SPEED);

        if (controls.forward) {
            speed.current = Math.min(speed.current + ACCELERATION, currentMaxSpeed);
        } else if (controls.backward) {
            speed.current = Math.max(speed.current - BRAKING, -currentMaxSpeed / 2);
        } else {
            if (speed.current > 0) speed.current = Math.max(0, speed.current - FRICTION);
            if (speed.current < 0) speed.current = Math.min(0, speed.current + FRICTION);
        }

        if (speed.current > currentMaxSpeed) speed.current = Math.max(currentMaxSpeed, speed.current - FRICTION * 2);

        if (Math.abs(speed.current) > 0.01 && position.current.y < 2) {
            const dir = speed.current > 0 ? 1 : -1;
            const isDrifting = controls.drift && Math.abs(speed.current) > 0.15;
            const MAX_DRIFT_TIME = 1.2; 
            if (isDrifting) {
                driftDuration.current = Math.min(driftDuration.current + delta, MAX_DRIFT_TIME);
            } else {
                driftDuration.current = 0;
            }
            const driftProgress = driftDuration.current / MAX_DRIFT_TIME;
            const driftMultiplier = isDrifting ? (1.1 + driftProgress * 2.9) : 1.0;

            const turnInput = controls.left ? 1 : (controls.right ? -1 : 0);
            if (turnInput !== 0) {
                if (turnInput !== lastSteerDir.current) { steerDuration.current = 0; lastSteerDir.current = turnInput; }
                steerDuration.current = Math.min(steerDuration.current + delta, 0.6);
            } else {
                steerDuration.current = Math.max(steerDuration.current - delta * 5, 0);
                if (steerDuration.current === 0) lastSteerDir.current = 0;
            }
            const steerProgress = steerDuration.current / 0.6;
            const steerMultiplier = 0.6 + (steerProgress * 0.9);
            const currentTurnSpeed = TURN_SPEED * steerMultiplier * driftMultiplier;

            if (controls.left) rotation.current += currentTurnSpeed * dir;
            if (controls.right) rotation.current -= currentTurnSpeed * dir;

            const grip = isDrifting ? 0.06 + (driftDuration.current * 0.02) : 0.15;
            courseRotation.current += (rotation.current - courseRotation.current) * grip;

            if (isDrifting) {
                 const now = state.clock.elapsedTime;
                 if (now - lastDriftTime.current > 0.2) { soundManager.playSfx('drift'); lastDriftTime.current = now; }
            }
        } else {
            courseRotation.current = rotation.current; driftDuration.current = 0; steerDuration.current = 0;
        }

        position.current.y += velocityY.current;
        if (position.current.y > 0) velocityY.current -= GRAVITY;
        if (position.current.y < 0) { position.current.y = 0; velocityY.current = 0; }

        const currentPos = position.current.clone();
        const relevantChunks = chunks.filter(c => Math.abs(c.id - playerChunkIndex) <= 1);
        let minDistance = Infinity;
        let closestPoint = new THREE.Vector3();
        let activeChunkId = playerChunkIndex;
        let progressInChunk = 0; 

        for (const chunk of relevantChunks) {
            const useGhost = chunk.renderPoints && chunk.renderPoints.length > 0;
            const points = useGhost ? chunk.renderPoints! : chunk.controlPoints;
            const curve = new THREE.CatmullRomCurve3(points, false);
            const divisions = 20;
            const len = points.length;
            const tStart = useGhost ? 1 / (len - 1) : 0;
            const tEnd = useGhost ? (len - 2) / (len - 1) : 1;
            for (let i = 0; i <= divisions; i++) {
                const linearT = i / divisions;
                const t = tStart + linearT * (tEnd - tStart);
                const p = curve.getPointAt(t);
                const d = new THREE.Vector3(p.x, 0, p.z).distanceTo(new THREE.Vector3(currentPos.x, 0, currentPos.z));
                if (d < minDistance) { minDistance = d; closestPoint = new THREE.Vector3(p.x, 0, p.z); if (d < TRACK_WIDTH / 2 + 10) { activeChunkId = chunk.id; progressInChunk = linearT; } }
            }
            chunk.items.forEach(item => { if (!item.isCollected && currentPos.distanceTo(item.position) < 3.5) { collectItem(chunk.id, item.id); answerQuestion(item.isCorrect); } });
            chunk.obstacles.forEach(obs => {
                if (obs.isCollected) return;
                const dist = currentPos.distanceTo(obs.position);
                if (obs.type === ObstacleType.COIN) { if (dist < 2.0) collectCoin(chunk.id, obs.id); }
                else if (obs.type === ObstacleType.RAMP) { if (dist < 3.0 && position.current.y < 1.0 && Math.abs(speed.current) > 0.1) { velocityY.current = JUMP_FORCE; soundManager.playSfx('jump'); speed.current = Math.min(speed.current * 1.2, currentMaxSpeed * 1.5); } }
            });
        }

        competitors.forEach(comp => {
            if (Math.abs(comp.chunkId - playerChunkIndex) <= 1) {
                const chunk = chunks.find(c => c.id === comp.chunkId);
                if (chunk) {
                    const points = chunk.renderPoints || chunk.controlPoints;
                    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
                    const useGhost = !!chunk.renderPoints;
                    const tStart = useGhost ? 1 / (points.length - 1) : 0;
                    const tEnd = useGhost ? (points.length - 2) / (points.length - 1) : 1;
                    const p = curve.getPointAt(tStart + comp.progress * (tEnd - tStart));
                    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), curve.getTangentAt(tStart + comp.progress * (tEnd - tStart)).normalize()).normalize();
                    const botPos = p.add(side.multiplyScalar(comp.laneOffset));
                    if (currentPos.distanceTo(botPos) < 1.8) { position.current.add(currentPos.clone().sub(botPos).normalize().multiplyScalar(0.2)); speed.current *= 0.9; const now = state.clock.elapsedTime; if (now - lastCompHitTime.current > 0.5) { soundManager.playSfx('crash'); lastCompHitTime.current = now; } }
                }
            }
        });
        
        const allowedDist = (TRACK_WIDTH / 2) - 1.0; 
        if (minDistance > allowedDist && position.current.y < 2) {
            const pushDir = currentPos.clone().sub(closestPoint).normalize();
            const clampedPos = closestPoint.clone().add(pushDir.multiplyScalar(allowedDist));
            position.current.x = clampedPos.x; position.current.z = clampedPos.z;
            speed.current *= 0.95; 
            if (Math.abs(speed.current) > 0.1) { const now = state.clock.elapsedTime; if (now - lastScrapeTime.current > 0.4) { soundManager.playSfx('scrape'); lastScrapeTime.current = now; } }
        }

        const velocity = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), courseRotation.current).multiplyScalar(speed.current);
        position.current.x += velocity.x; position.current.z += velocity.z;
        setGameSpeed(speed.current); setCarPosition(position.current.x, position.current.z, activeChunkId, progressInChunk);
    } else {
        soundManager.updateEnginePitch(0);
        if (gameStatus === GameStatus.FINISHED) { speed.current = Math.max(0, speed.current - FRICTION * 2); courseRotation.current = rotation.current; driftDuration.current = 0; }
        else if (gameStatus === GameStatus.IDLE) { if (position.current.x !== 0 || position.current.z !== 0) { position.current.set(0,0,0); rotation.current = 0; courseRotation.current = 0; speed.current = 0; velocityY.current = 0; driftDuration.current = 0; steerDuration.current = 0; } }
    }

    group.current.position.copy(position.current);
    group.current.rotation.y = rotation.current;
    group.current.rotation.x = velocityY.current * 0.5;
    const isDrifting = controls.drift && Math.abs(speed.current) > 0.15;
    const leanAngle = (controls.left ? 1 : controls.right ? -1 : 0) * (speed.current * 0.5 + (isDrifting ? 0.3 : 0)); 
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, -leanAngle, 0.1);

    // --- 相機 FOV 與 加速位移 優化 ---
    const isBoosting = boostTimer > 0;
    const boostOffset = isBoosting ? -0.5 : 0; // 減少向後拉遠的距離 (由 1.5 降至 0.5)
    
    const speedRatio = Math.abs(speed.current) / MAX_SPEED;
    const maxFovBoost = isMobile ? 4 : 6; // 減少視野廣角增量 (由 8-12 降至 4-6)
    const targetFov = baseFov + (speedRatio * maxFovBoost); 
    
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.08); // 稍微調慢過渡使視覺更穩定
      camera.updateProjectionMatrix();
    }

    const camRotation = new THREE.Euler(0, courseRotation.current, 0); 
    const camY = Math.max(baseCamHeight, baseCamHeight + position.current.y * 0.8); 
    const offset = new THREE.Vector3(0, camY, baseCamDist + boostOffset);
    const idealCamPos = position.current.clone().add(offset.clone().applyEuler(camRotation));
    
    if (speedRatio > 0.8) {
        const shakeIntensity = (speedRatio - 0.8) * 0.15;
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
        {/* --- 縮減噴火特效比例，使視覺更紮實 --- */}
        {(boostTimer > 0 || (controls.drift && Math.abs(speed.current) > 0.15)) && (
             <group position={[0, 0.2, -1.4]}> {/* 往前移動一點，貼近車體 */}
                 <mesh position={[0.3, 0, 0]}>
                    <sphereGeometry args={[0.15, 8, 8]} /> {/* 縮小球體 (由 0.2 降至 0.15) */}
                    <meshBasicMaterial 
                        color={ boostTimer > 0 ? "orange" : driftDuration.current > 0.8 ? "#00ffff" : driftDuration.current > 0.4 ? "#ffaa00" : "white" } 
                        transparent opacity={0.6} 
                    />
                 </mesh>
                 <mesh position={[-0.3, 0, 0]}>
                    <sphereGeometry args={[0.15, 8, 8]} />
                    <meshBasicMaterial 
                         color={ boostTimer > 0 ? "orange" : driftDuration.current > 0.8 ? "#00ffff" : driftDuration.current > 0.4 ? "#ffaa00" : "white" } 
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
