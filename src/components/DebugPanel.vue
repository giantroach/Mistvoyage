<template>
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
          <button class="debug-btn danger" id="debug-lose-crew">
            乗組員全滅（ゲームオーバーテスト）
          </button>
          <button class="debug-btn danger" id="debug-set-low-food">
            食料を0.5に設定（食料不足テスト）
          </button>
        </div>

        <div class="debug-section">
          <h3>武器・アイテム</h3>
          <div class="debug-weapon-controls">
            <label for="weapon-type-select">武器種:</label>
            <select id="weapon-type-select">
              <option value="harpoon">ハープーン</option>
              <option value="cannon">大砲</option>
              <option value="crossbow">クロスボウ</option>
              <option value="flame_thrower">火炎放射器</option>
              <option value="net_launcher">ネット発射器</option>
            </select>
            <label for="weapon-rarity-select">レアリティ:</label>
            <select id="weapon-rarity-select">
              <option value="common">コモン</option>
              <option value="uncommon">アンコモン</option>
              <option value="rare">レア</option>
              <option value="epic">エピック</option>
              <option value="legendary">レジェンダリー</option>
            </select>
            <button class="debug-btn" id="debug-add-weapon">武器追加</button>
          </div>
          <div class="debug-relic-controls">
            <label for="relic-rarity-select">レアリティ:</label>
            <select id="relic-rarity-select">
              <option value="common">コモン</option>
              <option value="uncommon">アンコモン</option>
              <option value="rare">レア</option>
              <option value="epic">エピック</option>
              <option value="legendary">レジェンダリー</option>
            </select>
            <button class="debug-btn" id="debug-add-relic">レリック追加</button>
          </div>
          <button class="debug-btn" id="debug-clear-weapons">武器全削除</button>
          <button class="debug-btn" id="debug-clear-relics">
            レリック全削除
          </button>
        </div>

        <div class="debug-section">
          <h3>戦闘関連</h3>
          <div class="debug-enemy-controls">
            <label for="enemy-select">敵選択:</label>
            <select id="enemy-select">
              <option value="sea_slime">海のスライム</option>
              <option value="giant_crab">巨大蟹</option>
              <option value="storm_shark">嵐鮫</option>
              <option value="kraken_spawn">クラーケンの子</option>
              <option value="leviathan">リヴァイアサン</option>
              <option value="kraken_young">若きクラーケン</option>
              <option value="ghost_ship">幽霊船</option>
            </select>
            <button class="debug-btn" id="debug-start-battle">戦闘開始</button>
          </div>
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
</template>

<script setup lang="ts">
// Debug panel component - UI only
// Event handlers are managed by the main game instance
</script>

<style scoped>
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
}

.modal-content {
  position: relative;
  background-color: #2a2a2a;
  margin: 5% auto;
  padding: 0;
  border: 1px solid #555;
  border-radius: 8px;
  width: 80%;
  max-width: 800px;
  max-height: 80%;
  overflow-y: auto;
  color: #ccc;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: #333;
  border-bottom: 1px solid #555;
  border-radius: 8px 8px 0 0;
}

.modal-header h2 {
  margin: 0;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 1.5rem;
}

.debug-section {
  margin-bottom: 2rem;
}

.debug-section h3 {
  color: #fff;
  margin-bottom: 1rem;
  border-bottom: 1px solid #444;
  padding-bottom: 0.5rem;
}

.debug-btn {
  background-color: #4a7c59;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  margin: 0.25rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.debug-btn:hover {
  background-color: #5a8c69;
}

.debug-btn.danger {
  background-color: #8b2635;
  color: #ffcccb;
}

.debug-btn.danger:hover {
  background-color: #a53144;
}

.debug-weapon-controls,
.debug-relic-controls,
.debug-enemy-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.debug-weapon-controls label,
.debug-relic-controls label,
.debug-enemy-controls label {
  font-size: 0.9rem;
  color: #ccc;
  min-width: 80px;
}

.debug-weapon-controls select,
.debug-relic-controls select,
.debug-enemy-controls select {
  background-color: #2a2a2a;
  color: #ccc;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
}

.debug-weapon-controls select:focus,
.debug-relic-controls select:focus,
.debug-enemy-controls select:focus {
  outline: none;
  border-color: #4a7c59;
}
</style>
