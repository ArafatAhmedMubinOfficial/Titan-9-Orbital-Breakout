import { ItemDef } from '../types';

export const ITEMS: Record<string, ItemDef> = {
  // Weapons (3 tiers)
  hydro_wrench: {
    id: 'hydro_wrench',
    name: 'Heavy Wrench',
    type: 'weapon',
    description: '+5 Attack. Solid titanium engineering wrench.',
    price: 55,
    sellPrice: 28,
    attackBonus: 5,
  },
  shock_baton: {
    id: 'shock_baton',
    name: 'Shock Baton',
    type: 'weapon',
    description: '+11 Attack. High-voltage station riot baton.',
    price: 135,
    sellPrice: 70,
    attackBonus: 11,
  },
  plasma_blade: {
    id: 'plasma_blade',
    name: 'Plasma Blade',
    type: 'weapon',
    description: '+18 Attack. Experimental thermal arc blade.',
    price: 220,
    sellPrice: 110,
    attackBonus: 18,
  },
  // Armor (3 tiers)
  mining_vest: {
    id: 'mining_vest',
    name: 'Padded Mining Vest',
    type: 'armor',
    description: '+4 Defense. Impact-absorbing blast liner.',
    price: 60,
    sellPrice: 30,
    defenseBonus: 4,
  },
  riot_plate: {
    id: 'riot_plate',
    name: 'Guard Riot Armor',
    type: 'armor',
    description: '+9 Defense. Composite ceramic chestplate.',
    price: 145,
    sellPrice: 75,
    defenseBonus: 9,
  },
  aegis_suit: {
    id: 'aegis_suit',
    name: 'Aegis Exosuit',
    type: 'armor',
    description: '+14 Defense. Heavy powered orbital armor.',
    price: 230,
    sellPrice: 115,
    defenseBonus: 14,
  },
  // Consumables
  ration_bar: {
    id: 'ration_bar',
    name: 'Energy Bar',
    type: 'consumable',
    description: 'Restores +45 Energy.',
    price: 18,
    sellPrice: 8,
    restoreEnergy: 45,
  },
  med_gel: {
    id: 'med_gel',
    name: 'Med-Gel',
    type: 'consumable',
    description: 'Heals +50 Health anytime (even mid-combat).',
    price: 32,
    sellPrice: 15,
    healHp: 50,
  },
  emp_bomb: {
    id: 'emp_bomb',
    name: 'EMP Charge',
    type: 'consumable',
    description: 'Combat item: 35 dmg (70 vs Mechs/Drones) + Stun.',
    price: 55,
    sellPrice: 25,
    empDamage: 35,
  },
  // Sellable Material
  crystal: {
    id: 'crystal',
    name: 'Amber Crystal',
    type: 'material',
    description: 'Valuable asteroid mineral. Sell to Raze for quick credits.',
    price: 0,
    sellPrice: 45,
  },
  // Escape Key Items
  keycard: {
    id: 'keycard',
    name: 'Command Keycard',
    type: 'key',
    description: 'Unlocks the Mainframe on the Escape Deck (Exoneration Ending).',
    price: 190,
    sellPrice: 90,
  },
  plasma_cutter: {
    id: 'plasma_cutter',
    name: 'Plasma Cutter',
    type: 'key',
    description: 'Cuts open the Escape Pod on the Escape Deck (Pod Escape Ending).',
    price: 190,
    sellPrice: 90,
  },
};

export const MARKET_STOCK: string[] = [
  'med_gel',
  'ration_bar',
  'emp_bomb',
  'hydro_wrench',
  'mining_vest',
  'shock_baton',
  'riot_plate',
  'plasma_blade',
  'aegis_suit',
  'keycard',
  'plasma_cutter',
];

export const ACHIEVEMENT_DEFS: { id: string; title: string; desc: string }[] = [
  { id: 'first_win', title: 'First Knockout', desc: 'Win your first battle on Titan-9.' },
  { id: 'crit_miner', title: 'Golden Seam', desc: 'Land a Critical Strike in the Asteroid Mineshaft.' },
  { id: 'pit_champ', title: 'Yard Champion', desc: 'Defeat Krag the Ironclad in the Fight Pit.' },
  { id: 'geared_up', title: 'Heavy Hardware', desc: 'Equip both a Weapon and Armor.' },
  { id: 'mech_slayer', title: 'Mech Slayer', desc: 'Destroy the Aegis-IX Boss Sentinel.' },
  { id: 'escaped', title: 'Orbital Breakout', desc: 'Escape Titan-9 via any ending.' },
];
