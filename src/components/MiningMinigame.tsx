import React, { useEffect, useRef, useState } from 'react';
import { BetterButton } from './BdccUiPrimitives';

interface MiningMinigameProps {
  onResolve: (quality: 'CRIT' | 'GOOD' | 'NORMAL') => void;
  onCancel: () => void;
}

export const MiningMinigame: React.FC<MiningMinigameProps> = ({ onResolve, onCancel }) => {
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const lockedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!lockedRef.current) {
        posRef.current += dirRef.current * dt * 135;
        if (posRef.current >= 100) {
          posRef.current = 100;
          dirRef.current = -1;
        } else if (posRef.current <= 0) {
          posRef.current = 0;
          dirRef.current = 1;
        }
        setPos(posRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const strike = () => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    const p = posRef.current;
    if (p >= 43 && p <= 57) {
      onResolve('CRIT');
    } else if (p >= 30 && p <= 70) {
      onResolve('GOOD');
    } else {
      onResolve('NORMAL');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        strike();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="p-3.5 rounded-[4px] bg-[#281A4B] border-2 border-[#7C4291] space-y-3">
      <div className="flex items-center justify-between text-[14px]">
        <span className="font-bold text-white">Asteroid Drill Calibration</span>
        <span className="text-[12px] text-[#FFD27D]">Hit the gold core for 2x Credits + Crystal!</span>
      </div>

      {/* Timing Bar */}
      <div
        onClick={strike}
        className="relative h-9 w-full rounded-[3px] bg-[#160F2E] border-2 border-black/50 overflow-hidden cursor-pointer select-none"
      >
        {/* Good Zone (30% - 70%) */}
        <div
          className="absolute inset-y-0 bg-[#2C588B]/70"
          style={{ left: '30%', width: '40%' }}
        />
        {/* Critical Gold Core (43% - 57%) */}
        <div
          className="absolute inset-y-0 bg-[#E59A38]"
          style={{ left: '43%', width: '14%' }}
        />
        {/* Moving Needle */}
        <div
          className="absolute inset-y-0 w-2 bg-white shadow-[0_0_8px_#fff]"
          style={{ left: `calc(${pos}% - 4px)` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <BetterButton
          label="STRIKE VEIN (Space / Click)"
          variant="accent"
          onClick={strike}
          className="flex-1 min-h-[38px]"
        />
        <BetterButton label="Cancel" onClick={onCancel} className="min-h-[38px] px-4" />
      </div>
    </div>
  );
};
