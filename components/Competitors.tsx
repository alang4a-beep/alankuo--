
import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { TrackChunkData } from '../types';

// High-detail Car Model for Opponents (Same as Player)
const OpponentCarModel: React.FC<{ color: string }> = ({ color }) => {
    const primaryColor = color;
    const secondaryColor = "#ffffff";
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
        
        {/* Front Nose Cone */}
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
  
        {/* --- Side Pods --- */}
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
  
        {/* --- Rear Wing --- */}
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
        </group>
  
        {/* --- Engine Area --- */}
        <mesh position={[0, 0.6, -0.8]} castShadow>
            <boxGeometry args={[0.55, 0.45, 0.6]} />
            <meshStandardMaterial color="#222" />
        </mesh>
  
        {/* --- Cockpit --- */}
        <mesh position={[0, 0.75, -0.1]}>
           <boxGeometry args={[0.5, 0.3, 0.8]} />
           <meshStandardMaterial color="#111" />
        </mesh>
        {/* Driver Helmet */}
        <group position={[0, 1.0, -0.2]}>
            <mesh>
               <sphereGeometry args={[0.22, 16, 16]} />
               <meshStandardMaterial color={primaryColor} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.02, 0.18]}>
               <sphereGeometry args={[0.12, 16, 16]} />
               <meshStandardMaterial color="black" roughness={0} />
            </mesh>
        </group>
  
        {/* --- Wheels --- */}
        {/* Front */}
        <mesh position={[0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.35, 24]} />
          <meshStandardMaterial color={tireColor} roughness={0.9} />
        </mesh>
        <mesh position={[-0.7, 0.35, 1.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.35, 24]} />
          <meshStandardMaterial color={tireColor} roughness={0.9} />
        </mesh>
  
        {/* Rear */}
        <mesh position={[0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.5, 24]} />
          <meshStandardMaterial color={tireColor} roughness={0.9} />
        </mesh>
        <mesh position={[-0.75, 0.4, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.5, 24]} />
          <meshStandardMaterial color={tireColor} roughness={0.9} />
        </mesh>
      </group>
    );
  };

export const Competitors: React.FC = () => {
    const competitors = useGameStore(state => state.competitors);
    const chunks = useGameStore(state => state.chunks);
    const updateCompetitors = useGameStore(state => state.updateCompetitors);

    useFrame((state, delta) => {
        updateCompetitors(delta);
    });

    const renderedCompetitors = useMemo(() => {
        return competitors.map(comp => {
            const chunk = chunks.find(c => c.id === comp.chunkId);
            if (!chunk) return null;

            // Calculate position on curve
            const points = chunk.renderPoints || chunk.controlPoints;
            const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
            
            // Adjust 't' if using ghost points (which span wider than actual chunk)
            const useGhost = !!chunk.renderPoints;
            const len = points.length;
            const tStart = useGhost ? 1 / (len - 1) : 0;
            const tEnd = useGhost ? (len - 2) / (len - 1) : 1;
            
            const realT = tStart + comp.progress * (tEnd - tStart);
            
            const point = curve.getPointAt(realT);
            const tangent = curve.getTangentAt(realT).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            const side = new THREE.Vector3().crossVectors(up, tangent).normalize();

            // Apply lane offset
            const finalPos = point.add(side.multiplyScalar(comp.laneOffset));
            const angle = Math.atan2(tangent.x, tangent.z);

            return (
                <group key={comp.id} position={finalPos} rotation={[0, angle, 0]}>
                    <OpponentCarModel color={comp.color} />
                </group>
            );
        });
    }, [competitors, chunks]);

    return <group>{renderedCompetitors}</group>;
};
