<template>
  <div class="inventory-modal-overlay" @click="$emit('close')">
    <div class="inventory-modal" @click.stop>
      <h3>{{ title }}</h3>
      <p class="modal-description">{{ description }}</p>

      <!-- New item preview -->
      <div class="new-item-section">
        <h4>新しいアイテム</h4>
        <div v-if="itemType === 'weapon'" class="item-preview weapon-preview">
          <div class="weapon-item">
            <h5>{{ newItem.name }}</h5>
            <p>{{ newItem.description }}</p>
            <div class="weapon-stats">
              <span
                >ダメージ: {{ newItem.damage.min }}-{{
                  newItem.damage.max
                }}</span
              >
              <span>命中率: {{ newItem.accuracy }}%</span>
              <span>クールダウン: {{ newItem.cooldown }}s</span>
            </div>
            <p class="weapon-price">価格: {{ newItem.price }}金</p>
          </div>
        </div>
        <div v-else class="item-preview relic-preview">
          <div :class="['relic-item', newItem.rarity]">
            <h5>{{ newItem.name }}</h5>
            <p>{{ newItem.description }}</p>
            <p class="relic-rarity">
              <strong>レア度:</strong> {{ newItem.rarity }}
            </p>
            <div class="relic-effects">
              <div
                v-for="(effect, index) in newItem.effects"
                :key="index"
                :class="['effect', { legendary: effect.isLegendary }]"
              >
                {{ effect.description }}
              </div>
            </div>
            <p class="relic-price">価格: {{ newItem.price || 50 }}金</p>
          </div>
        </div>
      </div>

      <!-- Current inventory -->
      <div class="current-inventory">
        <h4>現在の{{ itemType === 'weapon' ? '武器' : 'レリック' }}</h4>
        <div v-if="itemType === 'weapon'" class="weapons-list">
          <div
            v-for="(weapon, index) in currentItems"
            :key="weapon.id"
            class="inventory-weapon-item"
          >
            <div class="weapon-info">
              <h5>{{ weapon.name }}</h5>
              <p>{{ weapon.description }}</p>
              <div class="weapon-stats">
                <span
                  >ダメージ: {{ weapon.damage.min }}-{{
                    weapon.damage.max
                  }}</span
                >
                <span>命中率: {{ weapon.accuracy }}%</span>
                <span>クールダウン: {{ weapon.cooldown }}s</span>
              </div>
            </div>
            <button class="discard-btn" @click="$emit('discard-item', index)">
              捨てる
            </button>
          </div>
        </div>
        <div v-else class="relics-list">
          <div
            v-for="(relic, index) in currentItems"
            :key="relic.id"
            :class="['inventory-relic-item', relic.rarity]"
          >
            <div class="relic-info">
              <h5>{{ relic.name }}</h5>
              <p>{{ relic.description }}</p>
              <p class="relic-rarity">
                <strong>レア度:</strong> {{ relic.rarity }}
              </p>
              <div class="relic-effects">
                <div
                  v-for="(effect, effectIndex) in relic.effects"
                  :key="effectIndex"
                  :class="['effect', { legendary: effect.isLegendary }]"
                >
                  {{ effect.description }}
                </div>
              </div>
            </div>
            <button class="discard-btn" @click="$emit('discard-item', index)">
              捨てる
            </button>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="modal-actions">
        <button
          class="action-btn acquire-btn"
          :disabled="isInventoryFull"
          @click="$emit('acquire-item')"
        >
          入手する
        </button>
        <button class="action-btn cancel-btn" @click="$emit('close')">
          入手しない
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Weapon, Relic } from '@/types';

import { computed } from 'vue';

interface Props {
  title: string;
  description: string;
  itemType: 'weapon' | 'relic';
  newItem: Weapon | Relic;
  currentItems: Weapon[] | Relic[];
  maxSlots: number;
}

const props = defineProps<Props>();

defineEmits<{
  'discard-item': [index: number];
  'acquire-item': [];
  close: [];
}>();

const isInventoryFull = computed(() => {
  return props.currentItems.length >= props.maxSlots;
});
</script>

<style scoped>
.inventory-modal-overlay {
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

.inventory-modal {
  background-color: #1a1a1a;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 2rem;
  max-width: 80%;
  max-height: 80%;
  overflow-y: auto;
  color: #ccc;
}

.modal-description {
  color: #ccc;
  margin-bottom: 1.5rem;
}

.new-item-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 6px;
  border: 2px solid #4a7c59;
}

.new-item-section h4 {
  color: #66ccff;
  margin-bottom: 1rem;
}

.current-inventory {
  margin-bottom: 2rem;
}

.current-inventory h4 {
  color: #66ccff;
  margin-bottom: 1rem;
}

.weapons-list,
.relics-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.inventory-weapon-item,
.inventory-relic-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 1rem;
}

.weapon-item,
.relic-item {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 1rem;
}

.inventory-relic-item.common {
  border-left: 4px solid #999;
}

.inventory-relic-item.uncommon {
  border-left: 4px solid #4a90e2;
}

.inventory-relic-item.rare {
  border-left: 4px solid #9b59b6;
}

.inventory-relic-item.epic {
  border-left: 4px solid #e67e22;
}

.inventory-relic-item.legendary {
  border-left: 4px solid #f1c40f;
  box-shadow: 0 0 10px rgba(241, 196, 15, 0.3);
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

.weapon-info,
.relic-info {
  flex: 1;
}

.weapon-item h5,
.relic-item h5,
.weapon-info h5,
.relic-info h5 {
  color: #66ccff;
  margin: 0 0 0.5rem 0;
}

.weapon-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #aaa;
  margin: 0.5rem 0;
}

.weapon-price,
.relic-price {
  color: #ffd700;
  font-weight: bold;
  margin: 0.5rem 0 0 0;
}

.relic-rarity {
  color: #e67e22;
  font-weight: bold;
  margin: 0.5rem 0;
}

.relic-effects {
  margin: 0.5rem 0;
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

.discard-btn {
  background-color: #c0392b;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-left: 1rem;
}

.discard-btn:hover {
  background-color: #e74c3c;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.acquire-btn {
  background-color: #4a7c59;
  color: white;
}

.acquire-btn:hover:not(:disabled) {
  background-color: #5a8c69;
}

.acquire-btn:disabled {
  background-color: #555;
  color: #999;
  cursor: not-allowed;
}

.cancel-btn {
  background-color: #666;
  color: white;
}

.cancel-btn:hover {
  background-color: #777;
}
</style>
