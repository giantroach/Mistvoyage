<template>
  <div class="relic-sell">
    <h3>🏺 レリックを売却</h3>
    <p class="sell-description">
      不要なレリックを売却できます。売却価格は定価の半額です。
    </p>

    <div v-if="playerRelics.length === 0" class="no-items">
      売却できるレリックがありません。
    </div>

    <div v-else class="relic-list">
      <div
        v-for="(relic, index) in playerRelics"
        :key="relic.id"
        class="relic-item"
      >
        <div class="relic-header">
          <h4 class="relic-name" :class="`rarity-${relic.rarity}`">
            {{ relic.name }}
          </h4>
          <span class="relic-rarity">{{ getRarityLabel(relic.rarity) }}</span>
        </div>

        <p class="relic-description">{{ relic.description }}</p>

        <div class="relic-effects">
          <div
            v-for="(effect, effectIndex) in relic.effects"
            :key="effectIndex"
            class="effect"
          >
            <span class="effect-icon">✨</span>
            <span class="effect-text">{{ formatEffect(effect) }}</span>
          </div>
        </div>

        <div class="relic-actions">
          <span class="sell-price">売却価格: {{ getSellPrice(relic) }}金</span>
          <button class="sell-btn" @click="$emit('sell-relic', index)">
            💰 売却
          </button>
        </div>
      </div>
    </div>

    <div class="back-actions">
      <button class="back-btn" @click="$emit('back')">← 戻る</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Relic, RelicEffect } from '@/types';

interface Props {
  playerRelics: Relic[];
}

const props = defineProps<Props>();

defineEmits<{
  'sell-relic': [index: number];
  back: [];
}>();

const getSellPrice = (relic: Relic): number => {
  return Math.floor((relic.price || 0) / 2);
};

const getRarityLabel = (rarity: string): string => {
  const labels: Record<string, string> = {
    common: 'コモン',
    uncommon: 'アンコモン',
    rare: 'レア',
    epic: 'エピック',
    legendary: 'レジェンダリー',
  };
  return labels[rarity] || rarity;
};

const formatEffect = (effect: RelicEffect): string => {
  return effect.description.replace('{value}', effect.value.toString());
};
</script>

<style scoped>
.relic-sell {
  padding: 1rem;
}

.sell-description {
  color: #aaa;
  margin: 0.5rem 0 1rem;
  font-size: 0.9rem;
}

.no-items {
  text-align: center;
  padding: 2rem;
  color: #888;
  background-color: #2a2a2a;
  border-radius: 6px;
  margin: 1rem 0;
}

.relic-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.relic-item {
  background-color: #2a2a2a;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 1rem;
}

.relic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.relic-name {
  margin: 0;
  font-size: 1.1rem;
}

.relic-rarity {
  font-size: 0.8rem;
  color: #999;
  padding: 0.2rem 0.5rem;
  background-color: #333;
  border-radius: 4px;
}

.relic-description {
  color: #aaa;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.relic-effects {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background-color: #1a1a1a;
  border-radius: 4px;
}

.effect {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.effect-icon {
  font-size: 0.9rem;
}

.effect-text {
  color: #66ccff;
}

.relic-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #444;
}

.sell-price {
  font-size: 1rem;
  color: #ffcc66;
  font-weight: bold;
}

.sell-btn {
  background-color: #7c6a4a;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.sell-btn:hover {
  background-color: #8c7a5a;
}

.back-actions {
  margin-top: 1.5rem;
  text-align: center;
}

.back-btn {
  background-color: #666;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.back-btn:hover {
  background-color: #777;
}

/* Rarity colors */
.rarity-common {
  color: #cccccc;
}

.rarity-uncommon {
  color: #66ff66;
}

.rarity-rare {
  color: #6699ff;
}

.rarity-epic {
  color: #cc66ff;
}

.rarity-legendary {
  color: #ffaa00;
}
</style>
