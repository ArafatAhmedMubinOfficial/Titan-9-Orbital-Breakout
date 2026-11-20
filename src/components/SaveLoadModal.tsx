import React, { useState } from 'react';
import { deleteSaveSlot, loadAllSaves, saveToSlot } from '../game/engine';
import { GameState, SaveSlotMeta } from '../game/types';
import { soundFx } from '../game/audio';
import { BetterButton } from './BdccUiPrimitives';

interface SaveLoadModalProps {
  mode: 'SAVE' | 'LOAD';
  currentState: GameState | null;
  onClose: () => void;
  onLoadState: (state: GameState) => void;
  onReturnTitle?: () => void;
}

const SLOTS = [
  { id: 'autosave', label: 'Auto-Save', readonly: true },
  { id: 'quicksave', label: 'Quick Save (F5)', readonly: false },
  { id: 'slot_1', label: 'Save Slot 1', readonly: false },
  { id: 'slot_2', label: 'Save Slot 2', readonly: false },
];

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  mode,
  currentState,
  onClose,
  onLoadState,
  onReturnTitle,
}) => {
  const [saves, setSaves] = useState<Record<string, SaveSlotMeta>>(() => loadAllSaves());
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = (slotId: string) => {
    if (!currentState) return;
    soundFx.playSuccess();
    saveToSlot(slotId, currentState);
    setSaves(loadAllSaves());
    setNotice('Game saved.');
  };

  const handleLoad = (meta: SaveSlotMeta) => {
    soundFx.playSuccess();
    onLoadState(meta.state);
    onClose();
  };

  const handleDelete = (slotId: string) => {
    soundFx.playClick();
    deleteSaveSlot(slotId);
    setSaves(loadAllSaves());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[#35225D] border-2 border-[#6B54A3] rounded-[12px] overflow-hidden shadow-2xl">
        <div className="px-4 py-3 bg-[#281847] border-b border-white/15 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-white bdcc-outlined">
            {mode === 'SAVE' ? 'Game Menu · Save / Load' : 'Load Saved Game'}
          </h2>
          <BetterButton label="Close" onClick={onClose} className="min-h-[32px] px-3" />
        </div>

        <div className="p-4 space-y-2.5">
          {notice && (
            <div className="px-3 py-2 rounded-[3px] bg-[#224b44] border border-[#387d71] text-[13px] text-white">
              {notice}
            </div>
          )}

          {SLOTS.map((slot) => {
            const meta = saves[slot.id];
            return (
              <div
                key={slot.id}
                className="p-3 rounded-[4px] bg-[#241642] border border-white/10 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-[#FFD27D]">{slot.label}</div>
                  {meta ? (
                    <>
                      <div className="text-[14px] font-semibold text-white truncate">{meta.name}</div>
                      <div className="text-[12px] text-white/70 font-mono-tabular">
                        Day {meta.day} · Lvl {meta.level} · {meta.roomName}
                      </div>
                    </>
                  ) : (
                    <div className="text-[12px] text-white/50">Empty slot</div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {mode === 'SAVE' && !slot.readonly && currentState && (
                    <BetterButton
                      label="Save"
                      variant="accent"
                      onClick={() => handleSave(slot.id)}
                      className="min-h-[30px] px-3"
                    />
                  )}
                  {meta && (
                    <BetterButton
                      label="Load"
                      onClick={() => handleLoad(meta)}
                      className="min-h-[30px] px-3"
                    />
                  )}
                  {meta && (
                    <BetterButton
                      label="Del"
                      variant="danger"
                      onClick={() => handleDelete(slot.id)}
                      className="min-h-[30px] px-2.5"
                    />
                  )}
                </div>
              </div>
            );
          })}

          {onReturnTitle && (
            <div className="pt-2 border-t border-white/15">
              <BetterButton
                label="Return to Main Menu"
                onClick={() => {
                  onClose();
                  onReturnTitle();
                }}
                className="w-full min-h-[38px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
