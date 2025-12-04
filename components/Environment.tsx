import React, { useRef, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';

export const EnvironmentWrapper: React.FC = () => {
  const carPosition = useGameStore(state => state.carPosition);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const scene = useThree(state => state.scene);

  useLayoutEffect(() => {
    // Add the target to the scene so the light can point to it
    scene.add(targetRef.current);
    return () => {
      scene.remove(targetRef.current);
    };
  }, [scene]);

  useFrame(() => {
    if (lightRef.current && targetRef.current) {
      // Move light to follow car, maintaining relative offset
      lightRef.current.position.set(carPosition.x + 50, 100, carPosition.z + 50);
      
      // Move target to exactly the car's position
      targetRef.current.position.set(carPosition.x, 0, carPosition.z);
      
      // Update light to point at target
      lightRef.current.target = targetRef.current;
      lightRef.current.updateMatrixWorld();
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight 
        ref={lightRef}
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      <Sky sunPosition={[100, 10, 100]} turbidity={0.5} rayleigh={0.5} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Infinite Ground: Move plane with player */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[carPosition.x, -0.1, carPosition.z]} 
        receiveShadow
      >
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#2d6e32" roughness={0.9} />
      </mesh>
    </>
  );
};