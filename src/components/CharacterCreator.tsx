import React, { useState } from 'react';
import { ARCHETYPES } from '../game/data/characters';
import { ArchetypeId, CharacterAppearance } from '../game/types';
import { soundFx } from '../game/audio';
import { BetterButton, LabeledProgressBar } from './BdccUiPrimitives';
import { LiveCharacterStage } from './LiveCharacterStage';

interface CharacterCreatorProps {
  onBack: () => void;
  onStart: (name: string, archetype: ArchetypeId, appearance: CharacterAppearance) => void;
}

const SUIT_COLORS = [
  { label: 'Amber', hex: '#D97706' },
  { label: 'Steel', hex: '#3B82F6' },
  { label: 'Crimson', hex: '#DC2626' },
  { label: 'Emerald', hex: '#059669' },
  { label: 'Violet', hex: '#7C3AED' },
];

const HAIR_STYLES: { id: CharacterAppearance['hairStyle']; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'visor', label: 'Visor' },
  { id: 'hood', label: 'Hood' },
];

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onBack, onStart }) => {
  const [name, setName] = useState('Alex Mercer');
  const [selected, setSelected] = useState<ArchetypeId>('hacker');
  const [suitColor, setSuitColor] = useState('#D97706');
  const [hairStyle, setHairStyle] = useState<CharacterAppearance['hairStyle']>('visor');

  const arch = ARCHETYPES.find((a) => a.id === selected) ?? ARCHETYPES[0];
  const appearance: CharacterAppearance = {
    suitColor,
    hairStyle,
    skinTone: '#E0AC88',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playSuccess();
    onStart(name.trim() || 'Alex Mercer', selected, appearance);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#3F3E7D] text-[#F4F4FA] flex">
      {/* Left Panel (#35225D) */}
      <aside className="hidden lg:flex w-[250px] shrink-0 bg-[#35225D] rounded-r-[16px] p-4 flex-col justify-between">
        <div className="space-y-3">
          <div className="text-[22px] font-bold text-white bdcc-outlined">Inmate Intake</div>
          <p className="text-[14px] text-white/80 leading-relaxed">
            Customize your name, jumpsuit color, headgear, and starting specialty. Your live
            character on the right updates instantly.
          </p>
        </div>
        <BetterButton label="Back to Main Menu" onClick={onBack} className="w-full" />
      </aside>

      {/* Center Setup Area (#3F3E7D) */}
      <main className="flex-1 flex flex-col justify-between p-5 sm:p-7 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-3xl w-full mx-auto space-y-5 my-auto">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[28px] font-bold text-white bdcc-outlined">
              Titan-9 Detainee Setup
            </h1>
            <div className="lg:hidden">
              <BetterButton label="Back" onClick={onBack} />
            </div>
          </div>

          {/* Name + Appearance Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="t9-name" className="block text-[14px] font-semibold text-white">
                Inmate Name
              </label>
              <input
                id="t9-name"
                type="text"
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#231F4A] border-2 border-[#5D5B9E] rounded-[3px] text-[15px] text-white focus:outline-none focus:border-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-[14px] font-semibold text-white">Jumpsuit &amp; Headgear</div>
              <div className="flex flex-wrap items-center gap-2">
                {SUIT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setSuitColor(c.hex);
                    }}
                    title={c.label}
                    aria-label={`Suit color ${c.label}`}
                    className={`w-7 h-7 rounded-[3px] border-2 cursor-pointer ${
                      suitColor === c.hex ? 'border-white scale-110' : 'border-black/50'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <div className="flex gap-1 ml-1">
                  {HAIR_STYLES.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setHairStyle(h.id);
                      }}
                      className={`px-2 py-1 text-[12px] font-semibold rounded-[3px] border cursor-pointer ${
                        hairStyle === h.id
                          ? 'bg-[#5D2254] border-white text-white'
                          : 'bg-[#2C285B] border-[#4A468A] text-white/80'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Archetype Selector Grid */}
          <div className="space-y-2">
            <div className="text-[14px] font-semibold text-white">Choose Specialty</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ARCHETYPES.map((a) => {
                const isSelected = a.id === selected;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setSelected(a.id);
                    }}
                    className={`text-left p-3.5 rounded-[4px] border-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#5D2254] border-white'
                        : 'bg-[#2C285B] border-[#4A468A] hover:bg-[#36316E]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[17px] font-bold text-white">{a.name}</span>
                      <span className="text-[13px] font-mono-tabular text-[#A9D1FF]">
                        {a.credits} cr
                      </span>
                    </div>
                    <p className="text-[13px] text-white/80 mt-1 leading-snug">{a.tagline}</p>
                    <div className="text-[13px] font-semibold text-[#FFD27D] mt-2">{a.perk}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-1 flex items-center gap-3">
            <button
              type="submit"
              className="bdcc-btn-accent px-8 py-2.5 text-[16px] font-bold cursor-pointer"
            >
              Enter Titan-9
            </button>
          </div>
        </form>
      </main>

      {/* Right Live Preview Panel (#35225D rounded-l-2xl) */}
      <aside className="hidden md:flex w-[285px] shrink-0 bg-[#35225D] rounded-l-[16px] p-4 flex-col gap-2">
        <div className="text-[24px] font-bold text-white bdcc-outlined truncate">
          {name.trim() || 'Alex Mercer'}
        </div>
        <LabeledProgressBar label="Level 1" value={0} max={100} valueText="0 / 100" fillStyle="blue" />
        <LabeledProgressBar label="Health" value={arch.hp} max={arch.hp} fillStyle="crimson" />
        <LabeledProgressBar label="Energy" value={arch.energy} max={arch.energy} fillStyle="blue" />

        <div className="text-[14px] text-white pt-1 flex items-center justify-between">
          <span>Credits: {arch.credits} cr</span>
          <span className="font-mono-tabular text-white/85">
            ATK {arch.attack} / DEF {arch.defense}
          </span>
        </div>

        <div className="mt-1">
          <LiveCharacterStage
            roomId="cell"
            activity="IDLE"
            activityLabel={`${arch.name} · Ready`}
            appearance={appearance}
            weaponId={arch.id === 'brawler' ? 'hydro_wrench' : null}
            armorId={null}
            combat={null}
            fxEvent={null}
          />
        </div>
      </aside>
    </div>
  );
};
