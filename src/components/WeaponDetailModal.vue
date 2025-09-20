<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="weapon-detail">
        <h3 :style="{ color: rarityColors[weapon.rarity] || '#fff' }">
          {{ weapon.name }} ({{ weapon.rarity.toUpperCase() }})
        </h3>
        <p class="weapon-description">{{ weapon.description }}</p>
        <div class="weapon-stats">
          <div class="stat-row">
            <span class="stat-label">ダメージ:</span>
            <span class="stat-value"
              >{{ weapon.damage.min }}-{{ weapon.damage.max }}</span
            >
          </div>
          <div class="stat-row">
            <span class="stat-label">必要クルー:</span>
            <span class="stat-value">{{ weapon.handlingReq }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">命中精度:</span>
            <span class="stat-value">{{ weapon.accuracy }}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">クールダウン:</span>
            <span class="stat-value">{{ cooldownText }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">クリティカル率:</span>
            <span class="stat-value">{{ weapon.critRate }}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">クリティカル倍率:</span>
            <span class="stat-value">{{ weapon.critMultiplier }}x</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">価格:</span>
            <span class="stat-value">{{ weapon.price }}金</span>
          </div>
        </div>
      </div>
      <button class="close-btn" @click="closeModal">⬅️ 戻る</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Weapon } from '@/types';

interface Props {
  show: boolean;
  weapon: Weapon | null;
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

const cooldownText = computed(() => {
  if (!props.weapon) return '';
  return props.weapon.cooldown.min === props.weapon.cooldown.max
    ? `${props.weapon.cooldown.min}ms`
    : `${props.weapon.cooldown.min}-${props.weapon.cooldown.max}ms`;
});

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

.weapon-detail h3 {
  margin-bottom: 1rem;
  text-align: center;
}

.weapon-description {
  color: #ccc;
  margin-bottom: 1.5rem;
  font-style: italic;
}

.weapon-stats {
  margin-bottom: 1rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #444;
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
