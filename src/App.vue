<template>
  <div id="game-container">
    <header>
      <div class="header-top">
        <h1>Mistvoyage</h1>
        <div id="game-controls">
          <button id="save-btn">セーブ</button>
          <button id="load-btn">ロード</button>
          <button id="settings-btn">設定</button>
          <button id="debug-btn">🔧 デバッグ</button>
        </div>
      </div>
      <!-- Parameter Display Component -->
      <ParameterDisplay
        v-if="gameState"
        :player-params="gameState.playerParameters"
        :current-chapter="gameState.currentChapter"
        :events-completed="gameState.eventsCompleted"
        :chapters-data="chaptersData"
        @show-weapon-detail="handleShowWeaponDetail"
        @show-relic-detail="handleShowRelicDetail"
      />
    </header>

    <main id="game-main">
      <!-- Vue Component Integration -->
      <BattleScreen
        v-if="
          gameState && gameState.gamePhase === 'combat' && gameState.battleState
        "
        :battle-state="gameState.battleState"
        :player-params="gameState.playerParameters"
      />

      <BattleResultScreen
        v-else-if="
          gameState &&
          gameState.gamePhase === 'battle_result' &&
          gameState.battleState
        "
        :battle-state="gameState.battleState"
        :player-params="gameState.playerParameters"
        @continue-battle="handleContinueBattle"
      />

      <!-- Port Components -->
      <PortScreen
        v-else-if="
          gameState &&
          gameState.gamePhase === 'event' &&
          getCurrentNode(gameState)?.eventType === 'port' &&
          portView === 'main'
        "
        :player-params="gameState.playerParameters"
        @repair-ship="handleRepairShip"
        @show-weapons="handleShowWeapons"
        @show-relics="handleShowRelics"
        @leave-port="handleLeavePort"
      />

      <WeaponShop
        v-else-if="
          gameState &&
          gameState.gamePhase === 'event' &&
          getCurrentNode(gameState)?.eventType === 'port' &&
          portView === 'weapons'
        "
        :player-params="gameState.playerParameters"
        :weapons="portWeapons"
        @purchase-weapon="handlePurchaseWeapon"
        @back-to-port="handleBackToPort"
      />

      <RelicShop
        v-else-if="
          gameState &&
          gameState.gamePhase === 'event' &&
          getCurrentNode(gameState)?.eventType === 'port' &&
          portView === 'relics'
        "
        :player-params="gameState.playerParameters"
        :relics="portRelics"
        @purchase-relic="handlePurchaseRelic"
        @back-to-port="handleBackToPort"
      />

      <!-- Temple Screen -->
      <TempleScreen
        v-else-if="
          gameState &&
          gameState.gamePhase === 'event' &&
          getCurrentNode(gameState)?.eventType === 'temple'
        "
        :player-params="gameState.playerParameters"
        :weather-effects="getWeatherEffects(gameState.playerParameters.weather)"
        @offer-prayer="handleOfferPrayer"
        @leave-temple="handleLeaveTemple"
      />

      <!-- Map Display Component for Navigation -->
      <MapDisplay
        v-if="gameState && gameState.gamePhase === 'navigation'"
        :game-state="gameState"
        :sight-range="gameState.playerParameters.sight"
        @navigate-to-node="handleNavigateToNode"
        @scroll-update="handleMapScroll"
      />

      <!-- Ship Selection Component -->
      <ShipSelectionScreen
        v-if="
          gameState && gameState.gamePhase === 'ship_selection' && shipsData
        "
        :ships="Object.values(shipsData.ships)"
        @select-ship="handleSelectShip"
      />

      <!-- Chapter Start Component -->
      <ChapterStartScreen
        v-else-if="
          gameState && gameState.gamePhase === 'chapter_start' && chaptersData
        "
        :chapter="getCurrentChapter(gameState.currentChapter)"
        @start-voyage="handleStartVoyage"
      />

      <!-- Treasure Event Component -->
      <TreasureEventScreen
        v-else-if="
          gameState &&
          gameState.gamePhase === 'event' &&
          getCurrentNode(gameState)?.eventType === 'treasure' &&
          gameState.treasureRelics &&
          gameState.treasureRelics.length > 0
        "
        :relics="gameState.treasureRelics"
        @select-relic="handleSelectTreasureRelic"
        @skip-treasure="handleSkipTreasure"
      />

      <!-- Unknown Event Component -->
      <UnknownEventScreen
        v-else-if="
          gameState &&
          gameState.gamePhase === 'event' &&
          getCurrentNode(gameState)?.eventType === 'unknown' &&
          gameState.unknownEvent
        "
        :resolved-event-type="gameState.unknownEvent.resolvedEventType"
        :event-type-name="gameState.unknownEvent.eventTypeName"
        @continue="handleContinueUnknownEvent"
      />

      <!-- Boss Reward Screen Component -->
      <BossRewardScreen
        v-else-if="
          gameState &&
          gameState.gamePhase === 'boss_reward' &&
          gameState.bossRewardRelics
        "
        :relics="gameState.bossRewardRelics"
        @select-relic="handleSelectBossReward"
      />

      <!-- Game Over/Victory Screen Component -->
      <GameOverScreen
        v-else-if="
          gameState &&
          (gameState.gamePhase === 'game_over' ||
            gameState.gamePhase === 'victory')
        "
        :is-victory="gameState.gamePhase === 'victory'"
        @restart="handleRestart"
      />

      <!-- Legacy DOM-based game content -->
      <div
        v-else-if="
          !gameState ||
          gameState.gamePhase === 'navigation' ||
          gameState.gamePhase === 'event' ||
          gameState.gamePhase === 'combat' ||
          gameState.gamePhase === 'battle_result' ||
          gameState.gamePhase === 'game_over' ||
          gameState.gamePhase === 'victory'
        "
      >
        <div id="story-display">
          <div id="story-text"></div>
        </div>

        <div id="choices-container">
          <!-- 選択肢がここに動的に表示される -->
        </div>
      </div>

      <!-- Fallback for unknown game phases -->
      <div
        v-else
        style="background: red; color: white; padding: 20px; margin: 10px"
      >
        <h2>Unknown Game Phase</h2>
        <p v-if="gameState">Current phase: {{ gameState.gamePhase }}</p>
        <p v-else>Game state not available</p>
      </div>

      <!-- Cooldown Display Component -->
      <CooldownDisplay v-if="cooldownData" :cooldown-data="cooldownData" />
    </main>

    <!-- Detail Modals -->
    <WeaponDetailModal
      :show="showWeaponDetailModal"
      :weapon="selectedWeapon"
      @close="
        showWeaponDetailModal = false;
        selectedWeapon = null;
      "
    />

    <RelicDetailModal
      :show="showRelicDetailModal"
      :relic="selectedRelic"
      @close="
        showRelicDetailModal = false;
        selectedRelic = null;
      "
    />

    <!-- Status Display Component -->
    <StatusDisplay
      ref="statusDisplay"
      :message="statusMessage"
      :is-error="statusIsError"
    />

    <!-- Debug Panel Component -->
    <DebugPanel />

    <!-- Settings Modal -->
    <div id="settings-modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>設定</h2>
          <button class="close-btn" id="close-settings">&times;</button>
        </div>
        <div class="modal-body">
          <div class="setting-item">
            <label for="auto-save-toggle">オートセーブ</label>
            <input type="checkbox" id="auto-save-toggle" checked />
          </div>
          <div class="setting-item">
            <label for="battle-speed">戦闘速度</label>
            <select id="battle-speed">
              <option value="slow">遅い</option>
              <option value="normal" selected>普通</option>
              <option value="fast">速い</option>
            </select>
          </div>
          <div class="setting-item">
            <label for="text-size">文字サイズ</label>
            <select id="text-size">
              <option value="small">小</option>
              <option value="normal" selected>標準</option>
              <option value="large">大</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, watchEffect, nextTick } from 'vue';
