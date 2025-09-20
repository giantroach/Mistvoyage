<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="relic-detail">
        <h3 :style="{ color: rarityColors[relic.rarity] || '#fff' }">
          {{ relic.name }} ({{ relic.rarity.toUpperCase() }})
        </h3>
        <p class="relic-description">{{ relic.description }}</p>
        <div class="relic-effects">
          <h4>効果</h4>
          <ul>
            <li v-for="effect in relic.effects" :key="effect.type">
              {{ effect.description }}
            </li>
          </ul>
        </div>
        <div class="relic-price" v-if="relic.price">
          <span class="stat-label">価格:</span>
          <span class="stat-value">{{ relic.price }}金</span>
        </div>
      </div>
      <button class="close-btn" @click="closeModal">⬅️ 戻る</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Relic } from '@/types';

interface Props {
  show: boolean;
  relic: Relic | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const rarityColors: Record<string, string> = {
  common: '#888',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
};

const closeModal = () => {
  emit('close');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid #444;
}

.relic-detail h3 {
  margin-bottom: 1rem;
  text-align: center;
}

.relic-description {
  color: #ccc;
  margin-bottom: 1.5rem;
  font-style: italic;
}

.relic-effects {
  margin-bottom: 1rem;
}

.relic-effects h4 {
  color: #66ccff;
  margin-bottom: 0.5rem;
}

.relic-effects ul {
  list-style: none;
  padding: 0;
}

.relic-effects li {
  padding: 0.25rem 0;
  color: #ccc;
  border-bottom: 1px solid #444;
}

.relic-price {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #1a1a1a;
  border-radius: 4px;
}

.stat-label {
  color: #aaa;
  font-weight: bold;
}

.stat-value {
  color: #fff;
}

.close-btn {
  width: 100%;
  padding: 0.75rem;
  background-color: #4a7c59;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.close-btn:hover {
  background-color: #5a8c69;
}
</style>
