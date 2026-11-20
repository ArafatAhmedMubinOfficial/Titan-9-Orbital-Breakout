import { ARCHETYPES, ENEMIES } from './data/characters';
import { ITEMS } from './data/items';
import { ROOMS } from './data/world';
import {
  ArchetypeId,
  CharacterAppearance,
  CombatState,
  GameState,
  InventoryItem,
  LogEntry,
  PlayerState,
  SaveSlotMeta,
} from './types';

export const SAVE_STORAGE_KEY = 'titan9_orbital_saves_v1';

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  suitColor: '#D97706',
  hairStyle: 'short',
  skinTone: '#E0AC88',
};

export function makeLog(
  tone: LogEntry['tone'],
  text: string,
  speaker?: string
): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tone,
    speaker,
    text,
  };
}

export function countItem(inv: InventoryItem[], itemId: string): number {
  return inv.find((i) => i.itemId === itemId)?.quantity ?? 0;
}

export function addItem(inv: InventoryItem[], itemId: string, qty = 1): InventoryItem[] {
  const next = inv.map((i) => ({ ...i }));
  const found = next.find((i) => i.itemId === itemId);
  if (found) found.quantity += qty;
  else next.push({ itemId, quantity: qty });
  return next;
}

export function removeItem(inv: InventoryItem[], itemId: string, qty = 1): InventoryItem[] {
  const next: InventoryItem[] = [];
  for (const item of inv) {
    if (item.itemId === itemId) {
      if (item.quantity - qty > 0) {
        next.push({ itemId: item.itemId, quantity: item.quantity - qty });
      }
    } else {
      next.push({ ...item });
    }
  }
  return next;
}

export function getPlayerTotals(player: PlayerState): { attack: number; defense: number } {
  const weaponBonus = player.weaponId ? ITEMS[player.weaponId]?.attackBonus ?? 0 : 0;
  const armorBonus = player.armorId ? ITEMS[player.armorId]?.defenseBonus ?? 0 : 0;
  return {
    attack: player.baseAttack + weaponBonus,
    defense: player.baseDefense + armorBonus,
  };
}

export function getItemPrice(player: PlayerState, itemId: string): number {
  const def = ITEMS[itemId];
  if (!def) return 0;
  let price = def.price;
  if (player.archetype === 'smuggler') price = Math.round(price * 0.8);
  if (player.archetype === 'hacker' && itemId === 'keycard') price = Math.round(price * 0.7);
  if (player.archetype === 'mechanic' && itemId === 'plasma_cutter') price = Math.round(price * 0.7);
  return price;
}

export function createNewGame(
  name: string,
  archetypeId: ArchetypeId,
  appearance: CharacterAppearance = DEFAULT_APPEARANCE
): GameState {
  const arch = ARCHETYPES.find((a) => a.id === archetypeId) ?? ARCHETYPES[0];

  const player: PlayerState = {
    name: name.trim() || 'Alex Mercer',
    archetype: arch.id,
    appearance,
    level: 1,
    xp: 0,
    xpToNext: 100,
    hp: arch.hp,
    maxHp: arch.hp,
    energy: arch.energy,
    maxEnergy: arch.energy,
    baseAttack: arch.attack,
    baseDefense: arch.defense,
    credits: arch.credits,
    weaponId: arch.id === 'brawler' ? 'hydro_wrench' : null,
    armorId: null,
    inventory: arch.startingItems.map((i) => ({ ...i })),
  };

  return {
    day: 1,
    hour: 7,
    currentRoomId: 'cell',
    player,
    combat: null,
    flags: {
      ventLooted: false,
      freeMealUsedToday: false,
      kragDefeated: false,
      mechDefeated: false,
      chenQuestDone: false,
      novaBriefed: false,
      sponsorDropUsedToday: false,
    },
    achievements: [],
    log: [
      makeLog(
        'story',
        `Welcome to Titan-9 Orbital Penitentiary, ${player.name}. Framed on a forged corporate warrant and locked above the rings, your goal is clear: earn credits, upgrade your gear, and break free.`
      ),
      makeLog(
        'dialogue',
        '"Step out into Central Hub whenever you’re ready. Mine asteroid ore, fight in the Yard, trade on The Crawl, or plan your escape on the Escape Deck."',
        'Nova'
      ),
    ],
    stats: {
      fightsWon: 0,
      shiftsWorked: 0,
      creditsEarned: arch.credits,
      criticalMines: 0,
    },
    ending: null,
  };
}