import { MistvoyageGame } from './game';
import BattleScreen from './components/BattleScreen.vue';
import BattleResultScreen from './components/BattleResultScreen.vue';
import PortScreen from './components/PortScreen.vue';
import WeaponShop from './components/WeaponShop.vue';
import RelicShop from './components/RelicShop.vue';
import TempleScreen from './components/TempleScreen.vue';
import ParameterDisplay from './components/ParameterDisplay.vue';
import MapDisplay from './components/MapDisplay.vue';
import ShipSelectionScreen from './components/ShipSelectionScreen.vue';
import ChapterStartScreen from './components/ChapterStartScreen.vue';
import TreasureEventScreen from './components/TreasureEventScreen.vue';
import UnknownEventScreen from './components/UnknownEventScreen.vue';
import GameOverScreen from './components/GameOverScreen.vue';
import CooldownDisplay from './components/CooldownDisplay.vue';
import StatusDisplay from './components/StatusDisplay.vue';
import DebugPanel from './components/DebugPanel.vue';
import WeaponDetailModal from './components/WeaponDetailModal.vue';
import RelicDetailModal from './components/RelicDetailModal.vue';
import BossRewardScreen from './components/BossRewardScreen.vue';
import type {
  GameState,
  Weapon,
  Relic,
  ChaptersData,
  ShipsData,
  Chapter,
} from './types';

