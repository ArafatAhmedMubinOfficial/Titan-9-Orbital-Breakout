import React from 'react';
import { ART_ASSETS } from '../game/data/world';
import { EndingType, GameState } from '../game/types';
import { BetterButton } from './BdccUiPrimitives';

interface EndingScreenProps {
  state: GameState;
  ending: EndingType;
  onPlayAgain: () => void;
}

const ENDING_INFO: Record<EndingType, { label: string; title: string; story: string }> = {
  EXONERATION: {
    label: 'Ending 1 of 3 · Mainframe Hack',
    title: 'Full Exoneration',
    story:
      'You crack the central ledger and broadcast the forged custody records straight to the Interstellar Court. Within minutes your detention collar unlocks by judicial override—and you leave Titan-9 Penitentiary a free citizen.',
  },
  POD_ESCAPE: {
    label: 'Ending 2 of 3 · Stealth Breakout',
    title: 'Ghost in the Rings',
    story:
      'The Plasma Cutter slices cleanly through the Escape Pod bolts. You seal the hatch, ignite the cold-gas thrusters, and vanish into Titan-9’s icy planetary rings long before station radar can lock on.',
  },
  SHUTTLE_HIJACK: {
    label: 'Ending 3 of 3 · Boss Victory',
    title: 'Shuttle Hijack',
    story:
      'With the Aegis-IX Sentinel smoking on the deck plates, you release Pad 02’s mag-clamps and slam the orbital courier shuttle to full burn. You arrived in cuffs—and left flying their fastest ship.',
  },
};

export const EndingScreen: React.FC<EndingScreenProps> = ({ state, ending, onPlayAgain }) => {
  const info = ENDING_INFO[ending];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#3F3E7D] text-[#F4F4FA] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-[#35225D] border-2 border-[#6B54A3] rounded-[16px] p-7 space-y-5 text-center shadow-2xl">
        <div className="px-6 py-3 rounded-[24px]" style={{ backgroundColor: '#5D2254' }}>
          <div className="text-[13px] font-mono-tabular text-[#FFD27D]">{info.label}</div>
          <h1 className="text-[36px] font-bold text-white bdcc-outlined leading-tight">
            {info.title}
          </h1>
        </div>

        <div className="rounded-[4px] overflow-hidden border-2 border-black/35">
          <img
            src={ART_ASSETS.station}
            alt="Titan-9 Orbital Station"
            referrerPolicy="no-referrer"
            className="w-full h-40 object-cover"
          />
        </div>

        <p className="text-[15px] text-white/90 leading-relaxed">{info.story}</p>

        <div className="py-3 border-y border-white/15 grid grid-cols-4 gap-3 font-mono-tabular">
          <div>
            <div className="text-[12px] text-white/65">Days</div>
            <div className="text-[20px] font-bold text-white">{state.day}</div>
          </div>
          <div>
            <div className="text-[12px] text-white/65">Fights</div>
            <div className="text-[20px] font-bold text-[#7CFFB2]">{state.stats.fightsWon}</div>
          </div>
          <div>
            <div className="text-[12px] text-white/65">Crit Mines</div>
            <div className="text-[20px] font-bold text-[#A9D1FF]">{state.stats.criticalMines}</div>
          </div>
          <div>
            <div className="text-[12px] text-white/65">Credits</div>
            <div className="text-[20px] font-bold text-[#FFD27D]">{state.stats.creditsEarned}</div>
          </div>
        </div>

        <BetterButton
          label="Play Again"
          variant="accent"
          onClick={onPlayAgain}
          className="w-full max-w-[240px] mx-auto min-h-[44px]"
        />
      </div>
    </div>
  );
};
