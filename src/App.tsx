import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BagAndPlanModal } from './components/BagAndPlanModal';
import { BetterButton, LabeledProgressBar } from './components/BdccUiPrimitives';
import { CharacterCreator } from './components/CharacterCreator';
import { EndingScreen } from './components/EndingScreen';
import { LeftMapPanel } from './components/LeftMapPanel';
import { LiveCharacterStage } from './components/LiveCharacterStage';
import { MiningMinigame } from './components/MiningMinigame';
import { SaveLoadModal } from './components/SaveLoadModal';
import { TitleScreen } from './components/TitleScreen';
import {
  buyItem,
  claimFreeMeal,
  claimSponsorDrop,
  claimSponsorHeal,
  deliverCrystalToChen,
  healAtMedbay,
  moveToRoom,
  resolveMineShift,
  restInCell,
  runCombatMove,
  searchCellVent,
  sellAllCrystals,
  startFight,
  talkToNova,
  trainInYard,
  useInventoryItem,
} from './game/actions';
import { soundFx } from './game/audio';
import { crazyGames } from './game/crazygames';
import { ITEMS, MARKET_STOCK } from './game/data/items';
import { ART_ASSETS, ROOMS } from './game/data/world';
import {
  countItem,
  createNewGame,
  DEFAULT_APPEARANCE,
  getItemPrice,
  getLatestSave,
  getNextGoal,
  getPlayerTotals,
  loadAllSaves,
  makeLog,
  saveToSlot,
} from './game/engine';
import {
  GameState,
  RoomId,
  SaveSlotMeta,
  ScreenState,
  StageActivity,
  StageFxEvent,
} from './game/types';

interface BdccAction {
  id: string;
  label: string;
  subtext?: string;
  tooltip?: string;
  variant?: 'default' | 'accent' | 'danger' | 'good';
  disabled?: boolean;
  onClick: () => void;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('TITLE');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [latestSave, setLatestSave] = useState<SaveSlotMeta | null>(() => getLatestSave());
  const [drawerTab, setDrawerTab] = useState<'BAG' | 'PLAN' | 'ACHIEVEMENTS' | null>(null);
  const [saveModal, setSaveModal] = useState<'SAVE' | 'LOAD' | null>(null);
  const [muted, setMuted] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [miningActive, setMiningActive] = useState(false);
  const [fullArtOpen, setFullArtOpen] = useState(false);
  const [showRoomArt, setShowRoomArt] = useState(false);

  // Real-time live character stage animation state
  const [stageActivity, setStageActivity] = useState<StageActivity>('IDLE');
  const [stageLabel, setStageLabel] = useState('Standing in Cell C-14');
  const [fxEvent, setFxEvent] = useState<StageFxEvent | null>(null);
  const activityTimerRef = useRef<number | null>(null);
  const textEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize CrazyGames SDK v3 on mount
  useEffect(() => {
    crazyGames.init();
  }, []);

  // Track active gameplay state for CrazyGames QA
  useEffect(() => {
    if (screen === 'PLAYING' && !drawerTab && !saveModal) {
      crazyGames.gameplayStart();
    } else {
      crazyGames.gameplayStop();
    }
  }, [screen, drawerTab, saveModal]);

