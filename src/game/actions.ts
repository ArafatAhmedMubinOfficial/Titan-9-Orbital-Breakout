import { soundFx } from './audio';
import { crazyGames } from './crazygames';
import { ENEMIES } from './data/characters';
import { ACHIEVEMENT_DEFS, ITEMS } from './data/items';
import { ROOMS } from './data/world';
import {
  addItem,
  countItem,
  createCombat,
  getItemPrice,
  getPlayerTotals,
  grantXp,
  makeLog,
  removeItem,
} from './engine';
import { GameState, LogEntry, RoomId } from './types';

function withLogs(state: GameState, entries: LogEntry[]): GameState {
  return { ...state, log: [...state.log, ...entries].slice(-26) };
}

function unlockAchievement(state: GameState, id: string): GameState {
  if (state.achievements.includes(id)) return state;
  const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
  crazyGames.happytime();
  return withLogs(
    { ...state, achievements: [...state.achievements, id] },
    [makeLog('good', `Achievement Unlocked: ${def?.title ?? id}!`)]
  );
}

function advanceHour(state: GameState, hours = 1): { day: number; hour: number; newDay: boolean } {
  let hour = state.hour + hours;
  let day = state.day;
  let newDay = false;
  if (hour >= 24) {
    day += Math.floor(hour / 24);
    hour = 7;
    newDay = true;
  }
  return { day, hour, newDay };
}

export function moveToRoom(state: GameState, target: RoomId): GameState {
  if (state.combat || state.currentRoomId === target) return state;
  soundFx.playStep();
  const room = ROOMS[target];
  return withLogs(
    { ...state, currentRoomId: target },
    [makeLog('story', `Walked to ${room.name}.`)]
  );
}

export function restInCell(state: GameState): GameState {
  soundFx.playSuccess();
  return withLogs(
    {
      ...state,
      day: state.day + 1,
      hour: 7,
      player: {
        ...state.player,
        hp: state.player.maxHp,
        energy: state.player.maxEnergy,
      },
      flags: {
        ...state.flags,
        freeMealUsedToday: false,
        sponsorDropUsedToday: false,
      },
    },
    [
      makeLog(
        'good',
        `Day ${state.day + 1} begins. A full rest on your bunk restores 100% Health and Energy.`
      ),
    ]
  );
}

export function searchCellVent(state: GameState): GameState {
  if (state.flags.ventLooted) return state;
  soundFx.playSuccess();
  return withLogs(
    {
      ...state,
      player: {
        ...state.player,
        credits: state.player.credits + 45,
        inventory: addItem(state.player.inventory, 'med_gel', 1),
      },
      flags: { ...state.flags, ventLooted: true },
      stats: { ...state.stats, creditsEarned: state.stats.creditsEarned + 45 },
    },
    [
      makeLog(
        'good',
        'Behind the loose vent panel you discover a hidden stash: +45 Credits and 1x Med-Gel!'
      ),
    ]
  );
}

export function claimFreeMeal(state: GameState): GameState {
  if (state.flags.freeMealUsedToday) return state;
  soundFx.playSuccess();
  return withLogs(
    {
      ...state,
      player: {
        ...state.player,
        hp: Math.min(state.player.maxHp, state.player.hp + 25),
        energy: Math.min(state.player.maxEnergy, state.player.energy + 50),
      },
      flags: { ...state.flags, freeMealUsedToday: true },
    },
    [makeLog('good', 'Enjoyed today’s hot ration tray at the Hub mess bench (+25 HP, +50 Energy).')]
  );
}

export function claimSponsorDrop(state: GameState): GameState {
  soundFx.playSuccess();
  return withLogs(
    {
      ...state,
      player: {
        ...state.player,
        credits: state.player.credits + 65,
      },
      flags: { ...state.flags, sponsorDropUsedToday: true },
      stats: { ...state.stats, creditsEarned: state.stats.creditsEarned + 65 },
    },
    [makeLog('good', 'Orbital Supply Drop claimed: +65 Credits added to your account!')]
  );
}

