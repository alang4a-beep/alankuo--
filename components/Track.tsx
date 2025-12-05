
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useGameStore } from '../store';
import { TrackChunkData, TRACK_WIDTH, ObstacleType } from '../types';

// Animated Coin Component
const Coin: React.FC<{ position: THREE.Vector3 }> = ({ position }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 3;
            ref.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 5) * 0.2;
        }
    });
    return (
        <group ref={ref} position={position}>
            <mesh rotation={[Math.PI/2, 0, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
                <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} emissive="#FFD700" emissiveIntensity={0.2} />
            </mesh>
             <mesh rotation={[Math.PI/2, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 0.12, 16]} />
                <meshStandardMaterial color="#FFA500" metalness={0.8} roughness={0.2} />
            </mesh>
        </group>
    );
};

// Crate Component - Scaled down
const Crate: React.FC<{ position: THREE.Vector3; rotation: number }> = ({ position, rotation }) => {
    return (
        <mesh position={[position.x, 0.4, position.z]} rotation={[0, rotation, 0]} castShadow>
            {/* Reduced from args=[2,2,2] to [0.8,0.8,0.8] approx 70% reduction in volume/impact */}
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial color="#8B4513" roughness={0.9} />
            {/* Crate border details */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(0.8, 0.8, 0.8)]} />
                <lineBasicMaterial color="#3e1e05" />
            </lineSegments>
        </mesh>
    );
};

// Ramp Component
const Ramp: React.FC<{ position: THREE.Vector3; rotation: number }> = ({ position, rotation }) => {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Main Wedge Body */}
            <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                {/* A squashed box rotated to form a ramp */}
                <boxGeometry args={[4, 0.2, 5]} />
                <meshStandardMaterial color="#333" roughness={0.6} />
            </mesh>
            
            {/* Physical Slope Visual */}
            <mesh position={[0, 0.75, 0]} rotation={[-0.3, 0, 0]}>
                 <boxGeometry args={[4, 1.5, 6]} />
                 <meshStandardMaterial color="#111" />
            </mesh>

            {/* Yellow Top Surface with Stripes */}
            <mesh position={[0, 0.75, 0]} rotation={[Math.PI/10, 0, 0]}> 
                 <boxGeometry args={[3.8, 0.1, 5.5]} />
                 <meshStandardMaterial color="#FFD700" />
            </mesh>
            
            {/* Black Chevrons/Stripes on top */}
             <mesh position={[0, 0.8, 1]} rotation={[Math.PI/10, 0, 0]}>
                 <boxGeometry args={[3.8, 0.11, 0.5]} />
                 <meshStandardMaterial color="#000" />
            </mesh>
            <mesh position={[0, 1.0, -0.5]} rotation={[Math.PI/10, 0, 0]}>
                 <boxGeometry args={[3.8, 0.11, 0.5]} />
                 <meshStandardMaterial color="#000" />
            </mesh>
            <mesh position={[0, 1.2, -2]} rotation={[Math.PI/10, 0, 0]}>
                 <boxGeometry args={[3.8, 0.11, 0.5]} />
                 <meshStandardMaterial color="#000" />
            </mesh>
        </group>
    );
};