let game: MistvoyageGame | null = null;
const gameState = ref<GameState | null>(null);

// Port state management
const portView = ref<'main' | 'weapons' | 'relics'>('main');
const portWeapons = ref<Weapon[]>([]);
const portRelics = ref<Relic[]>([]);

// Treasure state management
const treasureRelics = ref<Relic[]>([]);

// New component state management
const chaptersData = ref<ChaptersData | null>(null);
const shipsData = ref<ShipsData | null>(null);
const cooldownData = ref<any>(null);
const statusMessage = ref<string>('');
const statusIsError = ref<boolean>(false);
const statusDisplay = ref<any>(null);

// Detail modal state management
const showWeaponDetailModal = ref<boolean>(false);
const showRelicDetailModal = ref<boolean>(false);
const selectedWeapon = ref<Weapon | null>(null);
const selectedRelic = ref<Relic | null>(null);

// Helper function to get current node
const getCurrentNode = (state: GameState) => {
  if (!state || !state.currentMap || !state.currentNodeId) return null;
  return state.currentMap.nodes[state.currentNodeId] || null;
};

// Helper function to get current chapter
const getCurrentChapter = (chapterId: number) => {
  if (!chaptersData.value) return null;
  return chaptersData.value.chapters.find(c => c.id === chapterId) || null;
};

const getWeatherEffects = (weather: any) => {
  if (game && game.getWeatherManager()) {
    return game.getWeatherManager().getWeatherEffects(weather);
  }
  return { speed: 0, accuracy: 0, sight: 0 };
};

// Update gameState reactively
const updateGameState = () => {
  if (game) {
    const newState = game.getGameState();

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

    gameState.value = clonedState;
  }
};

const handleContinueBattle = async () => {
  if (game) {
    // First update the battle state
    if (game.getGameState().battleState) {
      game.getGameState().battleState = undefined;
    }
    game.getGameState().gamePhase = 'navigation';

    // Update Vue state immediately
    updateGameState();

    // Wait for Vue to re-render DOM
    await nextTick();

    // Then call the navigation display
    if (game) {
      game.continueBattleFromUI();
    }
  }
};

// Port event handlers
const handleRepairShip = () => {
  if (game && game.getPortManager()) {
    game.getPortManager().repairShip();
    updateGameState();
  }
};

const handleShowWeapons = () => {
  if (game && game.getPortManager()) {
    portWeapons.value = game.getPortManager().generatePortWeapons();
    portView.value = 'weapons';
  }
};

const handleShowRelics = () => {
  if (game && game.getPortManager()) {
    portRelics.value = game.getPortManager().generatePortRelics();
    portView.value = 'relics';
  }
};

const handlePurchaseWeapon = (index: number) => {
  if (game && game.getPortManager()) {
    const success = game.getPortManager().purchaseWeapon(index);
    if (success) {
      updateGameState();
      portView.value = 'main';
    }
  }
};

const handlePurchaseRelic = (index: number) => {
  if (game && game.getPortManager()) {
    const success = game.getPortManager().purchaseRelic(index);
    if (success) {
      updateGameState();
      portView.value = 'main';
    }
  }
};

const handleBackToPort = () => {
  portView.value = 'main';
};

const handleLeavePort = async () => {
  if (game && game.getPortManager()) {
    game.getPortManager().leavePort();
    portView.value = 'main';
    updateGameState();

    // Wait for Vue to re-render and show the legacy DOM elements
    await nextTick();

    // Force update the display to show navigation
    game.updateDisplay();
  }
};

// Temple event handlers
const handleOfferPrayer = async () => {
  if (game) {
    game.offerPrayer();
    updateGameState();
  }
};

const handleLeaveTemple = async () => {
  if (game) {
    game.completeEvent();
    updateGameState();
    // Wait for Vue to re-render and show the legacy DOM elements
    await nextTick();
    // Force update the display to show navigation
    game.updateDisplay();
  }
};

// New component event handlers
const handleShowWeaponDetail = (weapon: any) => {
  // Always use Vue modal approach
  selectedWeapon.value = weapon;
  showWeaponDetailModal.value = true;
};

const handleShowRelicDetail = (relic: any) => {
  // Always use Vue modal approach
  selectedRelic.value = relic;
  showRelicDetailModal.value = true;
};

// Ship selection event handler
const handleSelectShip = (ship: any) => {
  if (game) {
    game.selectShipFromVue(ship);
    updateGameState();
  }
};

