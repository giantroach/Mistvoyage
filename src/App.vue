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
      <div id="parameters-display">
        <div class="parameter-group primary">
          <span id="hull-display">船体: --/--</span>
          <span id="food-display">食料: --</span>
          <span id="money-display">資金: --</span>
          <span id="crew-display">乗組員: --/--</span>
        </div>
        <div class="parameter-group secondary">
          <span id="sight-display">視界: --</span>
          <span id="weather-display">天候: --</span>
          <span id="storage-display">保管庫: --/--</span>
        </div>
        <div class="parameter-group equipment">
          <span id="weapons-display">武器: --</span>
          <span id="relics-display">レリック: --</span>
        </div>
        <div class="parameter-group progress">
          <span id="chapter-display">チャプター: --</span>
          <span id="progress-display">進行: --/--</span>
        </div>
      </div>
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

      <!-- Legacy DOM-based game content -->
      <div 
        v-else-if="
          !gameState || 
          gameState.gamePhase === 'ship_selection' ||
          gameState.gamePhase === 'chapter_start' ||
          gameState.gamePhase === 'navigation' ||
          gameState.gamePhase === 'event' ||
          gameState.gamePhase === 'boss_reward' ||
          gameState.gamePhase === 'game_over' ||
          gameState.gamePhase === 'victory'
        "
      >
        <!-- Debug info for boss reward phase -->
        <div 
          v-if="gameState && gameState.gamePhase === 'boss_reward'"
          style="background: #8B4513; color: white; padding: 10px; margin: 10px; font-size: 14px;"
        >
          <p><strong>BOSS REWARD PHASE ACTIVE</strong></p>
          <p>Boss reward selection should appear below</p>
        </div>
        <!-- Debug info -->
        <div
          v-if="gameState"
          style="background: #444; padding: 10px; margin: 10px; font-size: 12px"
        >
          <p>Current gamePhase: {{ gameState.gamePhase }}</p>
          <p>BattleState exists: {{ !!gameState.battleState }}</p>
          <p>Current nodeId: {{ gameState.currentNodeId }}</p>
          <p>Current map exists: {{ !!gameState.currentMap }}</p>
          <p>
            Map nodes count:
            {{
              gameState.currentMap
                ? Object.keys(gameState.currentMap.nodes).length
                : 0
            }}
          </p>
          <p>Current node exists: {{ !!getCurrentNode(gameState) }}</p>
          <p v-if="getCurrentNode(gameState)">
            Node event type: {{ getCurrentNode(gameState)?.eventType }}
          </p>
          <p>Port view: {{ portView }}</p>
        </div>

        <div id="story-display">
          <div id="story-text"></div>
        </div>

        <div id="choices-container">
          <!-- 選択肢がここに動的に表示される -->
        </div>
      </div>

      <!-- Fallback for unknown game phases -->
      <div v-else style="background: red; color: white; padding: 20px; margin: 10px;">
        <h2>Unknown Game Phase</h2>
        <p v-if="gameState">Current phase: {{ gameState.gamePhase }}</p>
        <p v-else>Game state not available</p>
      </div>

      <div id="cooldown-display" class="cooldown-container">
        <div id="player-cooldowns" class="cooldown-section">
          <h4>自分の武器</h4>
          <div id="player-weapon-bars" class="weapon-bars"></div>
        </div>
        <div id="monster-cooldowns" class="cooldown-section">
          <h4>敵の攻撃状況</h4>
          <div id="monster-weapon-bars" class="weapon-bars"></div>
        </div>
      </div>
    </main>

    <div id="status-bar">
      <span id="save-status"></span>
    </div>

    <!-- Debug Modal -->
    <div id="debug-modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>デバッグパネル</h2>
          <button class="close-btn" id="close-debug">&times;</button>
        </div>
        <div class="modal-body">
          <div class="debug-section">
            <h3>基本操作</h3>
            <button class="debug-btn" id="debug-gain-exp">経験値+100</button>
            <button class="debug-btn" id="debug-gain-money">資金+1000</button>
            <button class="debug-btn" id="debug-heal">完全回復</button>
            <button class="debug-btn" id="debug-restore-food">
              食料満タン
            </button>
          </div>

          <div class="debug-section">
            <h3>武器・アイテム</h3>
            <button class="debug-btn" id="debug-add-weapon">
              ランダム武器追加
            </button>
            <button class="debug-btn" id="debug-add-relic">
              ランダムレリック追加
            </button>
            <button class="debug-btn" id="debug-clear-weapons">
              武器全削除
            </button>
            <button class="debug-btn" id="debug-clear-relics">
              レリック全削除
            </button>
          </div>

          <div class="debug-section">
            <h3>戦闘関連</h3>
            <button class="debug-btn" id="debug-win-battle">戦闘勝利</button>
            <button class="debug-btn" id="debug-toggle-god-mode">
              無敵モード切替
            </button>
          </div>

          <div class="debug-section">
            <h3>情報表示</h3>
            <button class="debug-btn" id="debug-show-state">
              ゲーム状態表示
            </button>
            <button class="debug-btn" id="debug-show-weapons">
              武器一覧表示
            </button>
            <button class="debug-btn" id="debug-show-relics">
              レリック一覧表示
            </button>
          </div>

          <div class="debug-section">
            <h3>章・進行</h3>
            <button class="debug-btn" id="debug-next-chapter">次の章へ</button>
            <button class="debug-btn" id="debug-complete-chapter">
              現在章完了
            </button>
          </div>
        </div>
      </div>
    </div>

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
import type { GameState, Weapon, Relic } from './types';

