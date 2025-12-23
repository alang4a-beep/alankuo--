
import React, { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Track } from './components/Track';
import { Car } from './components/Car';
import { Competitors } from './components/Competitors';
import { EnvironmentWrapper } from './components/Environment';
import { useGameStore, LESSON_CATALOG } from './store';
import { GameStatus } from './types';
import { soundManager } from './audio';
import * as THREE from 'three';

const TouchControls = () => {
    const triggerKey = (key: string, type: 'keydown' | 'keyup') => {
        const event = new KeyboardEvent(type, { key, bubbles: true });
        window.dispatchEvent(event);
    };
    const handleBtnDown = (key: string) => (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); triggerKey(key, 'keydown'); };
    const handleBtnUp = (key: string) => (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); triggerKey(key, 'keyup'); };
    const Btn = ({ k, label, className }: { k: string, label: string, className: string }) => (
        <button className={`select-none touch-none active:scale-95 transition-transform bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white font-bold shadow-lg active:bg-white/40 ${className}`} onPointerDown={handleBtnDown(k)} onPointerUp={handleBtnUp(k)} onPointerLeave={handleBtnUp(k)} onPointerCancel={handleBtnUp(k)} onContextMenu={(e) => e.preventDefault()} > {label} </button>
    );

    const [joystickVec, setJoystickVec] = useState({ x: 0, y: 0 });
    const joystickActive = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const handleJoystickDown = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); joystickActive.current = true; startPos.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture(e.pointerId); };
    const handleJoystickMove = (e: React.PointerEvent) => {
        if (!joystickActive.current) return; e.preventDefault(); e.stopPropagation();
        const maxDist = 40; const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy); const clampedDist = Math.min(dist, maxDist); const angle = Math.atan2(dy, dx);
        const clampedX = Math.cos(angle) * clampedDist; const clampedY = Math.sin(angle) * clampedDist;
        setJoystickVec({ x: clampedX, y: clampedY });
        const threshold = 10;
        if (clampedX < -threshold) { triggerKey('ArrowLeft', 'keydown'); triggerKey('ArrowRight', 'keyup'); }
        else if (clampedX > threshold) { triggerKey('ArrowRight', 'keydown'); triggerKey('ArrowLeft', 'keyup'); }
        else { triggerKey('ArrowLeft', 'keyup'); triggerKey('ArrowRight', 'keyup'); }
    };
    const handleJoystickEnd = (e: React.PointerEvent) => { if (!joystickActive.current) return; joystickActive.current = false; setJoystickVec({ x: 0, y: 0 }); triggerKey('ArrowLeft', 'keyup'); triggerKey('ArrowRight', 'keyup'); (e.target as Element).releasePointerCapture(e.pointerId); };

    return (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none z-50 flex flex-col justify-end px-4 pb-20 landscape:pb-[max(1.5rem,env(safe-area-inset-bottom))] landscape:px-8">
            <div className="flex justify-between items-end w-full pointer-events-auto scale-[0.85] origin-bottom md:scale-100">
                <div className="relative w-32 h-32 rounded-full bg-black/30 border-2 border-white/20 backdrop-blur-md flex items-center justify-center touch-none" onPointerDown={handleJoystickDown} onPointerMove={handleJoystickMove} onPointerUp={handleJoystickEnd} onPointerCancel={handleJoystickEnd}>
                    <div className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.6)] border-2 border-white/60 pointer-events-none transition-transform duration-75" style={{ transform: `translate(${joystickVec.x}px, ${joystickVec.y}px)` }} />
                    <div className="absolute left-2 text-white/30 text-xl font-bold">◀</div><div className="absolute right-2 text-white/30 text-xl font-bold">▶</div>
                </div>
                <div className="flex gap-4 items-end">
                    <Btn k="Shift" label="DRIFT" className="w-16 h-16 text-xs bg-yellow-500/30 border-yellow-400/50 text-yellow-100" />
                    <div className="flex flex-col-reverse gap-4 items-center landscape:flex-row landscape:items-end landscape:gap-6">
                        <Btn k="ArrowDown" label="BRAKE" className="w-16 h-12 text-xs bg-red-500/30 border-red-400/50" />
                        <Btn k="ArrowUp" label="GAS" className="w-20 h-24 text-xl bg-green-500/30 border-green-400/50" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const HUD = () => {
  const { 
      status, score, bestScore, speed, timeRemaining, startGame, resetGame, togglePause,
      currentQuestion, wrongQuestions, feedbackMessage, boostTimer, penaltyTimer,
      selectedLessonIds, toggleLesson, competitors, playerRank
  } = useGameStore(state => {
      const playerTotalProgress = state.playerChunkIndex + state.playerProgress;
      let rank = 1; state.competitors.forEach(comp => { if ((comp.chunkId + comp.progress) > playerTotalProgress) rank++; });
      return { ...state, playerRank: rank };
  });

  const [isMuted, setIsMuted] = useState(soundManager.getMuteState());

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') togglePause(); };
      window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  const toggleSound = () => setIsMuted(soundManager.toggleMute());
  
  const currentSpeedKmH = Math.floor(Math.abs(speed * 200));
  const speedPercent = Math.min(100, (currentSpeedKmH / 120) * 100);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isRacingOrPaused = status === GameStatus.RACING || status === GameStatus.PAUSED;

  return (
    <div className="absolute inset-0 pointer-events-none p-4 md:p-6 h-[100dvh]">
      
      {/* Top Left: Rank */}
      {status === GameStatus.RACING && (
        <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-2 scale-[0.8] origin-top-left md:scale-100">
            <div className="bg-black/70 p-2 md:px-4 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-start shadow-lg">
                <div className="text-[10px] md:text-sm text-gray-400 font-mono">RANK</div>
                <div className="text-2xl md:text-3xl font-bold text-white font-mono">
                    <span className="text-yellow-400">{playerRank}</span><span className="text-base text-gray-500">/{competitors.length + 1}</span>
                </div>
            </div>
        </div>
      )}

      {/* Top Center: Quiz Display */}
      {isRacingOrPaused && (
        <div className="absolute top-4 landscape:top-2 left-1/2 -translate-x-1/2 flex justify-center z-20 w-full px-4 pointer-events-none scale-[0.85] origin-top md:scale-100">
          <div className={`bg-black/80 border-2 border-yellow-400 rounded-xl p-2 md:p-4 w-full max-w-[320px] md:max-w-[400px] text-center backdrop-blur-md shadow-2xl landscape:w-auto landscape:max-w-none landscape:flex landscape:items-center landscape:gap-4 landscape:bg-black/60 landscape:rounded-full landscape:border-white/30 transition-all duration-200`}>
              <div className="text-xl md:text-3xl font-bold text-white landscape:text-xl landscape:mb-0 whitespace-nowrap flex items-center justify-center gap-2">
                {currentQuestion.question}
              </div>
              <div className="flex justify-center gap-2 md:gap-4 mt-2 landscape:mt-0 text-xs md:text-sm text-yellow-200">
                  {currentQuestion.options.map((opt, i) => <span key={i} className="bg-white/10 px-2 py-1 landscape:py-0.5 rounded border border-white/10 whitespace-nowrap">{opt}</span>)}
              </div>
          </div>
        </div>
      )}

      {/* Top Right: Timer, Score, Settings */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col items-end font-mono text-white gap-2 z-10 scale-[0.8] origin-top-right md:scale-100">
        <div className="flex gap-2 mb-2">
            <button onClick={togglePause} className="pointer-events-auto bg-black/50 hover:bg-black/80 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center transition-colors text-xl text-white">{status === GameStatus.PAUSED ? '▶️' : '⏸️'}</button>
            <button onClick={toggleSound} className="pointer-events-auto bg-black/50 hover:bg-black/80 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center transition-colors text-xl text-white">{isMuted ? '🔇' : '🔊'}</button>
        </div>

        {isRacingOrPaused && (
             <div className="bg-black/70 p-2 md:px-4 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-end shadow-lg mb-2">
                <div className="text-[10px] md:text-sm text-gray-400">TIME LEFT</div>
                <div className={`text-2xl md:text-3xl font-bold ${timeRemaining < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {formatTime(timeRemaining)}
                </div>
            </div>
        )}

        <div className="bg-black/70 p-2 md:p-4 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-end shadow-lg min-w-[100px] md:min-w-[150px]">
          <div className="text-[10px] md:text-sm text-gray-400">DISTANCE</div>
          <div className="text-2xl md:text-4xl font-bold text-yellow-400">{score}<span className="text-sm md:text-lg text-gray-500 ml-1">m</span></div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        {feedbackMessage && status === GameStatus.RACING && (
            <div className={`fixed top-24 landscape:top-16 animate-pulse text-lg md:text-2xl font-black py-2 px-8 rounded-full border-2 shadow-2xl z-40 ${feedbackMessage.includes('對') ? 'bg-green-600/90 text-white border-green-300' : 'bg-red-600/90 text-white border-red-300'}`}> {feedbackMessage} </div>
        )}

        {status === GameStatus.IDLE && (
          <div className="bg-black/80 p-4 md:p-8 rounded-2xl text-center border-2 border-yellow-500 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-300 w-[95%] max-w-3xl max-h-[90dvh] overflow-y-auto custom-scrollbar pointer-events-auto">
            <h1 className="text-3xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2 tracking-tighter italic">POLY KART RACING</h1>
            <p className="text-gray-400 mb-4 md:mb-8 font-mono text-sm tracking-widest uppercase">Drive Far & Learn in 3 Minutes</p>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4 md:mb-8 text-left">
                <div className="flex-1 bg-white/5 rounded-xl p-4 md:p-5 border border-white/10">
                    <h3 className="text-yellow-400 font-bold mb-3 text-sm uppercase tracking-wide border-b border-white/10 pb-2">1. Select Lessons</h3>
                    <div className="grid grid-cols-1 gap-2 max-h-32 md:max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {Object.values(LESSON_CATALOG).map(lesson => (
                            <button key={lesson.id} onClick={() => toggleLesson(lesson.id)} className={`text-left px-3 py-2 rounded-md border transition-all flex justify-between items-center text-sm ${selectedLessonIds.includes(lesson.id) ? 'bg-yellow-500/20 border-yellow-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                <span className="font-bold">{lesson.title}</span> {selectedLessonIds.includes(lesson.id) && <span className="text-yellow-400">✓</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <button onClick={startGame} disabled={selectedLessonIds.length === 0} className={`w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black py-3 md:py-4 px-8 rounded-xl text-xl md:text-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/20 ${selectedLessonIds.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}> START ENGINE </button>
          </div>
        )}

        {(status === GameStatus.FINISHED || status === GameStatus.PAUSED) && (
          <div className={`bg-black/90 p-4 md:p-8 rounded-2xl text-center border border-white/20 shadow-2xl backdrop-blur-xl pointer-events-auto ${status === GameStatus.FINISHED ? 'w-[95%] max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar' : 'min-w-[300px]'}`}>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-wider">{status === GameStatus.PAUSED ? 'PAUSED' : 'TIME UP!'}</h1>
            <div className="py-4 my-2 border-y border-white/10">
                <div className="text-gray-400 text-sm mb-1">TOTAL DISTANCE</div>
                <div className="text-white text-5xl font-mono font-bold text-yellow-400">{score}m</div>
            </div>

            {status === GameStatus.FINISHED && wrongQuestions.length > 0 && (
                <div className="mb-6 text-left">
                    <h3 className="text-red-400 font-bold mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
                        <span>⚠️ 待複習題目 ({wrongQuestions.length})</span>
                    </h3>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {wrongQuestions.map((q, idx) => (
                            <div key={q.id} className="bg-white/5 border border-red-500/30 rounded-lg p-3 text-sm">
                                <div className="text-gray-300 mb-1">{q.question}</div>
                                <div className="text-green-400 font-bold">正確解答：{q.options[q.correctIndex]}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3">
                {status === GameStatus.PAUSED && <button onClick={togglePause} className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-8 rounded-xl text-lg transition-all">RESUME</button>}
                <button onClick={resetGame} className="bg-transparent hover:bg-white/10 text-white border-2 border-white/30 font-bold py-3 px-8 rounded-xl text-lg transition-all">QUIT TO MENU</button>
            </div>
          </div>
        )}
      </div>

      {status === GameStatus.RACING && <TouchControls />}

      {status === GameStatus.RACING && (
        <div className="absolute bottom-12 landscape:bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10 pointer-events-none scale-[0.75] origin-bottom md:scale-100">
            <div className="flex gap-2 items-center mb-1">
                {boostTimer > 0 && <div className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded animate-pulse shadow-[0_0_10px_orange]">NITRO</div>}
                {penaltyTimer > 0 && <div className="bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded shadow-[0_0_10px_gray]">STALL</div>}
            </div>
            <div className="relative w-48 h-24 md:w-64 md:h-32 bg-gradient-to-t from-black/90 to-transparent rounded-t-full border-t-2 border-white/20 overflow-hidden backdrop-blur-sm">
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
                    <div className="text-4xl md:text-5xl font-black text-white italic tracking-tighter drop-shadow-lg">{currentSpeedKmH}</div>
                    <div className="text-[10px] md:text-xs font-bold text-gray-400">KM/H</div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

const App: React.FC = () => {
  return (
    <div className="w-[100dvw] h-[100dvh] relative bg-gray-900 select-none overflow-hidden touch-none touch-action-none">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        <color attach="background" args={['#1a1a1a']} />
        <Suspense fallback={null}>
          <EnvironmentWrapper />
          <Track />
          <Competitors />
          <Car />
        </Suspense>
      </Canvas>
      <HUD />
    </div>
  );
};
export default App;
