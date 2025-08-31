<template>
  <div class="weapon-shop">
    <h3>武器商店</h3>
    <p>様々な武器が売られています。どれを購入しますか？</p>

    <div class="shop-status">
      <p><strong>現在の資金:</strong> {{ playerParams.money }}金</p>
      <p>
        <strong>武器スロット:</strong> {{ playerParams.weapons.length }}/{{
          playerParams.ship.weaponSlots
        }}
      </p>
    </div>

    <div class="port-weapons">
      <div v-for="(weapon, index) in weapons" :key="index" class="weapon-item">
        <h4>{{ weapon.name }}</h4>
        <p>{{ weapon.description }}</p>
        <div class="weapon-stats">
          <p>
            <strong>ダメージ:</strong> {{ weapon.damage.min }}-{{
              weapon.damage.max
            }}
          </p>
          <p><strong>命中率:</strong> {{ weapon.accuracy }}%</p>
          <p>
            <strong>クールダウン:</strong>
            {{ (weapon.cooldown.min / 1000).toFixed(1) }}-{{
              (weapon.cooldown.max / 1000).toFixed(1)
            }}秒
          </p>
          <p><strong>クリティカル率:</strong> {{ weapon.critRate }}%</p>
          <p><strong>クリティカル倍率:</strong> {{ weapon.critMultiplier }}x</p>
          <p><strong>必要操舵:</strong> {{ weapon.handlingReq }}</p>
        </div>
        <p class="weapon-price">
          <strong>価格: {{ weapon.price }}金</strong>
        </p>

        <button
          class="choice-btn purchase-btn"
          :disabled="!canPurchaseWeapon(weapon)"
          @click="$emit('purchase-weapon', index)"
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
import type { PlayerParameters, Weapon } from '@/types';

interface Props {
  playerParams: PlayerParameters;
  weapons: Weapon[];
}

const props = defineProps<Props>();

defineEmits<{
  'purchase-weapon': [index: number];
  'back-to-port': [];
}>();

const canPurchaseWeapon = (weapon: Weapon) => {
  return (
    props.playerParams.money >= weapon.price &&
    props.playerParams.weapons.length < props.playerParams.ship.weaponSlots
  );
};
</script>

<style scoped>
.weapon-shop {
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

.port-weapons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.weapon-item {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
}

.weapon-item h4 {
  color: #66ccff;
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.weapon-item > p {
  margin: 0.5rem 0;
  color: #ccc;
  font-size: 0.9rem;
}

.weapon-stats {
  margin: 1rem 0;
  padding: 0.5rem;
  background-color: #1a1a1a;
  border-radius: 4px;
}

.weapon-stats p {
  margin: 0.25rem 0;
  color: #ddd;
  font-size: 0.85rem;
}

.weapon-price {
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
