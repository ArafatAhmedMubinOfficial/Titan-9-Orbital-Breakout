export type ScreenState = 'TITLE' | 'CREATE' | 'PLAYING' | 'ENDING';

export type ArchetypeId = 'hacker' | 'brawler' | 'smuggler' | 'mechanic';

export type EndingType = 'EXONERATION' | 'POD_ESCAPE' | 'SHUTTLE_HIJACK';

export type RoomId =
  | 'cell'
  | 'hub'
  | 'mineshaft'
  | 'medbay'
  | 'yard'
  | 'market'
  | 'command';

export type StageActivity =
  | 'IDLE'
  | 'WALKING'
  | 'SLEEPING'
  | 'EATING'
  | 'MINING'
  | 'TRAINING'
  | 'TALKING'
  | 'HEALING'
  | 'FIGHTING';

export interface StageFxEvent {
  id: number;
  kind: 'PLAYER_STRIKE' | 'PLAYER_POWER' | 'PLAYER_GUARD' | 'PLAYER_EMP' | 'ENEMY_HIT' | 'HEAL' | 'SPARK';
  label?: string;
  color?: string;
}

export interface CharacterAppearance {
  suitColor: string;
  hairStyle: 'short' | 'spiky' | 'visor' | 'hood';
  skinTone: string;
}

export interface ArchetypeDef {
  id: ArchetypeId;
  name: string;
  tagline: string;
  perk: string;
  hp: number;
  energy: number;
  attack: number;
  defense: number;
  credits: number;
  startingItems: { itemId: string; quantity: number }[];
}

export interface ItemDef {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'key';
  description: string;
  price: number;
  sellPrice: number;
  attackBonus?: number;
  defenseBonus?: number;
  healHp?: number;
  restoreEnergy?: number;
  empDamage?: number;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface RoomDef {
  id: RoomId;
  name: string;
  shortName: string;
  role: string;
  description: string;
  exits: RoomId[];
  artKey: 'cellblock' | 'mineshaft' | 'station' | 'medbay' | 'yard' | 'market' | 'command';
}

export interface EnemyDef {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  attack: number;
  defense: number;
  isMech?: boolean;
  creditReward: number;
  xpReward: number;
  dropItemId?: string;
  intro: string;
  defeat: string;
}

export interface CombatState {
  enemyId: string;
  enemyName: string;
  enemyTitle: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyAttack: number;
  enemyDefense: number;
  isMech: boolean;
  enemyStunned: boolean;
  enemyIntent: 'STRIKE' | 'HEAVY' | 'GUARD';
  turn: number;
  isBoss?: boolean;
}

export interface LogEntry {
  id: string;
  tone: 'story' | 'good' | 'warn' | 'combat' | 'dialogue';
  speaker?: string;
  text: string;
}

export interface PlayerState {
  name: string;
  archetype: ArchetypeId;
  appearance: CharacterAppearance;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  baseAttack: number;
  baseDefense: number;
  credits: number;
  weaponId: string | null;
  armorId: string | null;
  inventory: InventoryItem[];
}

export interface GameFlags {
  ventLooted: boolean;
  freeMealUsedToday: boolean;
  kragDefeated: boolean;
  mechDefeated: boolean;
  chenQuestDone: boolean;
  novaBriefed: boolean;
  sponsorDropUsedToday: boolean;
}

export interface GameState {
  day: number;
  hour: number;
  currentRoomId: RoomId;
  player: PlayerState;
  combat: CombatState | null;
  flags: GameFlags;
  achievements: string[];
  log: LogEntry[];
  stats: {
    fightsWon: number;
    shiftsWorked: number;
    creditsEarned: number;
    criticalMines: number;
  };
  ending: EndingType | null;
}

export interface SaveSlotMeta {
  slotId: string;
  savedAt: string;
  name: string;
  day: number;
  level: number;
  roomName: string;
  state: GameState;
}