export function claimSponsorHeal(state: GameState): GameState {
  soundFx.playSuccess();
  return withLogs(
    {
      ...state,
      player: {
        ...state.player,
        hp: state.player.maxHp,
        energy: state.player.maxEnergy,
      },
    },
    [makeLog('good', 'Emergency Nano-Pod activated: 100% Health & Energy restored!')]
  );
}

export function talkToNova(state: GameState): GameState {
  soundFx.playClick();
  const next = { ...state, flags: { ...state.flags, novaBriefed: true } };
  return withLogs(next, [
    makeLog(
      'dialogue',
      '"Three ways off Titan-9 on the Escape Deck: (1) Buy a Command Keycard from Raze to hack the Mainframe. (2) Buy a Plasma Cutter to slice open the Escape Pod. (3) Gear up and defeat the Aegis-IX Boss Mech to hijack the shuttle!"',
      'Nova'
    ),
  ]);
}

export function resolveMineShift(
  state: GameState,
  quality: 'CRIT' | 'GOOD' | 'NORMAL'
): { state: GameState; credits: number; crystal: boolean; ambush: boolean } {
  const cost = 25;
  if (state.player.energy < cost) {
    soundFx.playAlert();
    return {
      state: withLogs(state, [
        makeLog('warn', 'Not enough Energy (needs 25). Sleep in Your Cell or eat an Energy Bar.'),
      ]),
      credits: 0,
      crystal: false,
      ambush: false,
    };
  }

  const clock = advanceHour(state, 2);
  const archMult = state.player.archetype === 'mechanic' ? 1.25 : 1.0;
  const qualMult = quality === 'CRIT' ? 1.9 : quality === 'GOOD' ? 1.3 : 0.9;
  const credits = Math.round((34 + Math.floor(Math.random() * 14)) * archMult * qualMult);
  const foundCrystal = quality === 'CRIT' ? true : Math.random() < (quality === 'GOOD' ? 0.45 : 0.2);

  let inv = state.player.inventory;
  if (foundCrystal) inv = addItem(inv, 'crystal', 1);

  const xpRes = grantXp(
    {
      ...state.player,
      energy: state.player.energy - cost,
      credits: state.player.credits + credits,
      inventory: inv,
    },
    quality === 'CRIT' ? 45 : 28
  );
  if (xpRes.leveledUp) crazyGames.happytime();

  const qualityLabel =
    quality === 'CRIT'
      ? 'CRITICAL VEIN HIT!'
      : quality === 'GOOD'
      ? 'Clean strike!'
      : 'Standard haul.';

  const logs: LogEntry[] = [
    makeLog(
      'good',
      `${qualityLabel} +${credits} cr${foundCrystal ? ' + 1x Amber Crystal' : ''}${
        xpRes.leveledUp ? ` · LEVEL UP! Now Level ${xpRes.player.level}!` : ''
      }`
    ),
  ];

  let combat = state.combat;
  let ambush = false;
  if (Math.random() < 0.24) {
    ambush = true;
    soundFx.playAlert();
    const enc = createCombat('ore_drone', false);
    combat = enc.combat;
    logs.push(makeLog('combat', enc.intro));
  } else {
    soundFx.playSuccess();
  }

  let next = withLogs(
    {
      ...state,
      day: clock.day,
      hour: clock.hour,
      player: xpRes.player,
      combat,
      flags: clock.newDay
        ? { ...state.flags, freeMealUsedToday: false, sponsorDropUsedToday: false }
        : state.flags,
      stats: {
        ...state.stats,
        shiftsWorked: state.stats.shiftsWorked + 1,
        creditsEarned: state.stats.creditsEarned + credits,
        criticalMines: state.stats.criticalMines + (quality === 'CRIT' ? 1 : 0),
      },
    },
    logs
  );

  if (quality === 'CRIT') {
    next = unlockAchievement(next, 'crit_miner');
  }

  return { state: next, credits, crystal: foundCrystal, ambush };
}

