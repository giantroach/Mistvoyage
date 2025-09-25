<template>
  <div class="battle-log-content" v-html="formattedBattleLog"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BattleState } from '@/types';

interface Props {
  battleState: BattleState;
}

const props = defineProps<Props>();

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
        // This is a BattleAction entry
        const battleAction = entry as any; // Cast to access all BattleAction properties
        timePrefix = formatElapsedTime(battleAction.timestamp);
        const actor =
          battleAction.actorType === 'player' ? 'あなた' : battleAction.actorId;
        const result = battleAction.hit
          ? battleAction.critical
            ? `${battleAction.damage}ダメージ (クリティカル!)`
            : `${battleAction.damage}ダメージ`
          : 'ミス';
        content = `${actor}の${battleAction.weaponName}: ${result}`;

        // Add crew loss information if present
        if (battleAction.crewLoss && battleAction.crewLoss > 0) {
          content += ` <span style="color: #ff9999; font-weight: bold;">(乗組員${battleAction.crewLoss}人が失われた!)</span>`;
        }

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
      } else if (entry.type === 'battle_end') {
        // Handle battle end messages
        timePrefix = formatElapsedTime(entry.timestamp);
        content = entry.message;
        return `<p style="background-color: #333; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ccc; font-weight: bold;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
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
.battle-log-content {
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.9rem;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0.5rem;
  background-color: #1a1a1a;
  text-align: left;
}
</style>
