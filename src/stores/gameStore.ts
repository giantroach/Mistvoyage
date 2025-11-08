import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  GameState,
  Weapon,
  Relic,
  ChaptersData,
  ShipsData,
  MapNode,
  Chapter,
  PlayerParameters,
} from '@/types';
import type {
  PortViewType,
  GameSettings,
  GameStoreState,
  GameStoreGetters,
  GameStoreActions,
} from './types';

export const useGameStore = defineStore('game', () => {
  // State - with explicit types
  const gameState = ref<GameState | null>(null);
  const chaptersData = ref<ChaptersData | null>(null);
  const shipsData = ref<ShipsData | null>(null);
  const parameterDisplayKey = ref<number>(0);

  // Port state - with explicit types
  const portView = ref<PortViewType>('main');
  const portWeapons = ref<Weapon[]>([]);
  const portRelics = ref<Relic[]>([]);

  // Modal state - with explicit types
  const showWeaponDetailModal = ref<boolean>(false);
  const showRelicDetailModal = ref<boolean>(false);
  const selectedWeapon = ref<Weapon | null>(null);
  const selectedRelic = ref<Relic | null>(null);
  const showSettingsModal = ref<boolean>(false);

  // Settings - with explicit type
  const gameSettings = ref<GameSettings>({
    autoSave: true,
    battleSpeed: 'normal',
    textSize: 'normal',
  });

  // Status messages - with explicit types
  const statusMessage = ref<string>('');
  const statusIsError = ref<boolean>(false);

  // Getters
  const currentNode = computed((): MapNode | null => {
    if (
      !gameState.value ||
      !gameState.value.currentMap ||
      !gameState.value.currentNodeId
    ) {
      return null;
    }
    return (
      gameState.value.currentMap.nodes[gameState.value.currentNodeId] || null
    );
  });

  const currentChapter = computed((): Chapter | null => {
    if (!chaptersData.value || !gameState.value) return null;
    return (
      chaptersData.value.chapters.find(
        c => c.id === gameState.value!.currentChapter
      ) || null
    );
  });

  const playerParams = computed((): PlayerParameters | null => {
    return gameState.value?.playerParameters || null;
  });

  // Actions - with explicit type annotations
  function updateGameState(newState: GameState): void {
    // Deep clone the state but preserve Set objects
    const clonedState = JSON.parse(JSON.stringify(newState));

    // Restore visitedNodes as a Set if it exists
    if (newState.visitedNodes) {
      if (newState.visitedNodes instanceof Set) {
        clonedState.visitedNodes = Array.from(newState.visitedNodes);
      } else if (Array.isArray(newState.visitedNodes)) {
        clonedState.visitedNodes = newState.visitedNodes;
      }
    }

    // Force deep reactivity by creating completely new object
    gameState.value = {
      ...clonedState,
      playerParameters: {
        ...clonedState.playerParameters,
        hull: clonedState.playerParameters.hull,
        crew: clonedState.playerParameters.crew,
        money: clonedState.playerParameters.money,
        food: clonedState.playerParameters.food,
        sight: clonedState.playerParameters.sight,
        weapons: [...clonedState.playerParameters.weapons],
        relics: [...clonedState.playerParameters.relics],
        weather: { ...clonedState.playerParameters.weather },
        ship: { ...clonedState.playerParameters.ship },
      },
    };
  }

  function forceParameterRefresh(): void {
    parameterDisplayKey.value++;
  }

  function resetPortView(): void {
    portView.value = 'main';
  }

  function showWeaponDetail(weapon: Weapon): void {
    selectedWeapon.value = weapon;
    showWeaponDetailModal.value = true;
  }

  function hideWeaponDetail(): void {
    showWeaponDetailModal.value = false;
    selectedWeapon.value = null;
  }

  function showRelicDetail(relic: Relic): void {
    selectedRelic.value = relic;
    showRelicDetailModal.value = true;
  }

  function hideRelicDetail(): void {
    showRelicDetailModal.value = false;
    selectedRelic.value = null;
  }

  function showStatus(message: string, isError: boolean = false): void {
    statusMessage.value = message;
    statusIsError.value = isError;
  }

  function updateSettings(settings: GameSettings): void {
    gameSettings.value = { ...settings };
    localStorage.setItem('gameSettings', JSON.stringify(settings));
  }

  function loadSettings(): void {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as GameSettings;
        gameSettings.value = parsed;
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }

  function setChaptersData(data: ChaptersData): void {
    chaptersData.value = data;
  }

  function setShipsData(data: ShipsData): void {
    shipsData.value = data;
  }

  return {
    // State
    gameState,
    chaptersData,
    shipsData,
    parameterDisplayKey,
    portView,
    portWeapons,
    portRelics,
    showWeaponDetailModal,
    showRelicDetailModal,
    selectedWeapon,
    selectedRelic,
    showSettingsModal,
    gameSettings,
    statusMessage,
    statusIsError,

    // Getters
    currentNode,
    currentChapter,
    playerParams,

    // Actions
    updateGameState,
    forceParameterRefresh,
    resetPortView,
    showWeaponDetail,
    hideWeaponDetail,
    showRelicDetail,
    hideRelicDetail,
    showStatus,
    updateSettings,
    loadSettings,
    setChaptersData,
    setShipsData,
  };
});
