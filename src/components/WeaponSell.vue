<template>
  <div class="weapon-sell">
    <h3>⚔️ 武器を売却</h3>
    <p class="sell-description">
      不要な武器を売却できます。売却価格は定価の半額です。
    </p>

    <div v-if="playerWeapons.length === 0" class="no-items">
      売却できる武器がありません。
    </div>

    <div v-else class="weapon-list">
      <div
        v-for="(weapon, index) in playerWeapons"
        :key="weapon.id"
        class="weapon-item"
      >
        <div class="weapon-header">
          <h4 class="weapon-name" :class="`rarity-${weapon.rarity}`">
            {{ weapon.name }}
          </h4>
          <span class="weapon-type">{{
            weapon.type || weapon.weaponType
          }}</span>
        </div>

        <p class="weapon-description">{{ weapon.description }}</p>

        <div class="weapon-stats">
          <div class="stat">
            <span class="stat-label">ダメージ:</span>
            <span class="stat-value"
              >{{ weapon.damage.min }}-{{ weapon.damage.max }}</span
            >
          </div>
          <div class="stat">
            <span class="stat-label">命中率:</span>
            <span class="stat-value">{{ weapon.accuracy }}%</span>
          </div>
          <div class="stat">
            <span class="stat-label">クールダウン:</span>
            <span class="stat-value"
              >{{ weapon.cooldown.min }}-{{ weapon.cooldown.max }}ms</span
            >
          </div>
          <div class="stat">
            <span class="stat-label">必要乗組員:</span>
            <span class="stat-value">{{ weapon.handlingReq }}</span>
          </div>
        </div>

        <div class="weapon-actions">
          <span class="sell-price">売却価格: {{ getSellPrice(weapon) }}金</span>
          <button class="sell-btn" @click="$emit('sell-weapon', index)">
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
import type { Weapon } from '@/types';

interface Props {
  playerWeapons: Weapon[];
}

const props = defineProps<Props>();

defineEmits<{
  'sell-weapon': [index: number];
  back: [];
}>();

const getSellPrice = (weapon: Weapon): number => {
  return Math.floor((weapon.price || 0) / 2);
};
</script>

<style scoped>
.weapon-sell {
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

.weapon-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.weapon-item {
  background-color: #2a2a2a;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 1rem;
}

.weapon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.weapon-name {
  margin: 0;
  font-size: 1.1rem;
}

.weapon-type {
  font-size: 0.8rem;
  color: #999;
  padding: 0.2rem 0.5rem;
  background-color: #333;
  border-radius: 4px;
}

.weapon-description {
  color: #aaa;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.weapon-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background-color: #1a1a1a;
  border-radius: 4px;
}

.stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.stat-label {
  color: #888;
}

.stat-value {
  color: #66ccff;
  font-weight: bold;
}

.weapon-actions {
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