// Chapter start event handler
const handleStartVoyage = () => {
  if (game) {
    game.startVoyageFromVue();
    updateGameState();
  }
};

// Treasure event handler
const handleSelectTreasureRelic = (relicIndex: number) => {
  if (game) {
    game.selectTreasureRelicFromVue(relicIndex);
    updateGameState();
  }
};

const handleSkipTreasure = () => {
  if (game) {
    game.skipTreasureFromVue();
    updateGameState();
  }
};

// Unknown event handler
const handleContinueUnknownEvent = (eventType: string) => {
  if (game) {
    game.continueUnknownEventFromVue(eventType);
    updateGameState();
  }
};

// Game over/restart handler
const handleRestart = () => {
  if (game) {
    // Reset game state and start over
    location.reload();
  }
};

// Boss reward selection handler
const handleSelectBossReward = (relicIndex: number) => {
  if (game) {
    game.selectBossRewardFromVue(relicIndex);
    updateGameState();
  }
};

// Map event handlers
const handleNavigateToNode = (nodeId: string) => {
  if (game) {
    game.navigateToNode(nodeId);
    updateGameState();
  }
};

const handleMapScroll = (scrollLeft: number) => {
  if (game && game.getGameState()) {
    // Simply update the scroll position without complex tracking
    game.getGameState().mapScrollPosition = scrollLeft;
  }
};

// Auto-scroll only when transitioning to navigation phase
watch(
  () => gameState.value?.gamePhase,
  (newPhase, oldPhase) => {
    if (newPhase === 'navigation' && oldPhase !== 'navigation') {
      // Only auto-scroll after a delay to ensure UI is ready
      setTimeout(() => {
        if (gameState.value?.mapScrollPosition !== undefined) {
          const mapContainer = document.querySelector(
            '.map-container'
          ) as HTMLElement;
          if (mapContainer) {
            mapContainer.scrollLeft = gameState.value.mapScrollPosition;
          }
        }
      }, 200);
    }
  }
);

// Status display methods
const showSaveStatus = (message: string, isError = false) => {
  statusMessage.value = message;
  statusIsError.value = isError;
};

onMounted(async () => {
  game = new MistvoyageGame();

  await game.initialize();

  // Load game data
  try {
    const [chaptersResponse, shipsResponse] = await Promise.all([
      fetch('./data/chapters.json'),
      fetch('./data/ships.json'),
    ]);
    chaptersData.value = await chaptersResponse.json();
    shipsData.value = await shipsResponse.json();
  } catch (error) {
    console.error('Failed to load game data:', error);
  }

  // Make game instance globally accessible for onclick handlers
  (window as any).gameInstance = game;
  (window as any).debugManager = game.getDebugManager();

  // Add Vue-specific methods to game instance
  (window as any).gameInstance.showVueStatus = showSaveStatus;

  // Setup reactive state updates
  updateGameState();

  // Set up periodic updates for reactive state
  setInterval(updateGameState, 100);

  // Set up custom event listeners for legacy components
  document.addEventListener('show-weapon-detail', (event: any) => {
    handleShowWeaponDetail(event.detail);
  });

  document.addEventListener('show-relic-detail', (event: any) => {
    handleShowRelicDetail(event.detail);
  });
});

// Track previous game phase to detect transitions
let previousGamePhase = ref<string>('');
let previousNodeType = ref<string>('');

// Watch gameState changes for debugging
watchEffect(() => {
  if (gameState.value) {
    const currentNode = getCurrentNode(gameState.value);
    //   gamePhase: gameState.value.gamePhase,
    //   hasBattleState: !!gameState.value.battleState,
    //   currentNodeType: currentNode?.eventType,
    //   portView: portView.value,
    // });

    // Force update display when entering boss_reward phase
    if (
      gameState.value.gamePhase === 'boss_reward' &&
      previousGamePhase.value !== 'boss_reward'
    ) {
      nextTick(() => {
        if (game) {
          game.updateDisplay();
        }
      });
    }

    // Reset port view only when ENTERING a port event (not while already in it)
    if (
      gameState.value.gamePhase === 'event' &&
      currentNode?.eventType === 'port' &&
      (previousGamePhase.value !== 'event' || previousNodeType.value !== 'port')
    ) {
      portView.value = 'main';
    }

    // Update previous state
    previousGamePhase.value = gameState.value.gamePhase;
    previousNodeType.value = currentNode?.eventType || '';
  }
});

// Watch portView changes
watchEffect(() => {});
</script>

<style>
@import url('./style.css');
</style>