const TrackChunk: React.FC<{ data: TrackChunkData }> = ({ data }) => {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(data.controlPoints, false, 'catmullrom', 0.5);
  }, [data.controlPoints]);

  const { roadGeometry, leftWallGeometry, rightWallGeometry } = useMemo(() => {
    const pointsCount = 60; // Resolution per chunk
    const roadPositions: number[] = [];
    const roadIndices: number[] = [];
    
    const leftWallPositions: number[] = [];
    const leftWallIndices: number[] = [];
    
    const rightWallPositions: number[] = [];
    const rightWallIndices: number[] = [];

    const wallHeight = 1.5;
    const halfWidth = TRACK_WIDTH / 2;

    for (let i = 0; i <= pointsCount; i++) {
        const t = i / pointsCount;
        const point = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        
        const up = new THREE.Vector3(0, 1, 0);
        const side = new THREE.Vector3().crossVectors(up, tangent).normalize();

        const leftEdge = new THREE.Vector3().copy(point).sub(side.clone().multiplyScalar(halfWidth));
        const rightEdge = new THREE.Vector3().copy(point).add(side.clone().multiplyScalar(halfWidth));
        
        const yOffset = 0.02;
        leftEdge.y = yOffset;
        rightEdge.y = yOffset;

        // Road
        roadPositions.push(leftEdge.x, leftEdge.y, leftEdge.z);
        roadPositions.push(rightEdge.x, rightEdge.y, rightEdge.z);

        // Walls (Vertical planes rising from edges)
        // Left Wall
        const leftWallTop = leftEdge.clone();
        leftWallTop.y += wallHeight;
        leftWallPositions.push(leftEdge.x, leftEdge.y, leftEdge.z);
        leftWallPositions.push(leftWallTop.x, leftWallTop.y, leftWallTop.z);

        // Right Wall
        const rightWallTop = rightEdge.clone();
        rightWallTop.y += wallHeight;
        rightWallPositions.push(rightEdge.x, rightEdge.y, rightEdge.z);
        rightWallPositions.push(rightWallTop.x, rightWallTop.y, rightWallTop.z);

        if (i > 0) {
            const currentLeft = i * 2;
            const currentRight = i * 2 + 1;
            const prevLeft = (i - 1) * 2;
            const prevRight = (i - 1) * 2 + 1;

            const addQuad = (indices: number[], reverse = false) => {
                if (reverse) {
                    indices.push(currentLeft, prevRight, prevLeft);
                    indices.push(currentRight, prevRight, currentLeft);
                } else {
                    indices.push(prevLeft, prevRight, currentLeft);
                    indices.push(currentLeft, prevRight, currentRight);
                }
            };

            addQuad(roadIndices);
            addQuad(leftWallIndices); // Standard winding
            addQuad(rightWallIndices, true); // Reverse winding for right wall to face inward
        }
    }

    const makeGeo = (positions: number[], indices: number[]) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    };

    return {
        roadGeometry: makeGeo(roadPositions, roadIndices),
        leftWallGeometry: makeGeo(leftWallPositions, leftWallIndices),
        rightWallGeometry: makeGeo(rightWallPositions, rightWallIndices)
    };
  }, [curve]);

  const arrows = useMemo(() => {
    const arrowItems = [];
    const count = 5; 
    
    for (let i = 1; i < count; i++) {
        const t = i / count; 
        const point = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        
        const dummy = new THREE.Object3D();
        dummy.position.copy(point);
        dummy.lookAt(point.clone().add(tangent));
        dummy.rotateX(Math.PI / 2);

        arrowItems.push({
            position: new THREE.Vector3(point.x, 0.05, point.z),
            rotation: dummy.rotation.clone(),
            key: i
        });
    }
    return arrowItems;
  }, [curve]);

  // Calculate rotation for Quiz items to face the car
  const itemRotation = useMemo(() => {
      const tangent = curve.getTangentAt(0.5).normalize();
      const angle = Math.atan2(tangent.x, tangent.z);
      return new THREE.Euler(0, angle + Math.PI, 0);
  }, [curve]);

  return (
    <group>
      <mesh geometry={roadGeometry} receiveShadow castShadow>
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Walls */}
      <mesh geometry={leftWallGeometry} receiveShadow castShadow>
        <meshStandardMaterial color="#cc0000" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rightWallGeometry} receiveShadow castShadow>
         <meshStandardMaterial color="#ffffff" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      
      {arrows.map((arrow) => (
          <group key={arrow.key} position={arrow.position} rotation={arrow.rotation}>
             <mesh>
                 <shapeGeometry args={[new THREE.Shape()
                    .moveTo(0, 2)
                    .lineTo(1.5, -1)
                    .lineTo(0.5, -1)
                    .lineTo(0.5, -3)
                    .lineTo(-0.5, -3)
                    .lineTo(-0.5, -1)
                    .lineTo(-1.5, -1)
                    .lineTo(0, 2)
                 ]} />
                 <meshBasicMaterial color="#FFFF00" opacity={0.8} transparent side={THREE.DoubleSide} />
             </mesh>
          </group>
      ))}

      {/* Render Quiz Items */}
      {data.items.map((item) => (
          !item.isCollected && (
              <group key={item.id} position={item.position} rotation={itemRotation}>
                  <mesh position={[0, 1.5, 0]} castShadow>
                      <boxGeometry args={[2, 2, 2]} />
                      <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.5} transparent opacity={0.8} />
                  </mesh>
                  <lineSegments position={[0, 1.5, 0]}>
                      <edgesGeometry args={[new THREE.BoxGeometry(2, 2, 2)]} />
                      <lineBasicMaterial color="white" linewidth={2} />
                  </lineSegments>
                  <Text position={[0, 3, 0]} fontSize={3} color="white" anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="black">
                    {item.text}
                  </Text>
              </group>
          )
      ))}

      {/* Render Obstacles */}
      {data.obstacles.map((obs) => {
          if (obs.type === ObstacleType.COIN && !obs.isCollected) {
              return <Coin key={obs.id} position={obs.position} />;
          }
          if (obs.type === ObstacleType.CRATE) {
              return <Crate key={obs.id} position={obs.position} rotation={obs.rotation} />;
          }
          if (obs.type === ObstacleType.RAMP) {
              return <Ramp key={obs.id} position={obs.position} rotation={obs.rotation} />;
          }
          return null;
      })}
    </group>
  );
};

export const Track: React.FC = () => {
  const chunks = useGameStore((state) => state.chunks);
  const playerChunkIndex = useGameStore((state) => state.playerChunkIndex);

  const visibleChunks = useMemo(() => {
    return chunks.filter(c => c.id >= playerChunkIndex - 2 && c.id <= playerChunkIndex + 6);
  }, [chunks, playerChunkIndex]);

  return (
    <group>
      {visibleChunks.map(chunk => (
        <TrackChunk key={chunk.id} data={chunk} />
      ))}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3, TRACK_WIDTH]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
};
