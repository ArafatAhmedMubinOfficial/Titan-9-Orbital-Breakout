import { RoomDef, RoomId } from '../types';

export const ART_ASSETS = {
  station: './src/assets/images/bdcc_title_station_1795152079613.jpg',
  cellblock: './src/assets/images/bdcc_cellblock_view_1795152077650.jpg',
  mineshaft: './src/assets/images/bdcc_mineshaft_view_1795152077898.jpg',
  portrait: './src/assets/images/bdcc_inmate_portrait_1795152077522.jpg',
  medbay: './src/assets/images/stage_medbay_view_1795154936006.jpg',
  yard: './src/assets/images/stage_yard_view_1795154937513.jpg',
  market: './src/assets/images/stage_market_view_1795154935977.jpg',
  command: './src/assets/images/stage_command_view_1795154936437.jpg',
} as const;

export const ROOMS: Record<RoomId, RoomDef> = {
  cell: {
    id: 'cell',
    name: 'Cell C-14',
    shortName: 'Your Cell',
    role: 'Rest & Recover',
    description:
      'Your quiet steel berth on Deck C of Titan-9 Penitentiary. Sleep here whenever you run low on Energy or Health to start a fresh orbital cycle.',
    exits: ['hub'],
    artKey: 'cellblock',
  },
  hub: {
    id: 'hub',
    name: 'Central Hub',
    shortName: 'Main Hall',
    role: 'Station Crossroads',
    description:
      'The glowing crossroads of Titan-9 Orbital Prison. Every wing branches off from here, and Nova tracks guard patrols near the ration counter.',
    exits: ['cell', 'mineshaft', 'medbay', 'yard', 'market', 'command'],
    artKey: 'cellblock',
  },
  mineshaft: {
    id: 'mineshaft',
    name: 'Asteroid Mineshaft',
    shortName: 'Mineshaft',
    role: 'Mine Ore & Crystals',
    description:
      'Heavy drills carve glowing amber crystals from the asteroid tethered to Titan-9’s outer pylon. Time your drill strikes cleanly for double payouts—and watch for rogue drones.',
    exits: ['hub', 'market'],
    artKey: 'mineshaft',
  },
  medbay: {
    id: 'medbay',
    name: 'Medical Bay',
    shortName: 'Medbay',
    role: 'Heal & Med-Gel',
    description:
      'Clean diagnostic pods hum under surgical lights. Dr. Elena Chen patches up detainees for a fair fee and pays well for rare Amber Crystals.',
    exits: ['hub', 'yard'],
    artKey: 'medbay',
  },
  yard: {
    id: 'yard',
    name: 'Exercise & Fight Yard',
    shortName: 'Fight Yard',
    role: 'Train & Fight Pit',
    description:
      'Gravity-calibrated weight benches surround a sunken octagonal sparring ring. Train your permanent Attack or fight for big credit purses.',
    exits: ['hub', 'medbay'],
    artKey: 'yard',
  },
  market: {
    id: 'market',
    name: 'The Crawl Market',
    shortName: 'Black Market',
    role: 'Buy Gear & Keys',
    description:
      'Hidden beneath the coolant pipes, Raze trades weapons, exosuits, EMP charges, Command Keycards, and Plasma Cutters—no questions asked.',
    exits: ['hub', 'mineshaft'],
    artKey: 'market',
  },
  command: {
    id: 'command',
    name: 'Command & Escape Deck',
    shortName: 'Escape Deck',
    role: '3 Escape Routes',
    description:
      'The armored upper ring overlooking Titan-9’s icy planetary rings. Hack the Mainframe, slice the Escape Pod hatch, or defeat the Aegis-IX Mech to hijack a shuttle.',
    exits: ['hub'],
    artKey: 'command',
  },
};

export const ROOM_ORDER: RoomId[] = [
  'cell',
  'hub',
  'mineshaft',
  'yard',
  'medbay',
  'market',
  'command',
];