export function grantXp(player: PlayerState, amount: number): {
  player: PlayerState;
  leveledUp: boolean;
} {
  let xp = player.xp + amount;
  let level = player.level;
  let xpToNext = player.xpToNext;
  let maxHp = player.maxHp;
  let maxEnergy = player.maxEnergy;
  let baseAttack = player.baseAttack;
  let baseDefense = player.baseDefense;
  let leveledUp = false;

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = Math.round(xpToNext * 1.4);
    maxHp += 12;
    maxEnergy += 10;
    baseAttack += 2;
    baseDefense += 1;
    leveledUp = true;
  }

  return {
    player: {
      ...player,
      level,
      xp,
      xpToNext,
      maxHp,
      maxEnergy,
      baseAttack,
      baseDefense,
      hp: leveledUp ? maxHp : player.hp,
      energy: leveledUp ? maxEnergy : player.energy,
    },
    leveledUp,
  };
}

export function createCombat(enemyKey: string, isBoss = false): {
  combat: CombatState;
  intro: string;
} {
  const def = ENEMIES[enemyKey] ?? ENEMIES.bruiser;
  return {
    combat: {
      enemyId: def.id,
      enemyName: def.name,
      enemyTitle: def.title,
      enemyHp: def.maxHp,
      enemyMaxHp: def.maxHp,
      enemyAttack: def.attack,
      enemyDefense: def.defense,
      isMech: Boolean(def.isMech),
      enemyStunned: false,
      enemyIntent: 'STRIKE',
      turn: 1,
      isBoss,
    },
    intro: def.intro,
  };
}

export function getNextGoal(state: GameState): { title: string; hint: string } {
  const { player, flags } = state;
  const hasKey = countItem(player.inventory, 'keycard') > 0;
  const hasCutter = countItem(player.inventory, 'plasma_cutter') > 0;

  if (flags.mechDefeated || hasKey || hasCutter) {
    return {
      title: 'Ready to Escape!',
      hint: 'Travel to the Escape Deck to trigger your breakout ending.',
    };
  }
  if (player.hp < player.maxHp * 0.4) {
    return {
      title: 'Patch Up Your Health',
      hint: 'Sleep for free in Your Cell or visit Dr. Chen in Medbay.',
    };
  }
  if (player.energy < 25) {
    return {
      title: 'Recharge Energy',
      hint: 'Sleep in Your Cell or grab a free meal in Central Hub.',
    };
  }
  if (player.credits >= 190) {
    return {
      title: 'Buy an Escape Tool',
      hint: 'Visit the Black Market for a Command Keycard, Plasma Cutter, or top-tier combat gear.',
    };
  }
  if (!player.weaponId && player.credits >= 55) {
    return {
      title: 'Upgrade Your Gear',
      hint: 'Visit the Black Market to equip a Heavy Wrench or Mining Vest.',
    };
  }
  return {
    title: 'Earn Credits & Gear Up',
    hint: 'Mine crystals in the Mineshaft, fight in the Yard, or sell Crystals to Raze.',
  };
}

export function loadAllSaves(): Record<string, SaveSlotMeta> {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SaveSlotMeta>;
  } catch {
    return {};
  }
}

export function saveToSlot(slotId: string, state: GameState): SaveSlotMeta {
  const saves = loadAllSaves();
  const meta: SaveSlotMeta = {
    slotId,
    savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    name: state.player.name,
    day: state.day,
    level: state.player.level,
    roomName: ROOMS[state.currentRoomId]?.shortName ?? 'Station',
    state,
  };
  saves[slotId] = meta;
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saves));
  } catch {
    // ignore
  }
  return meta;
}

export function deleteSaveSlot(slotId: string): void {
  const saves = loadAllSaves();
  delete saves[slotId];
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saves));
  } catch {
    // ignore
  }
}

export function getLatestSave(): SaveSlotMeta | null {
  const saves = loadAllSaves();
  if (saves.autosave) return saves.autosave;
  const list = Object.values(saves);
  return list.length > 0 ? list[0] : null;
}
