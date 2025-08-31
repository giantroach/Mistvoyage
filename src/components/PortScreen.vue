<template>
  <div class="port-screen">
    <h3>港に到着</h3>
    <p>
      賑やかな港に到着しました。ここでは船の修理、武器の購入、レリックの購入ができます。
    </p>

    <div class="port-status">
      <p><strong>現在の資金:</strong> {{ playerParams.money }}金</p>
      <p>
        <strong>船体の状態:</strong> {{ playerParams.hull }}/{{
          playerParams.ship.hullMax
        }}
      </p>
      <p>
        <strong>武器スロット:</strong> {{ playerParams.weapons.length }}/{{
          playerParams.ship.weaponSlots
        }}
      </p>
      <p>
        <strong>保管庫:</strong> {{ playerParams.relics.length }}/{{
          playerParams.ship.storage
        }}
      </p>
    </div>

    <div class="port-actions">
      <button
        class="choice-btn repair-btn"
        :disabled="!canRepair"
        @click="$emit('repair-ship')"
      >
        🔧 船体を修復 (10金)
      </button>

      <button class="choice-btn" @click="$emit('show-weapons')">
        ⚔️ 武器を購入
      </button>

      <button class="choice-btn" @click="$emit('show-relics')">
        🏺 レリックを購入
      </button>

      <button class="choice-btn leave-btn" @click="$emit('leave-port')">
        ⛵ 港を出発する
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerParameters } from '@/types';

interface Props {
  playerParams: PlayerParameters;
}

const props = defineProps<Props>();

defineEmits<{
  'repair-ship': [];
  'show-weapons': [];
  'show-relics': [];
  'leave-port': [];
}>();

const canRepair = computed(() => {
  return (
    props.playerParams.hull < props.playerParams.ship.hullMax &&
    props.playerParams.money >= 10
  );
});
</script>

<style scoped>
.port-screen {
  padding: 1.5rem;
}

.port-status {
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #444;
}

.port-status p {
  margin: 0.5rem 0;
  color: #ccc;
}

.port-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
}

.choice-btn {
  background-color: #4a7c59;
  color: white;
  border: none;
  padding: 1rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.choice-btn:hover:not(:disabled) {
  background-color: #5a8c69;
}

.choice-btn:disabled {
  background-color: #555;
  color: #999;
  cursor: not-allowed;
}

.repair-btn:disabled {
  opacity: 0.6;
}

.leave-btn {
  background-color: #666;
  margin-top: 1rem;
}

.leave-btn:hover {
  background-color: #777;
}
</style>