export function trainInYard(state: GameState): GameState {
  const cost = 25;
  if (state.player.energy < cost) {
    soundFx.playAlert();
    return withLogs(state, [makeLog('warn', 'Not enough Energy to train (needs 25).')]);
  }
  soundFx.playSuccess();
  const clock = advanceHour(state, 2);
  const xpRes = grantXp(
    {
      ...state.player,
      energy: state.player.energy - cost,
      baseAttack: state.player.baseAttack + 1,
    },
    35
  );
  if (xpRes.leveledUp) crazyGames.happytime();

  return withLogs(
    {
      ...state,
      day: clock.day,
      hour: clock.hour,
      player: xpRes.player,
      flags: clock.newDay
        ? { ...state.flags, freeMealUsedToday: false, sponsorDropUsedToday: false }
        : state.flags,
    },
    [
      makeLog(
        'good',
        `Heavy-gravity training complete: +1 permanent Attack (+35 XP)${
          xpRes.leveledUp ? ` · LEVEL UP! Now Level ${xpRes.player.level}!` : ''
        }`
      ),
    ]
  );
}

export function healAtMedbay(state: GameState): GameState {
  const cost = 25;
  if (state.player.hp >= state.player.maxHp) {
    return withLogs(state, [makeLog('story', 'You are already at full Health.')]);
  }
  if (state.player.credits < cost) {
    soundFx.playAlert();
    return withLogs(state, [
      makeLog('warn', `Auto-Doc healing costs ${cost} cr. Rest for free in Your Cell or use Sponsor Nano-Heal.`),
    ]);
  }
  soundFx.playSuccess();
  return withLogs(
    {
      ...state,
      player: {
        ...state.player,
        credits: state.player.credits - cost,
        hp: state.player.maxHp,
      },
    },
    [makeLog('good', 'Dr. Chen activates the medical nano-beam (-25 cr). Health restored to 100%!')]
  );
}

export function deliverCrystalToChen(state: GameState): GameState {
  if (state.flags.chenQuestDone) return state;
  if (countItem(state.player.inventory, 'crystal') <= 0) {
    soundFx.playClick();
    return withLogs(state, [
      makeLog(
        'dialogue',
        '"If you mine an Amber Crystal from the Mineshaft, bring it to me. I’ll pay 95 credits and give you two Med-Gels."',
        'Dr. Chen'
      ),
    ]);
  }
  soundFx.playSuccess();
  let inv = removeItem(state.player.inventory, 'crystal', 1);
  inv = addItem(inv, 'med_gel', 2);
  const xpRes = grantXp({ ...state.player, inventory: inv, credits: state.player.credits + 95 }, 60);
  if (xpRes.leveledUp) crazyGames.happytime();
  return withLogs(
    {
      ...state,
      player: xpRes.player,
      flags: { ...state.flags, chenQuestDone: true },
      stats: { ...state.stats, creditsEarned: state.stats.creditsEarned + 95 },
    },
    [
      makeLog(
        'good',
        'Delivered Amber Crystal to Dr. Chen! Reward: +95 Credits, 2x Med-Gel, and +60 XP.'
      ),
    ]
  );
}

export function buyItem(state: GameState, itemId: string): GameState {
  const def = ITEMS[itemId];
  if (!def) return state;
  const price = getItemPrice(state.player, itemId);
  if (state.player.credits < price) {
    soundFx.playAlert();
    return withLogs(state, [makeLog('warn', `Need ${price} cr to buy ${def.name}.`)]);
  }

  soundFx.playSuccess();
  let player = { ...state.player, credits: state.player.credits - price };

  if (def.type === 'weapon') {
    if (player.weaponId) {
      player.inventory = addItem(player.inventory, player.weaponId, 1);
    }
    player.weaponId = def.id;
  } else if (def.type === 'armor') {
    if (player.armorId) {
      player.inventory = addItem(player.inventory, player.armorId, 1);
    }
    player.armorId = def.id;
  } else {
    player.inventory = addItem(player.inventory, def.id, 1);
  }

  let next = withLogs(
    { ...state, player },
    [
      makeLog(
        'good',
        `Bought ${def.name} for ${price} cr${def.type === 'weapon' || def.type === 'armor' ? ' (Equipped!)' : ''}.`
      ),
    ]
  );

  if (next.player.weaponId && next.player.armorId) {
    next = unlockAchievement(next, 'geared_up');
  }
  return next;
}

