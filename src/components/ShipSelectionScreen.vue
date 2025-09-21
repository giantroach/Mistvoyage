<template>
  <div class="ship-selection-screen">
    <div id="story-display">
      <div id="story-text">
        <h2>船を選択してください</h2>
        <p>
          航海を始める前に、あなたの船を選択してください。それぞれ異なる特徴を持っています。
        </p>
      </div>
    </div>

    <div class="ship-choices">
      <button
        v-for="ship in ships"
        :key="ship.id"
        class="choice-btn ship-choice"
        @click="handleShipSelection(ship)"
      >
        <strong>{{ ship.name }}</strong
        ><br />
        船体: {{ ship.hullMax }} | 乗員: {{ ship.crewMax }} | 速度:
        {{ ship.baseSpeed }}<br />
        保管庫: {{ ship.storage }} | 武器スロット: {{ ship.weaponSlots }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ship } from '@/types';

interface Props {
  ships: Ship[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  selectShip: [ship: Ship];
}>();

const handleShipSelection = (ship: Ship) => {
  emit('selectShip', ship);
};
</script>

<style scoped>
.ship-selection-screen {
  padding: 1rem;
}

#story-display {
  margin-bottom: 2rem;
}

#story-text {
  background-color: #2a2a2a;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #444;
}

.ship-choices {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.choice-btn {
  background-color: #333;
  color: #fff;
  border: 2px solid #555;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  text-align: center;
  line-height: 1.4;
}

.choice-btn:hover {
  background-color: #444;
  border-color: #66ccff;
  transform: translateY(-2px);
}

.choice-btn:active {
  transform: translateY(0);
}

.ship-choice {
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
