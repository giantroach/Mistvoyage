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

// Game state types
export interface GameState {
  currentSceneId: string;
  variables: Record<string, any>;
  visitedScenes: Set<string>;
}

export interface SaveData {
  gameState: {
    currentSceneId: string;
    variables: Record<string, any>;
    visitedScenes: string[];
  };
  timestamp: number;
}

// Action types
export type ActionType = 'set' | 'add';