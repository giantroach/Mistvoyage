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
      <div class="battle-log-content" v-html="formattedBattleLog"></div>
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

const formatElapsedTime = (timestamp: number): string => {
  if (!props.battleState.startTime || !timestamp) {
    return '[0.0s]';
  }
  const elapsed = (timestamp - props.battleState.startTime) / 1000;
  return `[${elapsed.toFixed(1)}s]`;
};

const formattedBattleLog = computed(() => {
  return props.battleState.battleLog
    .slice()
    .reverse() // Show newest first
    .map(entry => {
      let timePrefix = '';
      let content = '';
      
      if (typeof entry === 'string') {
        timePrefix = '[0.0s]'; // Legacy string entries get default time
        content = entry;
        return `<p style="background-color: #444; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      } else if (entry.actorType && entry.weaponName) {
        timePrefix = formatElapsedTime(entry.timestamp);
        const actor = entry.actorType === 'player' ? 'あなた' : entry.actorId;
        const result = entry.hit
          ? entry.critical
            ? `${entry.damage}ダメージ (クリティカル!)`
            : `${entry.damage}ダメージ`
          : 'ミス';
        content = `${actor}の${entry.weaponName}: ${result}`;
        const backgroundColor =
          entry.actorType === 'player' ? '#2a4a2a' : '#4a2a2a'; // Green for player, red for enemy
        return `<p style="background-color: ${backgroundColor}; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; border-left: 4px solid ${
          entry.actorType === 'player' ? '#66ff66' : '#ff6666'
        };"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      } else if (entry.type === 'status') {
        // Handle status messages
        timePrefix = formatElapsedTime(entry.timestamp);
        content = entry.message;
        return `<p style="background-color: #444; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ffcc00;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      } else if (entry.type === 'victory') {
        // Handle victory messages
        timePrefix = formatElapsedTime(entry.timestamp);
        content = entry.message;
        return `<p style="background-color: #2a4a2a; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #66ff66; font-weight: bold;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      } else if (entry.type === 'defeat') {
        // Handle defeat messages
        timePrefix = formatElapsedTime(entry.timestamp);
        content = entry.message;
        return `<p style="background-color: #4a2a2a; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ff6666; font-weight: bold;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      }
      // For unknown entries, try to extract useful information instead of raw JSON
      let message = 'Unknown event';
      if (entry.message) {
        message = entry.message;
      } else if (entry.description) {
        message = entry.description;
      } else if (entry.text) {
        message = entry.text;
      }
      timePrefix = formatElapsedTime(entry.timestamp || 0);
      return `<p style="background-color: #333; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ccc;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${message}</p>`;
    })
    .join('');
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

.battle-log-content {
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.9rem;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0.5rem;
  background-color: #1a1a1a;
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
