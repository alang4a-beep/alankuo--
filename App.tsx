
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Track } from './components/Track';
import { Car } from './components/Car';
import { EnvironmentWrapper } from './components/Environment';
import { useGameStore } from './store';
import { GameStatus } from './types';
import * as THREE from 'three';

// --- Touch Controls Component ---
const TouchControls = () => {
    // Helper to simulate key events
    const triggerKey = (key: string, type: 'keydown' | 'keyup') => {
        const event = new KeyboardEvent(type, { key, bubbles: true });
        window.dispatchEvent(event);
    };

    const handlePointerDown = (key: string) => (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        triggerKey(key, 'keydown');
    };

    const handlePointerUp = (key: string) => (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        triggerKey(key, 'keyup');
    };

    const Btn = ({ k, label, className }: { k: string, label: string, className: string }) => (
        <button
            className={`select-none touch-none active:scale-95 transition-transform bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white font-bold shadow-lg active:bg-white/40 ${className}`}
            style={{ 
                touchAction: 'none', 
                WebkitUserSelect: 'none', 
                userSelect: 'none',
                WebkitTouchCallout: 'none' 
            }}
            onPointerDown={handlePointerDown(k)}
            onPointerUp={handlePointerUp(k)}
            onPointerLeave={handlePointerUp(k)} // Release if sliding off
            onPointerCancel={handlePointerUp(k)} // Release if interrupted
            onContextMenu={(e) => e.preventDefault()} // Prevent context menu
        >
            {label}
        </button>
    );

    return (
        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-end pb-6 px-6">
            <div className="flex justify-between items-end w-full pointer-events-auto">
                {/* Left Controls: Steering */}
                <div className="flex gap-4">
                    <Btn k="ArrowLeft" label="←" className="w-20 h-20 text-3xl" />
                    <Btn k="ArrowRight" label="→" className="w-20 h-20 text-3xl" />
                </div>

                {/* Right Controls: Gas, Brake, Drift */}
                <div className="flex gap-4 items-end">
                    <Btn k="Shift" label="DRIFT" className="w-16 h-16 text-xs bg-yellow-500/30 border-yellow-400/50 text-yellow-100" />
                    <div className="flex flex-col gap-4 items-center">
                        <Btn k="ArrowUp" label="GAS" className="w-20 h-24 text-xl bg-green-500/30 border-green-400/50" />
                        <Btn k="ArrowDown" label="BRAKE" className="w-16 h-12 text-xs bg-red-500/30 border-red-400/50" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const Minimap = () => {
  const { carPosition, chunks, playerChunkIndex } = useGameStore();

  const pathData = useMemo(() => {
    let d = "";
    // Only show nearby chunks on minimap
    const visibleChunks = chunks.filter(c => Math.abs(c.id - playerChunkIndex) < 4);

    visibleChunks.forEach(chunk => {
        // Sample points from the curve to draw the line
        const curve = new THREE.CatmullRomCurve3(chunk.controlPoints, false);
        const points = curve.getPoints(10);
        
        points.forEach((p, i) => {
            // Transform world coordinates to minimap coordinates (relative to car)
            const relX = (p.x - carPosition.x);
            const relZ = (p.z - carPosition.z);
            // Scale down for minimap
            const sx = relX * 2;
            const sy = relZ * 2;
            
            if (d === "") d += `M ${sx} ${sy}`;
            else d += ` L ${sx} ${sy}`;
        });
    });

    return d;
  }, [chunks, carPosition, playerChunkIndex]);

  return (
    <div className="absolute top-6 left-6 w-32 h-32 md:w-48 md:h-48 bg-black/40 rounded-full border-2 border-white/20 backdrop-blur-md overflow-hidden shadow-lg flex items-center justify-center z-10 hidden sm:flex">
        <svg 
            width="100%" 
            height="100%" 
            viewBox="-150 -150 300 300"
            className="w-full h-full opacity-80"
            style={{ transform: 'rotate(180deg)' }} 
        >
            <circle cx="0" cy="0" r="50" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2"/>
            <circle cx="0" cy="0" r="100" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2"/>
            {/* Track Path */}
            <path d={pathData} stroke="#ffffff" strokeWidth="20" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            {/* Player Dot */}
            <circle cx="0" cy="0" r="8" fill="#ffff00" stroke="black" strokeWidth="2" />
        </svg>
        <div className="absolute top-4 text-xs text-white/50 font-bold font-mono">RADAR</div>
    </div>
  );
};

function HUD() {
  const { 
      status, score, bestScore, speed, startGame, resetGame,
      currentQuestion, feedbackMessage, boostTimer, penaltyTimer 
  } = useGameStore();

  const currentSpeedKmH = Math.floor(Math.abs(speed * 200));
  // 120 is the new theoretical max with boost (80 * 1.5)
  const speedPercent = Math.min(100, (currentSpeedKmH / 120) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none p-6">
      
      {/* Top Left: Minimap */}
      <Minimap />

      {/* Top Center: Quiz Question Box */}
      {status === GameStatus.RACING && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex justify-center z-20 w-full px-4">
          <div className="bg-black/80 border-2 border-yellow-400 rounded-xl p-3 md:p-4 w-full max-w-[400px] text-center backdrop-blur-md shadow-2xl">
              <div className="text-gray-400 text-[10px] md:text-xs uppercase tracking-widest mb-1">Current Challenge</div>
              <div className="text-2xl md:text-3xl font-bold text-white">
                  {currentQuestion.question}
              </div>
              <div className="flex justify-center gap-2 md:gap-4 mt-2 text-xs md:text-sm text-yellow-200">
                  {currentQuestion.options.map((opt, i) => (
                      <span key={i} className="bg-white/10 px-2 py-1 rounded border border-white/10">{opt}</span>
                  ))}
              </div>
          </div>
        </div>
      )}

      {/* Top Right: Score */}
      <div className="absolute top-6 right-6 flex flex-col items-end font-mono text-white gap-2 z-10">
        <div className="bg-black/70 p-2 md:p-4 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-end shadow-lg min-w-[100px] md:min-w-[150px]">
          <div className="text-[10px] md:text-sm text-gray-400">DISTANCE</div>
          <div className="text-2xl md:text-4xl font-bold text-yellow-400">
            {score}<span className="text-sm md:text-lg text-gray-500 ml-1">m</span>
          </div>
        </div>

        {bestScore > 0 && (
            <div className="bg-black/70 px-3 py-1 rounded-lg border border-white/10 text-right backdrop-blur-sm">
                <span className="text-[10px] md:text-xs text-gray-400 mr-2">BEST</span>
                <span className="text-sm md:text-lg font-bold text-white">{bestScore}m</span>
            </div>
        )}
      </div>

      {/* Center: Feedback & Menus */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-30">
        {feedbackMessage && (
            <div className={`
                fixed top-32 animate-pulse text-lg md:text-2xl font-black py-2 px-8 rounded-full border-2 shadow-2xl z-40
                ${feedbackMessage.includes('CORRECT') ? 'bg-green-600/90 text-white border-green-300' : 'bg-red-600/90 text-white border-red-300'}
            `}>
                {feedbackMessage}
            </div>
        )}

        {status === GameStatus.IDLE && (
          <div className="bg-black/80 p-8 rounded-2xl text-center border-2 border-yellow-500 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-300 max-w-sm md:max-w-md">
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4 tracking-tighter italic">
              POLY KART QUIZ
            </h1>
            <h2 className="text-xl md:text-2xl text-white font-bold mb-4">ENDLESS MODE</h2>
            <p className="text-gray-300 mb-6 text-sm md:text-base">
                Drive into the correct box!<br/>
                PC: Use <span className="font-bold text-white border border-white/20 rounded px-1">Arrow Keys</span><br/>
                Mobile: Use On-screen Controls
            </p>
            <button 
              onClick={startGame}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full text-xl transition-transform hover:scale-105 active:scale-95"
            >
              START ENGINE
            </button>
          </div>
        )}

        {status === GameStatus.FINISHED && (
          <div className="bg-black/80 p-8 rounded-2xl text-center border-2 border-white shadow-2xl backdrop-blur-md">
            <h1 className="text-4xl font-bold text-white mb-2">PAUSED</h1>
            <p className="text-white text-xl mb-4">Distance: {score}m</p>
            <button 
              onClick={resetGame}
              className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-8 rounded-full text-lg transition-all"
            >
              RESTART
            </button>
          </div>
        )}
      </div>

      {/* Touch Controls (Mobile Only) */}
      {status === GameStatus.RACING && <TouchControls />}

      {/* Speedometer - Repositioned to Bottom Center to accommodate touch controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10 pointer-events-none">
        
        {/* Status Indicators */}
        <div className="flex gap-2 items-center mb-1">
            {boostTimer > 0 && <div className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded animate-pulse shadow-[0_0_10px_orange]">NITRO</div>}
            {penaltyTimer > 0 && <div className="bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded shadow-[0_0_10px_gray]">STALL</div>}
        </div>

        {/* Speedometer Gauge */}
        <div className="relative w-48 h-24 md:w-64 md:h-32 bg-gradient-to-t from-black/90 to-transparent rounded-t-full border-t-2 border-white/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[90%] border-t-[15px] md:border-t-[20px] border-l-[15px] md:border-l-[20px] border-r-[15px] md:border-r-[20px] border-white/10 rounded-t-full border-b-0"></div>
            
            <div 
                className="absolute bottom-0 left-0 w-full h-full origin-bottom transition-all duration-100 ease-linear opacity-80"
                style={{
                    background: `conic-gradient(from 270deg at 50% 100%, transparent 0deg, ${speedPercent > 80 ? 'orange' : '#00ccff'} ${speedPercent * 1.8}deg, transparent 0deg)`
                }}
            ></div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
                <div className="text-4xl md:text-5xl font-black text-white italic tracking-tighter shadow-black drop-shadow-lg">
                    {currentSpeedKmH}
                </div>
                <div className="text-[10px] md:text-xs font-bold text-gray-400">KM/H</div>
            </div>
        </div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <div className="w-full h-full relative bg-gray-900 select-none">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        <color attach="background" args={['#1a1a1a']} />
        <Suspense fallback={null}>
          <EnvironmentWrapper />
          <Track />
          <Car />
        </Suspense>
      </Canvas>
      <HUD />
    </div>
  );
};

export default App;