  useEffect(() => {
    textEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [gameState?.log.length]);

  useEffect(() => {
    if (screen === 'PLAYING' && gameState && !gameState.ending) {
      setLatestSave(saveToSlot('autosave', gameState));
    }
  }, [gameState, screen]);

  useEffect(() => {
    if (gameState?.currentRoomId !== 'market' || gameState?.combat) {
      setMarketOpen(false);
    }
    if (gameState?.currentRoomId !== 'mineshaft' || gameState?.combat) {
      setMiningActive(false);
    }
  }, [gameState?.currentRoomId, gameState?.combat]);

  const triggerActivity = (
    act: StageActivity,
    label: string,
    durationMs = 2400,
    idleFallback?: string
  ) => {
    if (activityTimerRef.current) {
      window.clearTimeout(activityTimerRef.current);
      activityTimerRef.current = null;
    }
    setStageActivity(act);
    setStageLabel(label);
    if (durationMs > 0) {
      activityTimerRef.current = window.setTimeout(() => {
        setStageActivity((curr) => (curr === 'FIGHTING' ? 'FIGHTING' : 'IDLE'));
        if (idleFallback) setStageLabel(idleFallback);
      }, durationMs);
    }
  };

  const triggerFx = (kind: StageFxEvent['kind'], label?: string, color?: string) => {
    setFxEvent({ id: Date.now() + Math.random(), kind, label, color });
  };

  // Sync live stage automatically when entering/exiting combat
  useEffect(() => {
    if (!gameState) return;
    if (gameState.combat) {
      if (activityTimerRef.current) window.clearTimeout(activityTimerRef.current);
      setStageActivity('FIGHTING');
      setStageLabel(`Fighting ${gameState.combat.enemyName}`);
    } else if (stageActivity === 'FIGHTING') {
      setStageActivity('IDLE');
      setStageLabel(`In ${ROOMS[gameState.currentRoomId].name}`);
    }
  }, [gameState?.combat?.enemyId, Boolean(gameState?.combat)]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundFx.setMuted(next);
    if (!next) soundFx.playClick();
  };

  const updateGame = (fn: (prev: GameState) => GameState) => {
    setGameState((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      if (next.ending && !prev.ending) {
        crazyGames.happytime();
        setScreen('ENDING');
      }
      return next;
    });
  };

  const handleTravel = (roomId: RoomId) => {
    if (!gameState || gameState.combat || gameState.currentRoomId === roomId) return;
    const destName = ROOMS[roomId].name;
    triggerActivity('WALKING', `Walking to ${destName}...`, 1500, `In ${destName}`);
    updateGame((prev) => moveToRoom(prev, roomId));
  };

  const handleCombatClick = (
    move: 'STRIKE' | 'POWER' | 'GUARD' | 'DISRUPT' | 'MED_GEL' | 'EMP' | 'RETREAT'
  ) => {
    if (!gameState) return;
    const res = runCombatMove(gameState, move);
    setGameState(res.state);

    if (move === 'STRIKE') {
      triggerFx('PLAYER_STRIKE', `-${res.playerDmgDealt}`, '#FFE08A');
    } else if (move === 'POWER') {
      triggerFx('PLAYER_POWER', `-${res.playerDmgDealt}!`, '#FF8DA8');
    } else if (move === 'GUARD') {
      triggerFx('PLAYER_GUARD', 'GUARD +25 EN', '#7CFFB2');
    } else if (move === 'DISRUPT' || move === 'EMP') {
      triggerFx('PLAYER_EMP', `-${res.playerDmgDealt} ZAP!`, '#7DD3FC');
    } else if (move === 'MED_GEL') {
      triggerFx('HEAL', '+50 HP', '#7CFFB2');
    }

    if (res.enemyDmgDealt > 0) {
      window.setTimeout(() => {
        triggerFx('ENEMY_HIT', `-${res.enemyDmgDealt}`, '#FF8DA8');
      }, 260);
    }
  };

  const handleLoadState = (loaded: GameState) => {
    // Ensure backwards compatibility if appearance missing
    const safeLoaded: GameState = {
      ...loaded,
      player: {
        ...loaded.player,
        appearance: loaded.player.appearance ?? DEFAULT_APPEARANCE,
      },
      achievements: loaded.achievements ?? [],
    };
    setGameState(safeLoaded);
    setStageActivity(safeLoaded.combat ? 'FIGHTING' : 'IDLE');
    setStageLabel(`In ${ROOMS[safeLoaded.currentRoomId].name}`);
    setScreen(safeLoaded.ending ? 'ENDING' : 'PLAYING');
  };

  const handleQuickSave = () => {
    if (!gameState) return;
    soundFx.playSuccess();
    saveToSlot('quicksave', gameState);
    updateGame((prev) => ({
      ...prev,
      log: [...prev.log.slice(-24), makeLog('good', 'Quick Save updated (F5).')],
    }));
  };

  const handleQuickLoad = () => {
    const saves = loadAllSaves();
    const target = saves.quicksave ?? saves.autosave;
    if (!target) {
      soundFx.playAlert();
      return;
    }
    soundFx.playSuccess();
    handleLoadState(target.state);
  };

  // Center bottom BetterButton grid
  const centerButtons = useMemo<BdccAction[]>(() => {
    if (!gameState) return [];
    const { player, currentRoomId, combat, flags } = gameState;
    const totals = getPlayerTotals(player);

    // 1. Combat buttons
    if (combat) {
      const medGels = countItem(player.inventory, 'med_gel');
      const emps = countItem(player.inventory, 'emp_bomb');
      const list: BdccAction[] = [
        {
          id: 'c_strike',
          label: 'Strike',
          subtext: `Free · ~${Math.max(5, totals.attack - combat.enemyDefense)} dmg`,
          variant: 'accent',
          onClick: () => handleCombatClick('STRIKE'),
        },
        {
          id: 'c_power',
          label: 'Power Hit',
          subtext: '-20 EN · Stun?',
          variant: 'danger',
          disabled: player.energy < 20,
          onClick: () => handleCombatClick('POWER'),
        },
        {
          id: 'c_guard',
          label: 'Guard',
          subtext: '+25 EN · Block 60%',
          variant: 'good',
          onClick: () => handleCombatClick('GUARD'),
        },
        {
          id: 'c_disrupt',
          label: 'Disrupt',
          subtext: '-15 EN · Stun Bot',
          disabled: player.energy < 15,
          onClick: () => handleCombatClick('DISRUPT'),
        },
      ];
      if (medGels > 0) {
        list.push({
          id: 'c_med',
          label: `Med-Gel (${medGels})`,
          subtext: '+50 Health',
          variant: 'good',
          onClick: () => handleCombatClick('MED_GEL'),
        });
      }
      if (emps > 0) {
        list.push({
          id: 'c_emp',
          label: `EMP (${emps})`,
          subtext: combat.isMech ? '70 dmg + Stun!' : '35 dmg + Stun',
          variant: 'accent',
          onClick: () => handleCombatClick('EMP'),
        });
      }
      list.push({
        id: 'c_retreat',
        label: 'Retreat',
        subtext: 'Back to Hub',
        onClick: () => handleCombatClick('RETREAT'),
      });
      return list;
    }

    // 2. Market trade view
    if (currentRoomId === 'market' && marketOpen) {
      const crystalCount = countItem(player.inventory, 'crystal');
      const list: BdccAction[] = MARKET_STOCK.map((itemId) => {
        const def = ITEMS[itemId];
        const price = getItemPrice(player, itemId);
        const owned =
          (def.type === 'key' && countItem(player.inventory, itemId) > 0) ||
          player.weaponId === itemId ||
          player.armorId === itemId;
        return {
          id: `buy_${itemId}`,
          label: def.name,
          subtext: owned ? 'Owned' : `${price} cr`,
          tooltip: def.description,
          variant: def.type === 'key' ? 'accent' : 'default',
          disabled: owned || player.credits < price,
          onClick: () => {
            triggerActivity('TALKING', `Trading with Raze`, 1800, 'In The Crawl Market');
            updateGame((prev) => buyItem(prev, itemId));
          },
        };
      });
      if (crystalCount > 0) {
        list.push({
          id: 'sell_crystals',
          label: `Sell Crystals (${crystalCount})`,
          subtext: `+${crystalCount * ITEMS.crystal.sellPrice} cr`,
          variant: 'good',
          onClick: () => {
            triggerActivity('TALKING', 'Selling Crystals to Raze', 1800, 'In The Crawl Market');
            triggerFx('SPARK', `+${crystalCount * ITEMS.crystal.sellPrice} cr`, '#7CFFB2');
            updateGame(sellAllCrystals);
          },
        });
      }
      list.push({
        id: 'close_market',
        label: 'Back',
        subtext: 'Close stall',
        onClick: () => {
          soundFx.playClick();
          setMarketOpen(false);
        },
      });
      return list;
    }

    // 3. Sector room actions
    const actions: BdccAction[] = [];
    const crystalCount = countItem(player.inventory, 'crystal');
    const hasKeycard = countItem(player.inventory, 'keycard') > 0;
    const hasCutter = countItem(player.inventory, 'plasma_cutter') > 0;

    if (currentRoomId === 'cell') {
      actions.push({
        id: 'sleep',
        label: 'Sleep on Bunk',
        subtext: '100% HP & Energy',
        variant: 'good',
        onClick: () => {
          triggerActivity('SLEEPING', 'Sleeping until dawn...', 3200, 'Awake in Cell C-14');
          triggerFx('HEAL', '100% RESTED', '#7CFFB2');
          crazyGames.requestMidgameAd(() => updateGame(restInCell));
        },
      });
      if (!flags.ventLooted) {
        actions.push({
          id: 'vent',
          label: 'Search Vent',
          subtext: 'Check loose grate',
          variant: 'accent',
          onClick: () => {
            triggerFx('SPARK', '+45 cr!', '#FFD27D');
            updateGame(searchCellVent);
          },
        });
      }
      actions.push({
        id: 'go_hub',
        label: 'Walk to Hub',
        subtext: 'Central Hub',
        onClick: () => handleTravel('hub'),
      });
    }

    if (currentRoomId === 'hub') {
      actions.push({
        id: 'nova',
        label: 'Talk to Nova',
        subtext: 'Escape routes',
        variant: 'accent',
        onClick: () => {
          triggerActivity('TALKING', 'Talking with Nova', 3500, 'In Central Hub');
          updateGame(talkToNova);
        },
      });
      actions.push({
        id: 'meal',
        label: flags.freeMealUsedToday ? 'Meal Claimed' : 'Eat Free Meal',
        subtext: flags.freeMealUsedToday ? 'Resets on sleep' : '+25 HP · +50 EN',
        variant: 'good',
        disabled: flags.freeMealUsedToday,
        onClick: () => {
          triggerActivity('EATING', 'Eating hot ration tray...', 3000, 'In Central Hub');
          triggerFx('HEAL', '+50 EN', '#7DD3FC');
          updateGame(claimFreeMeal);
        },
      });
      if (!flags.sponsorDropUsedToday) {
        actions.push({
          id: 'sponsor_drop',
          label: 'Supply Drop',
          subtext: 'Bonus +65 cr',
          variant: 'accent',
          onClick: () => {
            crazyGames.requestRewardedAd(() => {
              triggerFx('SPARK', '+65 cr!', '#FFD27D');
              updateGame(claimSponsorDrop);
            });
          },
        });
      }
      actions.push({
        id: 'hub_mines',
        label: 'Mineshaft',
        subtext: 'Mine & minigame',
        onClick: () => handleTravel('mineshaft'),
      });
      actions.push({
        id: 'hub_market',
        label: 'Black Market',
        subtext: 'Gear & keys',
        onClick: () => handleTravel('market'),
      });
      actions.push({
        id: 'hub_yard',
        label: 'Fight Yard',
        subtext: 'Train & fight',
        onClick: () => handleTravel('yard'),
      });
      actions.push({
        id: 'hub_medbay',
        label: 'Medbay',
        subtext: 'Heal & Med-Gel',
        onClick: () => handleTravel('medbay'),
      });
      actions.push({
        id: 'hub_escape',
        label: 'Escape Deck',
        subtext: '3 Escape paths',
        variant: hasKeycard || hasCutter || flags.mechDefeated ? 'accent' : 'default',
        onClick: () => handleTravel('command'),
      });
      actions.push({
        id: 'hub_cell',
        label: 'Cell C-14',
        subtext: 'Sleep for free',
        onClick: () => handleTravel('cell'),
      });
    }

    if (currentRoomId === 'mineshaft') {
      actions.push({
        id: 'mine',
        label: 'Mine Asteroid Ore',
        subtext: '-25 EN · Timing Bar!',
        variant: 'accent',
        disabled: player.energy < 25,
        onClick: () => {
          soundFx.playClick();
          triggerActivity('MINING', 'Calibrating Asteroid Drill...', 0);
          setMiningActive(true);
        },
      });
      if (crystalCount > 0) {
        actions.push({
          id: 'to_market',
          label: `Sell Crystals (${crystalCount})`,
          subtext: 'Go to Market',
          variant: 'good',
          onClick: () => {
            handleTravel('market');
            setMarketOpen(true);
          },
        });
      }
      actions.push({
        id: 'back_hub',
        label: 'Central Hub',
        subtext: 'Return',
        onClick: () => handleTravel('hub'),
      });
    }

    if (currentRoomId === 'medbay') {
      actions.push({
        id: 'heal',
        label: 'Auto-Doc Heal',
        subtext: '25 cr · 100% HP',
        variant: 'good',
        disabled: player.hp >= player.maxHp || player.credits < 25,
        onClick: () => {
          triggerActivity('HEALING', 'Medical Nano-Beam Active', 2600, 'In Medical Bay');
          triggerFx('HEAL', '100% HP', '#7CFFB2');
          updateGame(healAtMedbay);
        },
      });
      if (player.hp < player.maxHp || player.energy < player.maxEnergy) {
        actions.push({
          id: 'sponsor_heal',
          label: 'Nano-Pod Restore',
          subtext: 'Free Full HP & EN',
          variant: 'accent',
          onClick: () => {
            crazyGames.requestRewardedAd(() => {
              triggerActivity('HEALING', 'Nano-Pod Restoring...', 2600, 'In Medical Bay');
              triggerFx('HEAL', 'FULL RESTORE', '#7CFFB2');
              updateGame(claimSponsorHeal);
            });
          },
        });
      }
      const gelPrice = getItemPrice(player, 'med_gel');
      actions.push({
        id: 'buy_gel',
        label: 'Buy Med-Gel',
        subtext: `${gelPrice} cr · +50 HP`,
        disabled: player.credits < gelPrice,
        onClick: () => updateGame((prev) => buyItem(prev, 'med_gel')),
      });
      if (!flags.chenQuestDone) {
        actions.push({
          id: 'chen',
          label: crystalCount > 0 ? 'Give Crystal' : 'Talk to Dr. Chen',
          subtext: crystalCount > 0 ? '+95 cr & 2 Med-Gel' : 'Side job',
          variant: crystalCount > 0 ? 'accent' : 'default',
          onClick: () => {
            triggerActivity('TALKING', 'Talking with Dr. Chen', 3000, 'In Medical Bay');
            updateGame(deliverCrystalToChen);
          },
        });
      }
      actions.push({
        id: 'back_hub',
        label: 'Central Hub',
        subtext: 'Return',
        onClick: () => handleTravel('hub'),
      });
    }

    if (currentRoomId === 'yard') {
      actions.push({
        id: 'train',
        label: 'Lift Weights',
        subtext: '-25 EN · +1 ATK',
        variant: 'good',
        disabled: player.energy < 25,
        onClick: () => {
          triggerActivity('TRAINING', 'Lifting Gravity Weights...', 2800, 'In Fight Yard');
          triggerFx('SPARK', '+1 ATK!', '#7DD3FC');
          updateGame(trainInYard);
        },
      });
      actions.push({
        id: 'fight_bruiser',
        label: 'Fight Bruiser',
        subtext: '+38 cr · Energy Bar',
        variant: 'accent',
        onClick: () => updateGame((prev) => startFight(prev, 'bruiser')),
      });
      actions.push({
        id: 'fight_krag',
        label: 'Challenge Krag',
        subtext: '+110 cr · EMP',
        variant: 'danger',
        onClick: () => updateGame((prev) => startFight(prev, 'krag')),
      });
      actions.push({
        id: 'back_hub',
        label: 'Central Hub',
        subtext: 'Return',
        onClick: () => handleTravel('hub'),
      });
    }

    if (currentRoomId === 'market') {
      actions.push({
        id: 'open_trade',
        label: 'Trade with Raze',
        subtext: 'Gear, EMP & Keys',
        variant: 'accent',
        onClick: () => {
          soundFx.playClick();
          triggerActivity('TALKING', 'Browsing Raze’s Stall', 3000, 'In The Crawl Market');
          setMarketOpen(true);
        },
      });
      if (crystalCount > 0) {
        actions.push({
          id: 'quick_sell',
          label: `Sell ${crystalCount} Crystal${crystalCount > 1 ? 's' : ''}`,
          subtext: `+${crystalCount * ITEMS.crystal.sellPrice} cr`,
          variant: 'good',
          onClick: () => {
            triggerActivity('TALKING', 'Selling Crystals to Raze', 2000, 'In The Crawl Market');
            triggerFx('SPARK', `+${crystalCount * ITEMS.crystal.sellPrice} cr`, '#7CFFB2');
            updateGame(sellAllCrystals);
          },
        });
      }
      actions.push({
        id: 'back_hub',
        label: 'Central Hub',
        subtext: 'Return',
        onClick: () => handleTravel('hub'),
      });
    }

    if (currentRoomId === 'command') {
      actions.push({
        id: 'end_hack',
        label: 'Hack Mainframe',
        subtext: hasKeycard ? 'Escape Now!' : 'Needs Keycard',
        variant: hasKeycard ? 'accent' : 'default',
        disabled: !hasKeycard,
        onClick: () => {
          soundFx.playSuccess();
          updateGame((prev) => ({
            ...prev,
            achievements: prev.achievements.includes('escaped')
              ? prev.achievements
              : [...prev.achievements, 'escaped'],
            ending: 'EXONERATION',
          }));
        },
      });
      actions.push({
        id: 'end_pod',
        label: 'Cut Escape Pod',
        subtext: hasCutter ? 'Escape Now!' : 'Needs Cutter',
        variant: hasCutter ? 'good' : 'default',
        disabled: !hasCutter,
        onClick: () => {
          soundFx.playSuccess();
          updateGame((prev) => ({
            ...prev,
            achievements: prev.achievements.includes('escaped')
              ? prev.achievements
              : [...prev.achievements, 'escaped'],
            ending: 'POD_ESCAPE',
          }));
        },
      });
      if (!flags.mechDefeated) {
        actions.push({
          id: 'fight_mech',
          label: 'Fight Aegis-IX',
          subtext: 'Boss Mech',
          variant: 'danger',
          onClick: () => updateGame((prev) => startFight(prev, 'aegis_mech', true)),
        });
      } else {
        actions.push({
          id: 'end_shuttle',
          label: 'Launch Shuttle',
          subtext: 'Escape Now!',
          variant: 'accent',
          onClick: () => {
            soundFx.playSuccess();
            updateGame((prev) => ({
              ...prev,
              achievements: prev.achievements.includes('escaped')
                ? prev.achievements
                : [...prev.achievements, 'escaped'],
              ending: 'SHUTTLE_HIJACK',
            }));
          },
        });
      }
      actions.push({
        id: 'back_hub',
        label: 'Central Hub',
        subtext: 'Return',
        onClick: () => handleTravel('hub'),
      });
    }

    return actions;
  }, [gameState, marketOpen]);

  // Hotkeys: 1-9 for BetterButtons, F5 Quick Save, F9 Quick Load, I Inventory, C Menu
  useEffect(() => {
    if (screen !== 'PLAYING' || !gameState || drawerTab || saveModal || miningActive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'F5') {
        e.preventDefault();
        handleQuickSave();
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleQuickLoad();
        return;
      }
      if (e.key.toLowerCase() === 'i') {
        setDrawerTab('BAG');
        return;
      }
      if (e.key.toLowerCase() === 'c') {
        setSaveModal('SAVE');
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 9 && centerButtons[n - 1] && !centerButtons[n - 1].disabled) {
        e.preventDefault();
        centerButtons[n - 1].onClick();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, gameState, drawerTab, saveModal, miningActive, centerButtons]);

  if (screen === 'TITLE') {
    return (
      <>
        <TitleScreen
          latestSave={latestSave}
          onNewGame={() => {
            soundFx.playClick();
            setScreen('CREATE');
          }}
          onContinue={(save) => {
            soundFx.playSuccess();
            handleLoadState(save.state);
          }}
          onOpenLoad={() => {
            soundFx.playClick();
            setSaveModal('LOAD');
          }}
        />
        {saveModal && (
          <SaveLoadModal
            mode={saveModal}
            currentState={gameState}
            onClose={() => setSaveModal(null)}
            onLoadState={handleLoadState}
          />
        )}
      </>
    );
  }

  if (screen === 'CREATE') {
    return (
      <CharacterCreator
        onBack={() => setScreen('TITLE')}
        onStart={(name, archetype, appearance) => {
          const fresh = createNewGame(name, archetype, appearance);
          setGameState(fresh);
          setStageActivity('IDLE');
          setStageLabel('Standing in Cell C-14');
          setScreen('PLAYING');
        }}
      />
    );
  }

  if (screen === 'ENDING' && gameState && gameState.ending) {
    return (
      <EndingScreen
        state={gameState}
        ending={gameState.ending}
        onPlayAgain={() => {
          soundFx.playClick();
          setScreen('CREATE');
        }}
      />
    );
  }

  if (!gameState) return null;

  const { player, currentRoomId, combat } = gameState;
  const room = ROOMS[currentRoomId];
  const totals = getPlayerTotals(player);
  const nextGoal = getNextGoal(gameState);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#3F3E7D] text-[#F4F4FA] flex flex-col lg:flex-row">
      {/* LEFT PANEL (#35225D rounded-r-2xl) */}
      <aside className="w-full lg:w-[268px] shrink-0 bg-[#35225D] lg:rounded-r-[16px] p-3 flex flex-col justify-between gap-2.5 overflow-y-auto">
        <div className="space-y-2">
          {combat ? (
            <div className="p-2.5 rounded-[4px] bg-[#241642] border border-white/15 space-y-2">
              <div className="text-[20px] font-bold text-white bdcc-outlined leading-tight">
                {combat.enemyName}
              </div>
              <div className="text-[12px] text-white/75">
                {combat.enemyTitle} · DEF {combat.enemyDefense}
                {combat.isMech ? ' · Mech' : ''}
              </div>
              <LabeledProgressBar
                label="Enemy HP"
                value={combat.enemyHp}
                max={combat.enemyMaxHp}
                fillStyle="crimson"
              />
              <div
                className={`text-[13px] font-semibold pt-0.5 ${
                  combat.enemyStunned
                    ? 'text-[#7CFFB2]'
                    : combat.enemyIntent === 'HEAVY'
                    ? 'text-[#FF8DA8]'
                    : 'text-[#FFD27D]'
                }`}
              >
                {combat.enemyStunned
                  ? 'Stunned (Skips Turn)'
                  : combat.enemyIntent === 'HEAVY'
                  ? `Next: Heavy Hit (~${Math.max(
                      3,
                      Math.round(combat.enemyAttack * 1.45) - totals.defense
                    )} dmg)`
                  : combat.enemyIntent === 'GUARD'
                  ? 'Next: Guarding'
                  : `Next: Strike (~${Math.max(3, combat.enemyAttack - totals.defense)} dmg)`}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-[4px] bg-[#241642] border border-white/15 space-y-1">
              <div className="text-[12px] font-bold text-[#FFD27D]">Current Objective</div>
              <div className="text-[15px] font-bold text-white leading-snug">{nextGoal.title}</div>
              <p className="text-[12px] text-white/80 leading-snug">{nextGoal.hint}</p>
            </div>
          )}
        </div>

        <LeftMapPanel
          currentRoomId={currentRoomId}
          day={gameState.day}
          hour={gameState.hour}
          disabled={Boolean(combat) || miningActive}
          onTravel={handleTravel}
        />

        <div className="space-y-1.5 pt-1">
          <div className="grid grid-cols-2 gap-1.5">
            <BetterButton
              label="Q.save"
              tooltip="Quick save (F5)"
              onClick={handleQuickSave}
              className="min-h-[32px] py-1"
            />
            <BetterButton
              label="Q.load"
              tooltip="Quick load (F9)"
              onClick={handleQuickLoad}
              className="min-h-[32px] py-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <BetterButton
              label="Escape"
              tooltip="View the 3 escape paths"
              onClick={() => {
                soundFx.playClick();
                setDrawerTab('PLAN');
              }}
              className="min-h-[32px] py-1 px-1"
            />
            <BetterButton
              label="Menu"
              tooltip="Save / Load / Main Menu (C)"
              onClick={() => {
                soundFx.playClick();
                setSaveModal('SAVE');
              }}
              className="min-h-[32px] py-1 px-1"
            />
            <BetterButton
              label={muted ? 'Muted' : 'Sound'}
              tooltip="Toggle audio"
              onClick={toggleMute}
              className="min-h-[32px] py-1 px-1"
            />
          </div>
        </div>
      </aside>

      {/* CENTER — MainScreenBoxContainer (#3F3E7D) */}
      <main className="flex-1 flex flex-col min-w-0 h-full px-4 py-3 gap-3 overflow-hidden">
        {/* Compact mobile bar + live stage preview below lg */}
        <div className="lg:hidden space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[4px] bg-[#35225D] text-[13px]">
            <div className="font-mono-tabular flex items-center gap-3 text-white">
              <span>HP {player.hp}/{player.maxHp}</span>
              <span>EN {player.energy}/{player.maxEnergy}</span>
              <span className="text-[#FFD27D] font-bold">{player.credits} cr</span>
            </div>
            <BetterButton
              label="Bag"
              onClick={() => setDrawerTab('BAG')}
              className="min-h-[28px] px-3 py-0.5"
            />
          </div>
          <LiveCharacterStage
            roomId={currentRoomId}
            activity={stageActivity}
            activityLabel={stageLabel}
            appearance={player.appearance}
            weaponId={player.weaponId}
            armorId={player.armorId}
            combat={combat}
            fxEvent={fxEvent}
            compact
          />
        </div>

        {/* Top subtle scene bar */}
        <div className="flex items-center justify-between gap-2 text-[13px] text-white/80 shrink-0">
          <div className="font-bold text-[17px] text-white bdcc-text-shadow truncate">
            {room.name} — <span className="font-normal text-white/80">{room.role}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowRoomArt((v) => !v)}
            className="text-[12px] text-white/75 hover:text-white underline cursor-pointer shrink-0"
          >
            {showRoomArt ? 'Hide Backdrop Art' : 'Show Backdrop Art'}
          </button>
        </div>

        {/* Scrollable Narrative Feed */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {showRoomArt && (
            <div className="relative rounded-[4px] overflow-hidden border border-black/35 bg-[#241F52]">
              <img
                src={ART_ASSETS[room.artKey]}
                alt={room.name}
                referrerPolicy="no-referrer"
                className="w-full h-36 sm:h-40 object-cover"
              />
              <button
                type="button"
                onClick={() => setFullArtOpen(true)}
                className="absolute bottom-2 right-2 px-2.5 py-1 text-[11px] font-semibold bg-black/60 hover:bg-black/80 text-white rounded-[3px] cursor-pointer"
              >
                Expand
              </button>
            </div>
          )}

          <p className="text-[16px] leading-relaxed text-[#F5F5FF] bdcc-text-shadow">
            {room.description}
          </p>

          <div className="space-y-2.5 pt-1">
            {gameState.log.map((entry) => {
              let toneClass = 'text-[#F4F4FA]';
              if (entry.tone === 'good') toneClass = 'text-[#8FFFD0]';
              if (entry.tone === 'warn') toneClass = 'text-[#FF9EB5]';
              if (entry.tone === 'combat') toneClass = 'text-[#FFE08A]';
              return (
                <p
                  key={entry.id}
                  className={`text-[15.5px] leading-[1.6] bdcc-text-shadow ${toneClass}`}
                >
                  {entry.speaker && (
                    <span className="font-bold text-[#FFD27D] mr-1.5">{entry.speaker}:</span>
                  )}
                  {entry.text}
                </p>
              );
            })}
            <div ref={textEndRef} />
          </div>
        </div>

        {/* Bottom Interactive Area: Mining Minigame OR Authentic BetterButton Grid */}
        <div className="shrink-0 pt-2 border-t border-white/15">
          {miningActive ? (
            <MiningMinigame
              onCancel={() => {
                setMiningActive(false);
                setStageActivity('IDLE');
                setStageLabel('In Asteroid Mineshaft');
              }}
              onResolve={(quality) => {
                setMiningActive(false);
                const res = resolveMineShift(gameState, quality);
                setGameState(res.state);
                if (!res.ambush) {
                  triggerActivity('MINING', quality === 'CRIT' ? 'CRITICAL ORE HIT!' : 'Cracking Ore Seam...', 1800, 'In Asteroid Mineshaft');
                  triggerFx(
                    'SPARK',
                    quality === 'CRIT' ? `CRIT +${res.credits} cr!` : `+${res.credits} cr`,
                    quality === 'CRIT' ? '#FFD27D' : '#8FFFD0'
                  );
                }
              }}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
              {centerButtons.map((btn, idx) => (
                <BetterButton
                  key={btn.id}
                  label={btn.label}
                  subtext={btn.subtext}
                  tooltip={btn.tooltip}
                  hotkey={idx < 9 ? String(idx + 1) : undefined}
                  variant={btn.variant}
                  disabled={btn.disabled}
                  onClick={btn.onClick}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* RIGHT PANEL — Authentic PlayerPanel + LIVE Realistic Skeletal Character Stage */}
      <aside className="hidden lg:flex w-[308px] shrink-0 bg-[#35225D] rounded-l-[16px] p-3.5 flex-col gap-2 overflow-y-auto">
        <div className="text-[24px] font-bold text-white bdcc-outlined leading-tight truncate">
          {player.name}
        </div>

        <LabeledProgressBar
          label={`Level ${player.level}`}
          value={player.xp}
          max={player.xpToNext}
          fillStyle="blue"
        />
        <LabeledProgressBar
          label="Health"
          value={player.hp}
          max={player.maxHp}
          fillStyle="crimson"
        />
        <LabeledProgressBar
          label="Energy"
          value={player.energy}
          max={player.maxEnergy}
          fillStyle="blue"
        />

        <div className="pt-0.5 text-[14px] text-white space-y-0.5">
          <div className="flex items-center justify-between">
            <span>Credits:</span>
            <span className="font-mono-tabular font-bold text-[#FFD27D]">{player.credits} cr</span>
          </div>
          <div className="flex items-center justify-between text-[13px] text-white/85">
            <span>Attack / Defense:</span>
            <span className="font-mono-tabular">
              {totals.attack} / {totals.defense}
            </span>
          </div>
        </div>

        {/* REAL-TIME LIVE ANIMATED CHARACTER STAGE (Walking, Eating, Sleeping, Mining, Fighting, Talking!) */}
        <div className="mt-1">
          <LiveCharacterStage
            roomId={currentRoomId}
            activity={stageActivity}
            activityLabel={stageLabel}
            appearance={player.appearance}
            weaponId={player.weaponId}
            armorId={player.armorId}
            combat={combat}
            fxEvent={fxEvent}
          />
        </div>

        {/* Equipped Loadout Quick Readout */}
        <div className="px-2.5 py-2 rounded-[4px] bg-[#241642] border border-white/10 text-[12px] text-white/85 space-y-0.5">
          <div className="truncate">
            Weapon:{' '}
            <span className="font-semibold text-white">
              {player.weaponId ? ITEMS[player.weaponId]?.name : 'Fists'}
            </span>
          </div>
          <div className="truncate">
            Armor:{' '}
            <span className="font-semibold text-white">
              {player.armorId ? ITEMS[player.armorId]?.name : 'Standard Jumpsuit'}
            </span>
          </div>
        </div>

        {/* Bottom PlayerPanel Buttons */}
        <div className="grid grid-cols-2 gap-1.5 mt-auto">
          <BetterButton
            label={`Bag (${player.inventory.reduce((s, i) => s + i.quantity, 0)})`}
            tooltip="Open Inventory (I)"
            onClick={() => {
              soundFx.playClick();
              setDrawerTab('BAG');
            }}
            className="min-h-[34px] py-1"
          />
          <BetterButton
            label={`Medals (${gameState.achievements.length}/6)`}
            tooltip="View Achievements"
            onClick={() => {
              soundFx.playClick();
              setDrawerTab('ACHIEVEMENTS');
            }}
            className="min-h-[34px] py-1"
          />
        </div>
      </aside>

      {/* Modals */}
      {drawerTab && (
        <BagAndPlanModal
          tab={drawerTab}
          state={gameState}
          onSwitchTab={setDrawerTab}
          onUseItem={(itemId) => {
            const def = ITEMS[itemId];
            if (def?.restoreEnergy) {
              triggerActivity('EATING', 'Eating Energy Bar...', 2000, `In ${room.name}`);
              triggerFx('HEAL', `+${def.restoreEnergy} EN`, '#7DD3FC');
            } else if (def?.healHp) {
              triggerActivity('HEALING', 'Applying Med-Gel...', 2000, `In ${room.name}`);
              triggerFx('HEAL', `+${def.healHp} HP`, '#7CFFB2');
            }
            updateGame((prev) => useInventoryItem(prev, itemId));
          }}
          onClose={() => setDrawerTab(null)}
        />
      )}

      {saveModal && (
        <SaveLoadModal
          mode={saveModal}
          currentState={gameState}
          onClose={() => setSaveModal(null)}
          onLoadState={handleLoadState}
          onReturnTitle={() => setScreen('TITLE')}
        />
      )}

      {fullArtOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setFullArtOpen(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={ART_ASSETS[room.artKey]}
              alt={room.name}
              referrerPolicy="no-referrer"
              className="w-full max-h-[82vh] object-contain rounded-[4px] border-2 border-[#6B54A3]"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[16px] font-bold text-white">{room.name}</span>
              <BetterButton label="Close" onClick={() => setFullArtOpen(false)} className="px-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
