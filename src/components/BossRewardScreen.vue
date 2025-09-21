<template>
  <div class="boss-reward">
    <h2>🏆 ボス撃破！</h2>
    <p>
      ボスを撃破しました！<br />報酬として以下のレリックから一つを選択してください：
    </p>

    <div class="boss-reward-options">
      <div
        v-for="(relic, index) in relics"
        :key="index"
        class="boss-reward-option"
      >
        <button
          class="boss-reward-btn"
          @click="$emit('select-relic', index)"
          :style="{ borderColor: rarityColors[relic.rarity] || '#444' }"
        >
          <div
            class="relic-name"
            :style="{ color: rarityColors[relic.rarity] || '#fff' }"
          >
            {{ relic.name }} ({{ relic.rarity.toUpperCase() }})
          </div>
          <div class="relic-effects">
            <div
              v-for="effect in relic.effects"
              :key="effect.type"
              class="effect-item"
            >
              {{ effect.description }}
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Relic } from '@/types';

interface Props {
  relics: Relic[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'select-relic': [index: number];
}>();

const rarityColors: Record<string, string> = {
  common: '#888',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
};
</script>

<style scoped>
.boss-reward {
  padding: 1.5rem;
  text-align: center;
}

.boss-reward h2 {
  color: #ffcc00;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.boss-reward p {
  color: #ccc;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.boss-reward-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.boss-reward-option {
  width: 100%;
}

.boss-reward-btn {
  width: 100%;
  padding: 1.5rem;
  background-color: #2a2a2a;
  border: 2px solid #444;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.boss-reward-btn:hover {
  background-color: #3a3a3a;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.relic-name {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  display: block;
}

.relic-effects {
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.4;
}

.effect-item {
  margin: 0.25rem 0;
  padding: 0.25rem 0;
  border-bottom: 1px solid #444;
}

.effect-item:last-child {
  border-bottom: none;
}

@media (min-width: 768px) {
  .boss-reward-options {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .boss-reward-option {
    flex: 1;
    max-width: 300px;
  }
}
</style>
