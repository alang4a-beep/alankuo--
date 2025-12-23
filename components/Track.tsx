
import React, { useMemo, useRef, Suspense } from 'react';
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

// Ramp Component - Updated with more visible colors
const Ramp: React.FC<{ position: THREE.Vector3; rotation: number }> = ({ position, rotation }) => {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Bottom Support Structure */}
            <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                <boxGeometry args={[4, 0.2, 5]} />
                <meshStandardMaterial color="#222" roughness={0.6} />
            </mesh>
            {/* Main Ramp Slope - Changed from #111 to Electric Blue */}
            <mesh position={[0, 0.75, 0]} rotation={[-0.3, 0, 0]} castShadow>
                 <boxGeometry args={[4, 1.5, 6]} />
                 <meshStandardMaterial color="#0066ff" metalness={0.7} roughness={0.2} />
            </mesh>
            {/* Top Surface Pad */}
            <mesh position={[0, 0.75, 0]} rotation={[Math.PI/10, 0, 0]}>
                 <boxGeometry args={[3.8, 0.1, 5.5]} />
                 <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} />
            </mesh>
            {/* Traction / Warning Stripes - Changed from #000 to White with Glow */}
             <mesh position={[0, 0.8, 1]} rotation={[Math.PI/10, 0, 0]}>
                 <boxGeometry args={[3.8, 0.11, 0.5]} />
                 <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, 1.0, -0.5]} rotation={[Math.PI/10, 0, 0]}>
                 <boxGeometry args={[3.8, 0.11, 0.5]} />
                 <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, 1.2, -2]} rotation={[Math.PI/10, 0, 0]}>
                 <boxGeometry args={[3.8, 0.11, 0.5]} />
                 <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
};

// Safe Text Component that doesn't crash the scene on suspend
const SafeText: React.FC<any> = (props) => {
    return (
        <Suspense fallback={null}>
            <Text {...props} />
        </Suspense>
    )
}