let game: MistvoyageGame | null = null;
const gameState = ref<GameState | null>(null);

// Port state management
const portView = ref<'main' | 'weapons' | 'relics'>('main');
const portWeapons = ref<Weapon[]>([]);
const portRelics = ref<Relic[]>([]);

// Helper function to get current node
const getCurrentNode = (state: GameState) => {
  if (!state || !state.currentMap || !state.currentNodeId) return null;
  return state.currentMap.nodes[state.currentNodeId] || null;
};

// Update gameState reactively
const updateGameState = () => {
  if (game) {
    const newState = game.getGameState();
    // console.log(
    //   'Vue updateGameState:',
    //   newState.gamePhase,
    //   !!newState.battleState
    // );
    gameState.value = JSON.parse(JSON.stringify(newState));
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
  console.log('handleShowWeapons called');
  if (game && game.getPortManager()) {
    console.log('Generating port weapons...');
    portWeapons.value = game.getPortManager().generatePortWeapons();
    portView.value = 'weapons';
    console.log('Port view changed to weapons, weapons:', portWeapons.value.length);
  } else {
    console.log('Game or PortManager not available');
  }
};

const handleShowRelics = () => {
  console.log('handleShowRelics called');
  if (game && game.getPortManager()) {
    console.log('Generating port relics...');
    portRelics.value = game.getPortManager().generatePortRelics();
    portView.value = 'relics';
    console.log('Port view changed to relics, relics:', portRelics.value.length);
  } else {
    console.log('Game or PortManager not available');
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
  console.log('handleLeavePort called');
  if (game && game.getPortManager()) {
    game.getPortManager().leavePort();
    portView.value = 'main';
    updateGameState();
    
    // Wait for Vue to re-render and show the legacy DOM elements
    await nextTick();
    
    // Force update the display to show navigation
    game.updateDisplay();
    console.log('Port exit completed, should show navigation');
  }
};

onMounted(async () => {
  game = new MistvoyageGame();
  await game.initialize();

  // Make game instance globally accessible for onclick handlers
  (window as any).gameInstance = game;
  (window as any).debugManager = game.getDebugManager();

  // Setup reactive state updates
  updateGameState();

  // Set up periodic updates for reactive state
  setInterval(updateGameState, 100);
});

// Track previous game phase to detect transitions
let previousGamePhase = ref<string>('');
let previousNodeType = ref<string>('');

// Watch gameState changes for debugging
watchEffect(() => {
  if (gameState.value) {
    const currentNode = getCurrentNode(gameState.value);
    // console.log('Vue gameState changed:', {
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
      console.log('Entering boss_reward phase - forcing updateDisplay');
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
      console.log('Entering port event - resetting port view to main');
      portView.value = 'main';
    }
    
    // Update previous state
    previousGamePhase.value = gameState.value.gamePhase;
    previousNodeType.value = currentNode?.eventType || '';
  }
});

// Watch portView changes
watchEffect(() => {
  console.log('Port view changed to:', portView.value);
});
</script>

<style>
@import url('./style.css');
</style>