export function sellAllCrystals(state: GameState): GameState {
  const qty = countItem(state.player.inventory, 'crystal');
  if (qty <= 0) return state;
  soundFx.playSuccess();
  const payout = qty * ITEMS.crystal.sellPrice;
  return withLogs(
    {
      ...state,
      player: {
        ...state.player,
        credits: state.player.credits + payout,
        inventory: removeItem(state.player.inventory, 'crystal', qty),
      },
      stats: { ...state.stats, creditsEarned: state.stats.creditsEarned + payout },
    },
    [makeLog('good', `Sold ${qty}x Amber Crystal to Raze for +${payout} cr!`)]
  );
}

export function useInventoryItem(state: GameState, itemId: string): GameState {
  const def = ITEMS[itemId];
  if (!def || countItem(state.player.inventory, itemId) <= 0) return state;

  if (def.type === 'weapon') {
    soundFx.playClick();
    let inv = removeItem(state.player.inventory, itemId, 1);
    if (state.player.weaponId) inv = addItem(inv, state.player.weaponId, 1);
    return withLogs(
      { ...state, player: { ...state.player, inventory: inv, weaponId: itemId } },
      [makeLog('story', `Equipped ${def.name}.`)]
    );
  }

  if (def.type === 'armor') {
    soundFx.playClick();
    let inv = removeItem(state.player.inventory, itemId, 1);
    if (state.player.armorId) inv = addItem(inv, state.player.armorId, 1);
    return withLogs(
      { ...state, player: { ...state.player, inventory: inv, armorId: itemId } },
      [makeLog('story', `Equipped ${def.name}.`)]
    );
  }

  if (def.healHp || def.restoreEnergy) {
    soundFx.playSuccess();
    const player = {
      ...state.player,
      inventory: removeItem(state.player.inventory, itemId, 1),
      hp: Math.min(state.player.maxHp, state.player.hp + (def.healHp ?? 0)),
      energy: Math.min(state.player.maxEnergy, state.player.energy + (def.restoreEnergy ?? 0)),
    };
    return withLogs(
      { ...state, player },
      [
        makeLog(
          'good',
          `Used ${def.name}${def.healHp ? ` (+${def.healHp} HP)` : ''}${
            def.restoreEnergy ? ` (+${def.restoreEnergy} Energy)` : ''
          }.`
        ),
      ]
    );
  }

  return state;
}

export function startFight(state: GameState, enemyKey: string, isBoss = false): GameState {
  soundFx.playAlert();
  const { combat, intro } = createCombat(enemyKey, isBoss);
  return withLogs({ ...state, combat }, [makeLog('combat', intro)]);
}

export interface CombatTurnResult {
  state: GameState;
  playerDmgDealt: number;
  enemyDmgDealt: number;
  didHeal: boolean;
  didGuard: boolean;
  didEmp: boolean;
  won: boolean;
}

