<template>
  <div class="battle-result">
    <h2>🎉 戦闘勝利！</h2>

    <div class="victory-summary">
      <h3>戦闘結果</h3>
      <ul>
        <li v-for="(monster, index) in battleState.monsters" :key="index">
          ✓ {{ monster.name }}を撃破
        </li>
      </ul>
    </div>

    <div class="rewards">
      <h3>🎁 獲得報酬</h3>
      <ul>
        <li>💰 ゴールド: +{{ goldReward }}</li>
        <li>⭐ 経験値: +10</li>
      </ul>
    </div>

    <div class="battle-log-section">
      <h3>📜 戦闘ログ</h3>
      <BattleLogDisplay :battleState="battleState" />
    </div>

    <div class="continue-section">
      <button class="choice-btn continue-btn" @click="$emit('continue-battle')">
        ⛵ 航海を続ける
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BattleLogDisplay from './BattleLogDisplay.vue';
import type { BattleState, PlayerParameters } from '@/types';

interface Props {
  battleState: BattleState;
  playerParams: PlayerParameters;
}

const props = defineProps<Props>();

defineEmits<{
  'continue-battle': [];
}>();

const goldReward = computed(() => {
  let totalGold = 0;
  for (const monster of props.battleState.monsters) {
    if (monster.id === 'elite_goblin') {
      totalGold += 50;
    } else {
      totalGold += 20;
    }
  }
  return totalGold;
});

</script>

<style scoped>
.battle-result {
  padding: 1.5rem;
  text-align: center;
}

.victory-summary,
.rewards,
.battle-log-section {
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #444;
}

.victory-summary h3,
.rewards h3,
.battle-log-section h3 {
  color: #66ccff;
  margin-bottom: 1rem;
  border-bottom: 1px solid #444;
  padding-bottom: 0.5rem;
}


ul {
  list-style: none;
  padding: 0;
  text-align: left;
}

li {
  padding: 0.25rem 0;
  color: #ccc;
}

.continue-section {
  margin: 2rem 0;
}

.continue-btn {
  background-color: #4a7c59;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: bold;
  transition: background-color 0.3s;
}

.continue-btn:hover {
  background-color: #5a8c69;
}

.choice-btn {
  background-color: #4a7c59;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}
</style>
