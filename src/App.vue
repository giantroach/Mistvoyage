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
      <div id="story-display">
        <div id="story-text"></div>
      </div>

      <div id="choices-container">
        <!-- 選択肢がここに動的に表示される -->
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
            <button class="debug-btn" id="debug-restore-food">食料満タン</button>
          </div>

          <div class="debug-section">
            <h3>武器・アイテム</h3>
            <button class="debug-btn" id="debug-add-weapon">ランダム武器追加</button>
            <button class="debug-btn" id="debug-add-relic">ランダムレリック追加</button>
            <button class="debug-btn" id="debug-clear-weapons">武器全削除</button>
            <button class="debug-btn" id="debug-clear-relics">レリック全削除</button>
          </div>

          <div class="debug-section">
            <h3>戦闘関連</h3>
            <button class="debug-btn" id="debug-win-battle">戦闘勝利</button>
            <button class="debug-btn" id="debug-toggle-god-mode">無敵モード切替</button>
          </div>

          <div class="debug-section">
            <h3>情報表示</h3>
            <button class="debug-btn" id="debug-show-state">ゲーム状態表示</button>
            <button class="debug-btn" id="debug-show-weapons">武器一覧表示</button>
            <button class="debug-btn" id="debug-show-relics">レリック一覧表示</button>
          </div>

          <div class="debug-section">
            <h3>章・進行</h3>
            <button class="debug-btn" id="debug-next-chapter">次の章へ</button>
            <button class="debug-btn" id="debug-complete-chapter">現在章完了</button>
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
import { onMounted } from 'vue'
import { MistvoyageGame } from './game'

let game: MistvoyageGame | null = null

onMounted(async () => {
  game = new MistvoyageGame()
  await game.initialize()
  
  // Make game instance globally accessible for onclick handlers
  ;(window as any).gameInstance = game
  ;(window as any).debugManager = game.getDebugManager()
})
</script>

<style>
@import url('./style.css');
</style>