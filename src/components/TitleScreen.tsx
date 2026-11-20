import React from 'react';
import { ART_ASSETS } from '../game/data/world';
import { DEFAULT_APPEARANCE } from '../game/engine';
import { SaveSlotMeta } from '../game/types';
import { BetterButton } from './BdccUiPrimitives';
import { LiveCharacterStage } from './LiveCharacterStage';

interface TitleScreenProps {
  latestSave: SaveSlotMeta | null;
  onNewGame: () => void;
  onContinue: (save: SaveSlotMeta) => void;
  onOpenLoad: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  latestSave,
  onNewGame,
  onContinue,
  onOpenLoad,
}) => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#3F3E7D] text-[#F4F4FA] flex">
      {/* Left Panel — Original Godot #35225D rounded-r-2xl */}
      <aside className="hidden lg:flex w-[265px] shrink-0 bg-[#35225D] rounded-r-[16px] p-4 flex-col justify-between">
        <div className="space-y-4 overflow-y-auto pr-1">
          <h2 className="text-[22px] font-bold text-white bdcc-outlined">Station Briefing</h2>
          <p className="text-[14px] text-white/85 leading-relaxed">
            Survive high-orbit detention aboard Titan-9 Penitentiary. Mine asteroid veins, win
            Fight Yard bouts, trade gear on The Crawl, and break free of orbit.
          </p>

          <div className="pt-2 border-t border-white/15 space-y-1.5 text-[13px] text-white/80">
            <div className="font-bold text-white">Controls &amp; Shortcuts</div>
            <div>• Click any room on the Map to travel</div>
            <div>• Press keys 1–9 for instant actions</div>
            <div>• Spacebar during Mining for 2x Crits</div>
            <div>• F5 Quick Save · F9 Quick Load</div>
          </div>

          <div className="pt-2 border-t border-white/15 space-y-1.5 text-[13px] text-white/80">
            <div className="font-bold text-white">3 Escape Endings</div>
            <div>1. Hack the Mainframe (Keycard)</div>
            <div>2. Cut the Escape Pod (Plasma Cutter)</div>
            <div>3. Defeat Aegis-IX Mech (Shuttle)</div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/15 text-[12px] text-white/60">
          Titan-9: Orbital Breakout · Auto-Saves Locally
        </div>
      </aside>

      {/* Center MainMenu Area (#3F3E7D) */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-6 overflow-y-auto">
        <div className="w-full max-w-[660px] flex flex-col items-center space-y-6">
          {/* Authentic #5D2254 rounded-[32px] Title Banner */}
          <div
            className="w-full px-8 py-5 text-center border-4"
            style={{
              backgroundColor: '#5D2254',
              borderColor: '#5D2254',
              borderRadius: '32px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.28)',
            }}
          >
            <h1 className="text-3xl sm:text-[42px] font-bold text-white leading-tight bdcc-outlined">
              Titan-9: Orbital Breakout
            </h1>
            <div className="text-[15px] text-white/85 mt-1">
              Sci-Fi Prison Survival &amp; Escape RPG
            </div>
          </div>

          {/* Orbital Station Art */}
          <div className="w-full max-w-[520px] rounded-[6px] overflow-hidden border-2 border-[#251742] bg-[#1E1638] shadow-md">
            <img
              src={ART_ASSETS.station}
              alt="Titan-9 Orbital Penitentiary above a ringed planet"
              referrerPolicy="no-referrer"
              className="w-full h-44 sm:h-52 object-cover"
            />
          </div>

          {/* Centered Godot MainMenu Buttons */}
          <div className="w-full max-w-[340px] space-y-2.5">
            {latestSave && (
              <BetterButton
                label={`Continue (${latestSave.name} · Day ${latestSave.day})`}
                variant="accent"
                onClick={() => onContinue(latestSave)}
                className="w-full min-h-[46px]"
              />
            )}
            <BetterButton
              label="New Game"
              variant={latestSave ? 'default' : 'accent'}
              onClick={onNewGame}
              className="w-full min-h-[46px]"
            />
            <BetterButton
              label="Load Game"
              onClick={onOpenLoad}
              className="w-full min-h-[46px]"
            />
          </div>
        </div>
      </main>

      {/* Right Panel — Live Animated Character Preview! (#35225D rounded-l-2xl) */}
      <aside className="hidden lg:flex w-[280px] shrink-0 bg-[#35225D] rounded-l-[16px] p-4 flex-col justify-between">
        <div className="space-y-3">
          <div className="text-[20px] font-bold text-white bdcc-outlined">Live Station View</div>
          <LiveCharacterStage
            roomId="command"
            activity="WALKING"
            activityLabel="Patrolling Deck C"
            appearance={latestSave?.state.player.appearance ?? DEFAULT_APPEARANCE}
            weaponId={latestSave?.state.player.weaponId ?? 'shock_baton'}
            armorId={latestSave?.state.player.armorId ?? 'mining_vest'}
            combat={null}
            fxEvent={null}
          />
          <p className="text-[13px] text-white/80 leading-relaxed">
            Watch your detainee walk, eat, sleep, mine asteroid crystals, train, talk to allies,
            and battle security mechs in real time on the right stage.
          </p>
        </div>

        <div className="text-[12px] text-white/60 font-mono-tabular">
          Sector: Titan-9 High Orbit
        </div>
      </aside>
    </div>
  );
};
