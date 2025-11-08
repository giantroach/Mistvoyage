/**
 * Type definitions for the Pinia game store
 */

import type {
  GameState,
  Weapon,
  Relic,
  ChaptersData,
  ShipsData,
  MapNode,
} from '@/types';

/**
 * Port view types
 */
export type PortViewType =
  | 'main'
  | 'weapons'
  | 'relics'
  | 'sell-weapons'
  | 'sell-relics';

/**
 * Game settings
 */
export interface GameSettings {
  autoSave: boolean;
  battleSpeed: 'slow' | 'normal' | 'fast';
  textSize: 'small' | 'normal' | 'large';
}

/**
 * Game store state interface
 */
export interface GameStoreState {
  gameState: GameState | null;
  chaptersData: ChaptersData | null;
  shipsData: ShipsData | null;
  parameterDisplayKey: number;
  portView: PortViewType;
  portWeapons: Weapon[];
  portRelics: Relic[];
  showWeaponDetailModal: boolean;
  showRelicDetailModal: boolean;
  selectedWeapon: Weapon | null;
  selectedRelic: Relic | null;
  showSettingsModal: boolean;
  gameSettings: GameSettings;
  statusMessage: string;
  statusIsError: boolean;
}

/**
 * Game store getters interface
 */
export interface GameStoreGetters {
  currentNode: MapNode | null;
  currentChapter: any | null;
  playerParams: any | null;
}

/**
 * Game store actions interface
 */
export interface GameStoreActions {
  updateGameState(newState: GameState): void;
  forceParameterRefresh(): void;
  resetPortView(): void;
  showWeaponDetail(weapon: Weapon): void;
  hideWeaponDetail(): void;
  showRelicDetail(relic: Relic): void;
  hideRelicDetail(): void;
  showStatus(message: string, isError?: boolean): void;
  updateSettings(settings: GameSettings): void;
  loadSettings(): void;
  setChaptersData(data: ChaptersData): void;
  setShipsData(data: ShipsData): void;
}
