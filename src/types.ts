// Game data structure types for roguelike system
export interface GameData {
  title: string;
  version: string;
  settings: GameSettings;
}

export interface ChaptersData {
  chapters: Chapter[];
}

export interface ShipsData {
  ships: Record<string, Ship>;
}

export interface EventsData {
  events: Record<string, GameEvent>;
}

export interface GameSettings {
  autoSave: boolean;
  textSpeed: string;
  maxChapters: number;
  eventsPerChapter: number;
}

// Chapter and map structure
export interface Encounter {
  monsters: string[];
  weight: number;
}

export interface Chapter {
  id: number;
  name: string;
  difficulty: number;
  description: string;
  requiredEvents: number;
  bossEvent: string;
  bossMonster: string;
  bossRewardRarities: string[];
  eventTypes: {
    monster: EventTypeConfig;
    elite_monster: EventTypeConfig;
    port: EventTypeConfig;
    treasure: TreasureEventTypeConfig;
    temple: EventTypeConfig;
    unknown: EventTypeConfig;
  };
  encounters: Encounter[];
}

export interface EventTypeConfig {
  weight: number;
  fixedCount: number;
  minCount?: number;
  maxCount?: number;
}

export interface TreasureEventTypeConfig extends EventTypeConfig {
  rarityWeights: {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    legendary: number;
  };
}

export interface MapNode {
  id: string;
  x: number;
  y: number;
  eventId?: string;
  eventType?: EventType;
  resolvedEventType?: EventType; // For unknown events that have been resolved
  difficulty?: number;
  isVisible: boolean;
  isAccessible: boolean;
  connections: string[];
  layer: number;
  branchIndex: number;
}

export interface ChapterMap {
  chapterId: number;
  nodes: Record<string, MapNode>;
  startNodeId: string;
  bossNodeId: string;
  totalLayers: number;
  eventTypeConfig: {
    monster: { weight: number; fixedCount?: number };
    elite_monster: { weight: number; fixedCount?: number };
    port: { weight: number; fixedCount?: number };
    treasure: { weight: number; fixedCount?: number };
    unknown: { weight: number; fixedCount?: number };
  };
}

// Event system
export type EventType =
  | 'monster'
  | 'elite_monster'
  | 'port'
  | 'treasure'
  | 'temple'
  | 'boss'
  | 'start'
  | 'unknown'
  | 'completed_treasure';

// Weather system types
export type WeatherType = '' | 'fog' | 'rain';

export interface Weather {
  value: number; // 0-20, weather intensity
  type: WeatherType; // weather type set when value >= 10
  displayName: string; // human readable weather name
}

export interface WeatherEffect {
  speed: number; // speed modifier
  accuracy: number; // accuracy modifier (percentage)
  sight: number; // sight modifier
}

export interface GameEvent {
  id: string;
  type: EventType;
  name: string;
  description: string;
  difficulty: number;
  minSightToReveal: number;
  isSequential: boolean;
  sequentialEvents?: string[];
  conditions?: EventCondition[];
  outcomes: EventOutcome[];
}

export interface EventCondition {
  type: 'parameter' | 'variable' | 'karma' | 'weather';
  key: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number | string;
}

export interface EventOutcome {
  weight: number;
  description: string;
  effects: EventEffect[];
  nextEvents?: string[];
}

export interface EventEffect {
  type: 'parameter' | 'variable' | 'karma' | 'weather' | 'relic' | 'weapon';
  target: string;
  operation: 'set' | 'add' | 'multiply';
  value: number | string;
}

// Ship and equipment
export interface Ship {
  id: string;
  name: string;
  hullMax: number;
  crewMax: number;
  baseSpeed: number;
  storage: number;
  weaponSlots: number;
  initialWeapons: string[];
  specialRules?: string[];
}

export type WeaponRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export interface Weapon {
  id: string;
  name: string;
  description: string;
  damage: {
    min: number;
    max: number;
  };
  handlingReq: number; // Required crew to operate this weapon
  accuracy: number;
  cooldown: {
    min: number;
    max: number;
  };
  critRate: number; // Critical hit rate (0-100)
  critMultiplier: number; // Critical damage multiplier (e.g., 2.0 for double damage)
  price: number;
  rarity: WeaponRarity;
  type?: string;
  weaponType?: string;
  effect?: string;
}

// Battle system types
export interface Monster {
  id: string;
  name: string;
  description: string;
  hp: number;
  maxHp: number;
  speed: number;
  weapons: string[];
  armorTypes?: string[];
  goldReward: {
    min: number;
    max: number;
  };
  difficulty: number;
  chapters: number[];
  effects: BattleEffect[];
  // Combat stats for simple battle system
  attack: number;
  defense: number;
}

export interface MonsterWeapon {
  name: string;
  damage: {
    min: number;
    max: number;
  };
  accuracy: number;
  cooldown: number;
  weaponType?: string;
  effect?: string;
}

