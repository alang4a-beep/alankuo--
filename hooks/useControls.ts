import { useEffect, useState } from 'react';

export const useControls = () => {
  const [controls, setControls] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setControls((c) => ({ ...c, forward: true }));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setControls((c) => ({ ...c, backward: true }));
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setControls((c) => ({ ...c, left: true }));
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setControls((c) => ({ ...c, right: true }));
          break;
        case 'Shift':
            setControls((c) => ({ ...c, drift: true }));
            break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setControls((c) => ({ ...c, forward: false }));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setControls((c) => ({ ...c, backward: false }));
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setControls((c) => ({ ...c, left: false }));
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setControls((c) => ({ ...c, right: false }));
          break;
        case 'Shift':
            setControls((c) => ({ ...c, drift: false }));
            break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return controls;
};