// Game data structure types for roguelike system
export interface GameData {
  title: string;
  version: string;
  settings: GameSettings;
  chapters: Chapter[];
  events: Record<string, GameEvent>;
  ships: Record<string, Ship>;
}

export interface GameSettings {
  autoSave: boolean;
  textSpeed: string;
  maxChapters: number;
  eventsPerChapter: number;
}

// Chapter and map structure
export interface Chapter {
  id: number;
  name: string;
  difficulty: number;
  description: string;
  requiredEvents: number;
  bossEvent: string;
}

export interface MapNode {
  id: string;
  x: number;
  y: number;
  eventId?: string;
  eventType?: EventType;
  difficulty?: number;
  isVisible: boolean;
  isAccessible: boolean;
  connections: string[];
}

export interface ChapterMap {
  chapterId: number;
  nodes: Record<string, MapNode>;
  startNodeId: string;
  bossNodeId: string;
}

// Event system
export type EventType =
  | 'combat'
  | 'navigation'
  | 'encounter'
  | 'hunger'
  | 'port'
  | 'boss';

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

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  accuracy: number;
  range: string;
  specialEffects?: string[];
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  effects: RelicEffect[];
}

export interface RelicEffect {
  type: 'parameter' | 'combat' | 'event';
  target: string;
  modifier: number;
  condition?: string;
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
  weather: WeatherType;
  relics: Relic[];
  weapons: Weapon[];

  // Private parameters (internal only)
  speed: number;
  karma: number;
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
}

export type GamePhase =
  | 'ship_selection'
  | 'chapter_start'
  | 'navigation'
  | 'event'
  | 'combat'
  | 'game_over'
  | 'victory';

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
