export type HsCardType = "minion" | "spell" | "weapon" | "secret";
export type HsRarity = "common" | "rare" | "epic" | "legendary";
export type HsKeyword =
  | "charge"
  | "rush"
  | "taunt"
  | "divine_shield"
  | "windfury"
  | "stealth"
  | "battlecry"
  | "deathrattle"
  | "secret"
  | "lifesteal";

export type HsEffect = {
  when: "battlecry" | "deathrattle" | "play" | "secret";
  op: string;
  amount?: number;
  attack?: number;
  health?: number;
  cardId?: string;
  needsTarget?: "enemy_minion" | "friendly_minion" | "any_minion" | "enemy_hero";
};

export type HsCardDef = {
  id: string;
  name: string;
  type: HsCardType;
  cost: number;
  attack?: number;
  health?: number;
  text: string;
  keywords: HsKeyword[];
  rarity: HsRarity;
  tribe?: string;
  art: string;
  source: "core" | "generated";
  collectible?: boolean;
  effects?: HsEffect[];
  secretTrigger?: "on_attacked" | "on_spell" | "on_minion_played";
};

export type HeroId = "nevychovanec" | "vychovanec" | "prezivanec";

export type BoardMinion = {
  instanceId: string;
  cardId: string;
  attack: number;
  health: number;
  maxHealth: number;
  keywords: HsKeyword[];
  canAttack: boolean;
  /** HS summoning sickness; false after surviving a turn start */
  slept: boolean;
  attacksThisTurn: number;
  divineShield: boolean;
  stealth: boolean;
  /** Rush: may attack minions but not heroes while slept */
  rush: boolean;
  exhausted: boolean;
  lifesteal: boolean;
};

export type WeaponState = {
  cardId: string;
  attack: number;
  durability: number;
} | null;

export type SecretState = {
  instanceId: string;
  cardId: string;
  trigger: NonNullable<HsCardDef["secretTrigger"]>;
};

export type PlayerState = {
  id: string;
  name: string;
  heroId: HeroId;
  hp: number;
  armor: number;
  mana: number;
  maxMana: number;
  deck: string[];
  hand: string[];
  board: BoardMinion[];
  weapon: WeaponState;
  secrets: SecretState[];
  heroPowerUsed: boolean;
  heroAttackedThisTurn: boolean;
  fatigue: number;
};

export type MatchPhase = "mulligan" | "play" | "ended";

export type HsMatch = {
  id: string;
  players: [PlayerState, PlayerState];
  active: 0 | 1;
  /** Increments each time a player starts their turn */
  turn: number;
  phase: MatchPhase;
  winner: 0 | 1 | null;
  log: string[];
};

export type HsAction =
  | { type: "end_turn" }
  | { type: "hero_power" }
  | { type: "play_card"; handIndex: number; targetInstanceId?: string }
  | {
      type: "attack";
      attackerInstanceId: string;
      target: "hero" | string;
    }
  | { type: "hero_attack"; target: "hero" | string };