const TrackChunk: React.FC<{ data: TrackChunkData }> = ({ data }) => {
  const { curve, tStart, tEnd } = useMemo(() => {
    const points = data.renderPoints || data.controlPoints;
    const c = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const len = points.length;
    const useGhosts = !!data.renderPoints;
    const tS = useGhosts ? 1 / (len - 1) : 0;
    const tE = useGhosts ? (len - 2) / (len - 1) : 1;
    return { curve: c, tStart: tS, tEnd: tE };
  }, [data.renderPoints, data.controlPoints]);

  const { roadGeometry, leftWallGeometry, rightWallGeometry, startPillars } = useMemo(() => {
    const pointsCount = 100;
    const roadPositions: number[] = [];
    const roadIndices: number[] = [];
    const leftWallPositions: number[] = [];
    const leftWallIndices: number[] = [];
    const rightWallPositions: number[] = [];
    const rightWallIndices: number[] = [];
    const wallHeight = 1.5;
    const halfWidth = TRACK_WIDTH / 2;

    let firstLeftEdge: THREE.Vector3 | null = null;
    let firstRightEdge: THREE.Vector3 | null = null;

    for (let i = 0; i <= pointsCount; i++) {
        const percent = i / pointsCount;
        const t = tStart + percent * (tEnd - tStart);
        const point = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const side = new THREE.Vector3().crossVectors(up, tangent).normalize();
        const leftEdge = new THREE.Vector3().copy(point).sub(side.clone().multiplyScalar(halfWidth));
        const rightEdge = new THREE.Vector3().copy(point).add(side.clone().multiplyScalar(halfWidth));
        const yOffset = 0.02;
        leftEdge.y = yOffset;
        rightEdge.y = yOffset;
        if (i === 0) {
            firstLeftEdge = leftEdge.clone();
            firstRightEdge = rightEdge.clone();
        }
        roadPositions.push(leftEdge.x, leftEdge.y, leftEdge.z, rightEdge.x, rightEdge.y, rightEdge.z);
        const leftWallTop = leftEdge.clone().add(new THREE.Vector3(0, wallHeight, 0));
        leftWallPositions.push(leftEdge.x, leftEdge.y, leftEdge.z, leftWallTop.x, leftWallTop.y, leftWallTop.z);
        const rightWallTop = rightEdge.clone().add(new THREE.Vector3(0, wallHeight, 0));
        rightWallPositions.push(rightEdge.x, rightEdge.y, rightEdge.z, rightWallTop.x, rightWallTop.y, rightWallTop.z);
        if (i > 0) {
            const currentLeft = i * 2, currentRight = i * 2 + 1, prevLeft = (i - 1) * 2, prevRight = (i - 1) * 2 + 1;
            roadIndices.push(prevLeft, prevRight, currentLeft, currentLeft, prevRight, currentRight);
            leftWallIndices.push(prevLeft, prevRight, currentLeft, currentLeft, prevRight, currentRight);
            rightWallIndices.push(currentLeft, prevRight, prevLeft, currentRight, prevRight, currentLeft);
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
        rightWallGeometry: makeGeo(rightWallPositions, rightWallIndices),
        startPillars: { left: firstLeftEdge, right: firstRightEdge }
    };
  }, [curve, tStart, tEnd]);

  const arrows = useMemo(() => {
    const arrowItems = [];
    const count = 5; 
    for (let i = 1; i < count; i++) {
        const percent = i / count, t = tStart + percent * (tEnd - tStart);
        const point = curve.getPointAt(t), tangent = curve.getTangentAt(t).normalize();
        const dummy = new THREE.Object3D();
        dummy.position.copy(point);
        dummy.lookAt(point.clone().add(tangent));
        dummy.rotateX(Math.PI / 2);
        arrowItems.push({ position: new THREE.Vector3(point.x, 0.05, point.z), rotation: dummy.rotation.clone(), key: i });
    }
    return arrowItems;
  }, [curve, tStart, tEnd]);

  const itemRotation = useMemo(() => {
      const midT = tStart + 0.5 * (tEnd - tStart);
      const tangent = curve.getTangentAt(midT).normalize();
      const angle = Math.atan2(tangent.x, tangent.z);
      return new THREE.Euler(0, angle + Math.PI, 0);
  }, [curve, tStart, tEnd]);

  return (
    <group>
      <mesh geometry={roadGeometry} receiveShadow castShadow>
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={leftWallGeometry} receiveShadow castShadow>
        <meshStandardMaterial color="#cc0000" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rightWallGeometry} receiveShadow castShadow>
         <meshStandardMaterial color="#ffffff" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {startPillars.left && (
          <mesh position={[startPillars.left.x, 0.75, startPillars.left.z]} castShadow>
              <cylinderGeometry args={[0.6, 0.6, 1.5, 12]} />
              <meshStandardMaterial color="#cc0000" roughness={0.5} />
          </mesh>
      )}
      {startPillars.right && (
          <mesh position={[startPillars.right.x, 0.75, startPillars.right.z]} castShadow>
              <cylinderGeometry args={[0.6, 0.6, 1.5, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>
      )}
      {arrows.map((arrow) => (
          <group key={arrow.key} position={arrow.position} rotation={arrow.rotation}>
             <mesh>
                 <shapeGeometry args={[new THREE.Shape().moveTo(0, 2).lineTo(1.5, -1).lineTo(0.5, -1).lineTo(0.5, -3).lineTo(-0.5, -3).lineTo(-0.5, -1).lineTo(-1.5, -1).lineTo(0, 2)]} />
                 <meshBasicMaterial color="#FFFF00" opacity={0.8} transparent side={THREE.DoubleSide} />
             </mesh>
          </group>
      ))}
      {data.items.map((item) => (
          !item.isCollected && (
              <group key={item.id} position={item.position} rotation={itemRotation}>
                  <mesh position={[0, 2, 0]} castShadow>
                      <boxGeometry args={[6.4, 4, 1]} />
                      <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.5} transparent opacity={0.8} />
                  </mesh>
                  <lineSegments position={[0, 2, 0]}>
                      <edgesGeometry args={[new THREE.BoxGeometry(6.4, 4, 1)]} />
                      <lineBasicMaterial color="white" linewidth={2} />
                  </lineSegments>
                  <SafeText position={[0, 2, 1.1]} fontSize={4} color="black" anchorX="center" anchorY="middle" outlineWidth={0} renderOrder={1}>
                    {item.text}
                  </SafeText>
              </group>
          )
      ))}
      {data.obstacles.map((obs) => {
          if (obs.type === ObstacleType.COIN && !obs.isCollected) return <Coin key={obs.id} position={obs.position} />;
          if (obs.type === ObstacleType.RAMP) return <Ramp key={obs.id} position={obs.position} rotation={obs.rotation} />;
          return null;
      })}
    </group>
  );
};

export const Track: React.FC = () => {
  const chunks = useGameStore((state) => state.chunks);
  const playerChunkIndex = useGameStore((state) => state.playerChunkIndex);
  const visibleChunks = useMemo(() => chunks.filter(c => c.id >= playerChunkIndex - 2 && c.id <= playerChunkIndex + 6), [chunks, playerChunkIndex]);
  return <group>{visibleChunks.map(chunk => <TrackChunk key={chunk.id} data={chunk} />)}</group>;
};
