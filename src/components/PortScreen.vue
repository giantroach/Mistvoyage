<template>
  <div class="port-screen">
    <h3>港に到着</h3>
    <p>
      賑やかな港に到着しました。ここでは船の修理、武器の購入・売却、レリックの購入・売却、乗組員の雇用ができます。
    </p>

    <div class="port-actions">
      <button
        class="choice-btn repair-btn"
        :disabled="!canRepair"
        @click="$emit('repair-ship')"
      >
        🔧 船体を修復 ({{ repairCost }}金)
      </button>

      <button
        class="choice-btn hire-btn"
        :disabled="!canHireCrew"
        @click="$emit('hire-crew')"
      >
        👤 乗組員を雇う ({{ crewHireCost }}金)
      </button>

      <button
        class="choice-btn food-btn"
        :disabled="!canBuyFood"
        @click="$emit('buy-food')"
      >
        🍞 食料を購入 ({{ foodCost }}金) +5食料
      </button>

      <button class="choice-btn" @click="$emit('show-weapons')">
        ⚔️ 武器を購入
      </button>

      <button class="choice-btn" @click="$emit('show-relics')">
        🏺 レリックを購入
      </button>

      <button
        class="choice-btn sell-btn"
        :disabled="!canSellWeapons"
        @click="$emit('sell-weapons')"
      >
        💰 武器を売却
      </button>

      <button
        class="choice-btn sell-btn"
        :disabled="!canSellRelics"
        @click="$emit('sell-relics')"
      >
        💎 レリックを売却
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
  repairCost: number;
  crewHireCost: number;
  foodCost: number;
}

const props = defineProps<Props>();

defineEmits<{
  'repair-ship': [];
  'hire-crew': [];
  'buy-food': [];
  'show-weapons': [];
  'show-relics': [];
  'sell-weapons': [];
  'sell-relics': [];
  'leave-port': [];
}>();

const canRepair = computed(() => {
  return (
    props.playerParams.hull < props.playerParams.ship.hullMax &&
    props.playerParams.money >= props.repairCost
  );
});

const canHireCrew = computed(() => {
  return (
    props.playerParams.crew < props.playerParams.ship.crewMax &&
    props.playerParams.money >= props.crewHireCost
  );
});

const canBuyFood = computed(() => {
  return props.playerParams.money >= props.foodCost;
});

const canSellWeapons = computed(() => {
  return props.playerParams.weapons.length > 0;
});

const canSellRelics = computed(() => {
  return props.playerParams.relics.length > 0;
});
</script>

<style scoped>
.port-screen {
  padding: 1.5rem;
}

.port-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
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

.repair-btn:disabled,
.hire-btn:disabled,
.food-btn:disabled {
  opacity: 0.6;
}

.hire-btn {
  background-color: #6a5a8c;
}

.hire-btn:hover:not(:disabled) {
  background-color: #7a6a9c;
}

.food-btn {
  background-color: #5a7c4a;
}

.food-btn:hover:not(:disabled) {
  background-color: #6a8c5a;
}

.sell-btn {
  background-color: #7c6a4a;
}

.sell-btn:hover:not(:disabled) {
  background-color: #8c7a5a;
}

.leave-btn {
  background-color: #666;
  margin-top: 1rem;
}

.leave-btn:hover {
  background-color: #777;
}
</style>
