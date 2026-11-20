import React from 'react';
import { ACHIEVEMENT_DEFS, ITEMS } from '../game/data/items';
import { countItem, getPlayerTotals } from '../game/engine';
import { GameState } from '../game/types';
import { BetterButton } from './BdccUiPrimitives';

interface BagAndPlanModalProps {
  tab: 'BAG' | 'PLAN' | 'ACHIEVEMENTS';
  state: GameState;
  onSwitchTab: (tab: 'BAG' | 'PLAN' | 'ACHIEVEMENTS') => void;
  onUseItem: (itemId: string) => void;
  onClose: () => void;
}

export const BagAndPlanModal: React.FC<BagAndPlanModalProps> = ({
  tab,
  state,
  onSwitchTab,
  onUseItem,
  onClose,
}) => {
  const { player, flags } = state;
  const totals = getPlayerTotals(player);
  const weapon = player.weaponId ? ITEMS[player.weaponId] : null;
  const armor = player.armorId ? ITEMS[player.armorId] : null;

  const hasKeycard = countItem(player.inventory, 'keycard') > 0;
  const hasCutter = countItem(player.inventory, 'plasma_cutter') > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-[#35225D] border-2 border-[#6B54A3] rounded-[12px] overflow-hidden shadow-2xl">
        {/* Top Tab Header */}
        <div className="px-4 py-3 bg-[#281847] border-b border-white/15 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BetterButton
              label="Inventory"
              variant={tab === 'BAG' ? 'accent' : 'default'}
              onClick={() => onSwitchTab('BAG')}
              className="min-h-[34px] px-3"
            />
            <BetterButton
              label="Escape Plan"
              variant={tab === 'PLAN' ? 'accent' : 'default'}
              onClick={() => onSwitchTab('PLAN')}
              className="min-h-[34px] px-3"
            />
            <BetterButton
              label={`Medals (${state.achievements.length}/${ACHIEVEMENT_DEFS.length})`}
              variant={tab === 'ACHIEVEMENTS' ? 'accent' : 'default'}
              onClick={() => onSwitchTab('ACHIEVEMENTS')}
              className="min-h-[34px] px-3"
            />
          </div>
          <BetterButton label="Close" onClick={onClose} className="min-h-[34px] px-4" />
        </div>

        <div className="p-4 max-h-[72vh] overflow-y-auto space-y-4">
          {tab === 'BAG' && (
            <>
              <div className="grid grid-cols-2 gap-3 text-[14px]">
                <div className="p-3 rounded-[4px] bg-[#241642] border border-white/15">
                  <div className="text-[12px] text-white/65">Equipped Weapon</div>
                  <div className="font-bold text-white mt-0.5">
                    {weapon ? weapon.name : 'None (Fists)'}
                  </div>
                  <div className="text-[12px] font-mono-tabular text-[#A9D1FF]">
                    Total Attack: {totals.attack}
                  </div>
                </div>
                <div className="p-3 rounded-[4px] bg-[#241642] border border-white/15">
                  <div className="text-[12px] text-white/65">Equipped Armor</div>
                  <div className="font-bold text-white mt-0.5">
                    {armor ? armor.name : 'Standard Jumpsuit'}
                  </div>
                  <div className="text-[12px] font-mono-tabular text-[#A9D1FF]">
                    Total Defense: {totals.defense}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[13px] font-semibold text-white/80">Items in Bag</div>
                {player.inventory.length === 0 ? (
                  <div className="p-5 text-center rounded-[4px] bg-[#241642] text-[13px] text-white/65">
                    Your bag is empty. Visit The Crawl Market or Asteroid Mineshaft.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {player.inventory.map((entry) => {
                      const def = ITEMS[entry.itemId];
                      if (!def) return null;
                      const usable =
                        !state.combat &&
                        (def.type === 'weapon' ||
                          def.type === 'armor' ||
                          Boolean(def.healHp || def.restoreEnergy));
                      return (
                        <div
                          key={entry.itemId}
                          className="p-3 rounded-[4px] bg-[#241642] border border-white/10 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-[14px] font-bold text-white">
                              {def.name}{' '}
                              <span className="font-mono-tabular text-[12px] text-white/70">
                                x{entry.quantity}
                              </span>
                            </div>
                            <div className="text-[12px] text-white/75">{def.description}</div>
                          </div>
                          {usable && (
                            <BetterButton
                              label={def.type === 'weapon' || def.type === 'armor' ? 'Equip' : 'Use'}
                              variant="good"
                              onClick={() => onUseItem(entry.itemId)}
                              className="min-h-[32px] px-4 shrink-0"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'PLAN' && (
            <div className="space-y-3 text-[14px]">
              <p className="text-white/85">
                Complete any one of these three escape paths on the{' '}
                <strong className="text-white">Command &amp; Escape Deck</strong>:
              </p>

              <div className="p-3.5 rounded-[4px] bg-[#241642] border border-white/15 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>1. Hack Corporate Mainframe</span>
                  <span className={hasKeycard ? 'text-[#7CFFB2]' : 'text-white/55'}>
                    {hasKeycard ? '[Ready]' : '[Needs Keycard]'}
                  </span>
                </div>
                <p className="text-[13px] text-white/75">
                  Buy the Command Keycard from Raze at The Crawl Market, then broadcast the forged
                  warrant logs from the Escape Deck.
                </p>
              </div>

              <div className="p-3.5 rounded-[4px] bg-[#241642] border border-white/15 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>2. Slice Open the Escape Pod</span>
                  <span className={hasCutter ? 'text-[#7CFFB2]' : 'text-white/55'}>
                    {hasCutter ? '[Ready]' : '[Needs Plasma Cutter]'}
                  </span>
                </div>
                <p className="text-[13px] text-white/75">
                  Buy the Plasma Cutter from Raze at The Crawl Market, then breach the Escape Pod
                  hatch on the Escape Deck.
                </p>
              </div>

              <div className="p-3.5 rounded-[4px] bg-[#241642] border border-white/15 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>3. Hijack the Courier Shuttle</span>
                  <span className={flags.mechDefeated ? 'text-[#7CFFB2]' : 'text-white/55'}>
                    {flags.mechDefeated ? '[Ready]' : '[Defeat Boss Mech]'}
                  </span>
                </div>
                <p className="text-[13px] text-white/75">
                  Upgrade your weapon &amp; armor, stock EMP Charges, and defeat the Aegis-IX
                  Sentinel on the Escape Deck.
                </p>
              </div>
            </div>
          )}

          {tab === 'ACHIEVEMENTS' && (
            <div className="space-y-2">
              {ACHIEVEMENT_DEFS.map((ach) => {
                const unlocked = state.achievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-[4px] border flex items-center justify-between gap-3 ${
                      unlocked
                        ? 'bg-[#224b44]/60 border-[#387d71]'
                        : 'bg-[#241642] border-white/10 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="text-[14px] font-bold text-white">{ach.title}</div>
                      <div className="text-[12px] text-white/75">{ach.desc}</div>
                    </div>
                    <span
                      className={`text-[12px] font-mono-tabular font-bold shrink-0 ${
                        unlocked ? 'text-[#7CFFB2]' : 'text-white/45'
                      }`}
                    >
                      {unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