export interface BattleEffect {
  type: string;
  duration: number;
  startTime: number;
}

export interface BattleAction {
  actorType: 'player' | 'monster';
  actorId: string;
  weaponName: string;
  targetType: 'player' | 'monster';
  targetId: string;
  damage: number;
  hit: boolean;
  critical?: boolean;
  effect?: string;
  timestamp: number;
}

export interface BattleLogEntry {
  type?: 'status' | 'victory' | 'defeat';
  message: string;
  timestamp: number;
}

export interface BattleState {
  isActive: boolean;
  phase: 'preparation' | 'combat' | 'victory' | 'defeat' | 'result_screen';
  monsters: Monster[];
  playerWeapons: Array<{
    weapon: Weapon;
    lastUsed: number;
  }>;
  battleLog: (BattleAction | BattleLogEntry | string)[];
  startTime: number;
  playerEffects: BattleEffect[];
  // Additional properties for the new combat system
  playerTurn: boolean;
  turnCount: number;
  // Weapon cooldown tracking
  weaponCooldowns?: {
    player?: { [weaponId: string]: WeaponCooldownInfo };
    monsters?: {
      [monsterId: string]: { [weaponName: string]: WeaponCooldownInfo };
    };
  };
}

export interface WeaponCooldownInfo {
  cooldownPercent: number;
  remainingTime: number;
  isReady: boolean;
  lastFired?: number;
}

export type RelicRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Relic {
  id: string;
  name: string;
  description: string;
  rarity: RelicRarity;
  effects: RelicEffect[];
  isLegendary?: boolean;
  price?: number;
}

export interface RelicEffect {
  type: string; // Effect type (storage_increase, hull_increase, etc.)
  name: string; // Display name
  description: string; // Description with {value} placeholder
  value: number; // The actual value for this effect
  isLegendary?: boolean; // True for legendary-only effects
  weapon?: Weapon; // For relics that function as weapons
  duration?: number; // For temporary effects like berserker
}

export interface RelicData {
  effects: Record<string, RelicEffectTemplate>;
  legendaryEffects: Record<string, LegendaryEffectTemplate>;
  rarityWeights: Record<RelicRarity, number>;
  effectCounts: Record<RelicRarity, { min: number; max: number }>;
}

export interface RelicEffectTemplate {
  name: string;
  description: string;
  rarityRanges: Record<RelicRarity, { min: number; max: number }>;
}

export interface LegendaryEffectTemplate {
  name: string;
  description: string;
  durationRange?: { min: number; max: number };
  weaponStats?: {
    damage: { min: number; max: number };
    accuracy: { min: number; max: number };
    cooldown: { min: number; max: number };
  };
}

// Player state
export interface PlayerParameters {
  // Public parameters (displayed to player)
  ship: Ship;
  hull: number;
  food: number;
  money: number;
  crew: number;
  sight: number;
  weather: Weather;
  relics: Relic[];
  weapons: Weapon[];

  // Private parameters (internal only)
  speed: number;
  karma: number;

  // RPG Combat parameters
  level: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  experience: number;
  gold: number;
}

export type WeatherType = '晴れ' | '曇り' | '雨' | '嵐' | '霧';

// Game state
export interface GameState {
  currentChapter: number;
  currentMap: ChapterMap;
  currentNodeId: string;
  eventsCompleted: number;
  playerParameters: PlayerParameters;
  variables: Record<string, any>;
  visitedNodes: Set<string>;
  activeSequentialEvents: string[];
  gamePhase: GamePhase;
  battleState?: BattleState;
  mapScrollPosition?: number;
  treasureRelics?: Relic[] | null;
  unknownEvent?: {
    resolvedEventType: EventType;
    eventTypeName: string;
  } | null;
}

export type GamePhase =
  | 'ship_selection'
  | 'chapter_start'
  | 'navigation'
  | 'event'
  | 'combat'
  | 'game_over'
  | 'victory'
  | 'battle_result'
  | 'boss_reward';

// Combat system
export interface CombatState {
  playerShip: Ship;
  playerWeapons: Weapon[];
  enemy: Enemy;
  playerHull: number;
  enemyHull: number;
  round: number;
  combatLog: string[];
}

export interface Enemy {
  id: string;
  name: string;
  hull: number;
  weapons: Weapon[];
  behavior: EnemyBehavior;
}

export interface EnemyBehavior {
  aggressiveness: number;
  accuracy: number;
  specialAttacks?: string[];
}

// Save data
export interface SaveData {
  gameState: {
    currentChapter: number;
    currentMap: ChapterMap;
    currentNodeId: string;
    eventsCompleted: number;
    playerParameters: PlayerParameters;
    variables: Record<string, any>;
    visitedNodes: string[];
    activeSequentialEvents: string[];
    gamePhase: GamePhase;
  };
  timestamp: number;
}
