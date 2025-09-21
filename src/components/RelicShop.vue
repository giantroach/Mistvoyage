<template>
  <div class="relic-shop">
    <h3>レリック商店</h3>
    <p>古代の秘宝が売られています。どれを購入しますか？</p>

    <div class="shop-status">
      <p><strong>現在の資金:</strong> {{ playerParams.money }}金</p>
      <p>
        <strong>保管庫:</strong> {{ playerParams.relics.length }}/{{
          playerParams.maxStorage
        }}
      </p>
    </div>

    <div class="port-relics">
      <div
        v-for="(relic, index) in relics"
        :key="index"
        :class="['relic-item', relic.rarity]"
      >
        <h4>{{ relic.name }}</h4>
        <p>{{ relic.description }}</p>
        <p class="relic-rarity"><strong>レア度:</strong> {{ relic.rarity }}</p>

        <div class="relic-effects">
          <div
            v-for="(effect, effectIndex) in relic.effects"
            :key="effectIndex"
            :class="['effect', { legendary: effect.isLegendary }]"
          >
            {{ effect.description }}
          </div>
        </div>

        <p class="relic-price">
          <strong>価格: {{ relic.price || 50 }}金</strong>
        </p>

        <button
          class="choice-btn purchase-btn"
          :disabled="!canPurchaseRelic(relic)"
          @click="$emit('purchase-relic', index)"
        >
          購入する
        </button>
      </div>
    </div>

    <div class="shop-actions">
      <button class="choice-btn back-btn" @click="$emit('back-to-port')">
        ⬅️ 港に戻る
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlayerParameters, Relic } from '@/types';

interface Props {
  playerParams: PlayerParameters;
  relics: Relic[];
}

const props = defineProps<Props>();

defineEmits<{
  'purchase-relic': [index: number];
  'back-to-port': [];
}>();

const canPurchaseRelic = (relic: Relic) => {
  const price = relic.price || 50;
  return (
    props.playerParams.money >= price &&
    props.playerParams.relics.length < props.playerParams.maxStorage
  );
};
</script>

<style scoped>
.relic-shop {
  padding: 1.5rem;
}

.shop-status {
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #444;
}

.shop-status p {
  margin: 0.5rem 0;
  color: #ccc;
}

.port-relics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.relic-item {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
}

.relic-item.common {
  border-left: 4px solid #999;
}

.relic-item.uncommon {
  border-left: 4px solid #4a90e2;
}

.relic-item.rare {
  border-left: 4px solid #9b59b6;
}

.relic-item.epic {
  border-left: 4px solid #e67e22;
}

.relic-item.legendary {
  border-left: 4px solid #f1c40f;
  box-shadow: 0 0 10px rgba(241, 196, 15, 0.3);
}

.relic-item h4 {
  color: #66ccff;
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.relic-item > p {
  margin: 0.5rem 0;
  color: #ccc;
  font-size: 0.9rem;
}

.relic-rarity {
  color: #e67e22 !important;
  font-weight: bold;
}

.relic-effects {
  margin: 1rem 0;
  padding: 0.5rem;
  background-color: #1a1a1a;
  border-radius: 4px;
}

.effect {
  margin: 0.25rem 0;
  color: #ddd;
  font-size: 0.85rem;
  padding: 0.25rem;
  border-left: 2px solid #4a7c59;
  padding-left: 0.5rem;
}

.effect.legendary {
  border-left: 2px solid #f1c40f;
  color: #f1c40f;
  font-weight: bold;
}

.relic-price {
  color: #ffd700 !important;
  font-size: 1rem !important;
  font-weight: bold;
}

.purchase-btn {
  background-color: #4a7c59;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.purchase-btn:hover:not(:disabled) {
  background-color: #5a8c69;
}

.purchase-btn:disabled {
  background-color: #555;
  color: #999;
  cursor: not-allowed;
}

.shop-actions {
  margin: 2rem 0;
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

.back-btn {
  background-color: #666;
}

.back-btn:hover {
  background-color: #777;
}
</style>