export function runCombatMove(
  state: GameState,
  move: 'STRIKE' | 'POWER' | 'GUARD' | 'DISRUPT' | 'MED_GEL' | 'EMP' | 'RETREAT'
): CombatTurnResult {
  if (!state.combat) {
    return { state, playerDmgDealt: 0, enemyDmgDealt: 0, didHeal: false, didGuard: false, didEmp: false, won: false };
  }
  let combat = { ...state.combat };
  let player = { ...state.player };
  const totals = getPlayerTotals(player);
  const logs: LogEntry[] = [];
  let guarding = false;
  let playerDmgDealt = 0;
  let enemyDmgDealt = 0;
  let didHeal = false;
  let didEmp = false;

  if (move === 'RETREAT') {
    soundFx.playStep();
    return {
      state: withLogs(
        { ...state, combat: null, currentRoomId: 'hub' },
        [makeLog('story', 'You disengage safely and fall back to Central Hub.')]
      ),
      playerDmgDealt: 0,
      enemyDmgDealt: 0,
      didHeal: false,
      didGuard: false,
      didEmp: false,
      won: false,
    };
  }

  if (move === 'STRIKE') {
    const dmg = Math.max(5, totals.attack + Math.floor(Math.random() * 4) - combat.enemyDefense);
    const finalDmg = combat.enemyIntent === 'GUARD' ? Math.max(4, Math.round(dmg * 0.65)) : dmg;
    combat.enemyHp = Math.max(0, combat.enemyHp - finalDmg);
    playerDmgDealt = finalDmg;
    soundFx.playHit(false);
    logs.push(makeLog('combat', `You strike ${combat.enemyName} for ${finalDmg} damage.`));
  } else if (move === 'POWER') {
    if (player.energy < 20) {
      return { state, playerDmgDealt: 0, enemyDmgDealt: 0, didHeal: false, didGuard: false, didEmp: false, won: false };
    }
    player.energy -= 20;
    const raw = Math.round(totals.attack * 1.55) + Math.floor(Math.random() * 5) - combat.enemyDefense;
    const finalDmg = Math.max(10, combat.enemyIntent === 'GUARD' ? Math.round(raw * 0.7) : raw);
    combat.enemyHp = Math.max(0, combat.enemyHp - finalDmg);
    playerDmgDealt = finalDmg;
    const stunned = Math.random() < 0.35;
    if (stunned) combat.enemyStunned = true;
    soundFx.playHit(true);
    logs.push(
      makeLog(
        'combat',
        `Power Hit lands for ${finalDmg} damage${stunned ? ' — Enemy Stunned!' : '!'}`
      )
    );
  } else if (move === 'GUARD') {
    guarding = true;
    player.energy = Math.min(player.maxEnergy, player.energy + 25);
    soundFx.playClick();
    logs.push(makeLog('good', 'You raise your energy guard (+25 Energy, blocks 60% damage).'));
  } else if (move === 'DISRUPT') {
    if (player.energy < 15) {
      return { state, playerDmgDealt: 0, enemyDmgDealt: 0, didHeal: false, didGuard: false, didEmp: false, won: false };
    }
    player.energy -= 15;
    const mult = (combat.isMech ? 1.6 : 1.0) * (player.archetype === 'hacker' ? 1.4 : 1.0);
    const dmg = Math.round(12 * mult);
    combat.enemyHp = Math.max(0, combat.enemyHp - dmg);
    combat.enemyDefense = Math.max(0, combat.enemyDefense - 2);
    if (combat.isMech || Math.random() < 0.5) combat.enemyStunned = true;
    playerDmgDealt = dmg;
    didEmp = true;
    soundFx.playSuccess();
    logs.push(
      makeLog(
        'combat',
        `Tech Disrupt deals ${dmg} damage and cracks armor${combat.enemyStunned ? ' (STUNNED!)' : '.'}`
      )
    );
  } else if (move === 'MED_GEL') {
    if (countItem(player.inventory, 'med_gel') <= 0) {
      return { state, playerDmgDealt: 0, enemyDmgDealt: 0, didHeal: false, didGuard: false, didEmp: false, won: false };
    }
    player.inventory = removeItem(player.inventory, 'med_gel', 1);
    player.hp = Math.min(player.maxHp, player.hp + 50);
    didHeal = true;
    soundFx.playSuccess();
    logs.push(makeLog('good', 'Injected Med-Gel (+50 Health)!'));
  } else if (move === 'EMP') {
    if (countItem(player.inventory, 'emp_bomb') <= 0) {
      return { state, playerDmgDealt: 0, enemyDmgDealt: 0, didHeal: false, didGuard: false, didEmp: false, won: false };
    }
    player.inventory = removeItem(player.inventory, 'emp_bomb', 1);
    const dmg = combat.isMech ? 70 : 35;
    combat.enemyHp = Math.max(0, combat.enemyHp - dmg);
    combat.enemyStunned = true;
    playerDmgDealt = dmg;
    didEmp = true;
    soundFx.playHit(true);
    logs.push(makeLog('combat', `EMP Charge detonates for ${dmg} damage and STUNS ${combat.enemyName}!`));
  }

  // Victory Check
  if (combat.enemyHp <= 0) {
    soundFx.playSuccess();
    const def = ENEMIES[combat.enemyId];
    let inv = player.inventory;
    if (def.dropItemId) inv = addItem(inv, def.dropItemId, 1);

    const xpRes = grantXp(
      { ...player, credits: player.credits + def.creditReward, inventory: inv },
      def.xpReward
    );
    if (xpRes.leveledUp) crazyGames.happytime();

    const nextFlags = { ...state.flags };
    if (combat.enemyId === 'krag') nextFlags.kragDefeated = true;
    if (combat.enemyId === 'aegis_mech') nextFlags.mechDefeated = true;

    logs.push(
      makeLog(
        'good',
        `${def.defeat} (+${def.creditReward} cr, +${def.xpReward} XP${
          xpRes.leveledUp ? ` · LEVEL ${xpRes.player.level}!` : ''
        })`
      )
    );

    let next = withLogs(
      {
        ...state,
        player: xpRes.player,
        combat: null,
        flags: nextFlags,
        stats: {
          ...state.stats,
          fightsWon: state.stats.fightsWon + 1,
          creditsEarned: state.stats.creditsEarned + def.creditReward,
        },
      },
      logs
    );

    next = unlockAchievement(next, 'first_win');
    if (combat.enemyId === 'krag') next = unlockAchievement(next, 'pit_champ');
    if (combat.enemyId === 'aegis_mech') next = unlockAchievement(next, 'mech_slayer');

    return {
      state: next,
      playerDmgDealt,
      enemyDmgDealt: 0,
      didHeal,
      didGuard: guarding,
      didEmp,
      won: true,
    };
  }

  // Enemy Turn
  if (combat.enemyStunned) {
    combat.enemyStunned = false;
    logs.push(makeLog('good', `${combat.enemyName} is stunned and skips its turn!`));
  } else if (combat.enemyIntent === 'GUARD') {
    logs.push(makeLog('story', `${combat.enemyName} holds a defensive stance.`));
  } else {
    const isHeavy = combat.enemyIntent === 'HEAVY';
    const raw = (isHeavy ? Math.round(combat.enemyAttack * 1.45) : combat.enemyAttack) - totals.defense;
    const dmg = Math.max(3, guarding ? Math.round(Math.max(3, raw) * 0.4) : raw);
    player.hp = Math.max(0, player.hp - dmg);
    enemyDmgDealt = dmg;
    soundFx.playHit(isHeavy);
    logs.push(
      makeLog(
        'warn',
        `${combat.enemyName} hits you with a ${isHeavy ? 'Heavy Attack' : 'Strike'} for ${dmg} damage${
          guarding ? ' (Guarded!)' : ''
        }.`
      )
    );
  }

  // Defeat Check (Friendly Medbay recovery)
  if (player.hp <= 0) {
    soundFx.playAlert();
    return {
      state: withLogs(
        {
          ...state,
          currentRoomId: 'medbay',
          combat: null,
          player: {
            ...player,
            hp: Math.round(player.maxHp * 0.55),
            energy: Math.round(player.maxEnergy * 0.6),
          },
        },
        [
          ...logs,
          makeLog(
            'warn',
            'You blacked out and woke up in Medbay with 55% Health. Upgrade your gear or heal up before a rematch!'
          ),
        ]
      ),
      playerDmgDealt,
      enemyDmgDealt,
      didHeal,
      didGuard: guarding,
      didEmp,
      won: false,
    };
  }

  // Next Turn Intent
  const r = Math.random();
  combat.turn += 1;
  combat.enemyIntent = r < 0.5 ? 'STRIKE' : r < 0.8 ? 'HEAVY' : 'GUARD';

  return {
    state: withLogs({ ...state, player, combat }, logs),
    playerDmgDealt,
    enemyDmgDealt,
    didHeal,
    didGuard: guarding,
    didEmp,
    won: false,
  };
}
