// Game data structure types
export interface GameData {
  title: string;
  version: string;
  settings: GameSettings;
  scenes: Record<string, Scene>;
}

export interface GameSettings {
  autoSave: boolean;
  textSpeed: string;
}

export interface Scene {
  id: string;
  text: string;
  choices?: Choice[];
}

export interface Choice {
  text: string;
  nextScene?: string;
  actions?: string[];
  condition?: string;
}

// Player parameter types
export interface Ship {
  name: string;
  hullMax: number;
  crewMax: number;
  speed: number;
  storage: number;
  weaponSlots: number;
  weapons: string[];
  specialRules?: string[];
}

export interface PlayerParameters {
  // Public parameters
  ship: Ship;
  hull: number;
  storage: number;
  food: number;
  money: number;
  crew: number;
  sight: number;
  weather: string;
  relics: string[];
  weaponSlots: number;
  weapons: string[];

  // Private parameters
  speed: number;
  karma: number;
}

// Game state types
export interface GameState {
  currentSceneId: string;
  variables: Record<string, any>;
  visitedScenes: Set<string>;
  playerParameters: PlayerParameters;
}

export interface SaveData {
  gameState: {
    currentSceneId: string;
    variables: Record<string, any>;
    visitedScenes: string[];
    playerParameters: PlayerParameters;
  };
  timestamp: number;
}

// Action types
export type ActionType = "set" | "add" | "setParam" | "addParam";
