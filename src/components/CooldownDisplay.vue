<template>
  <div
    id="cooldown-display"
    :class="['cooldown-container', { visible: isVisible }]"
  >
    <div id="player-cooldowns" class="cooldown-section">
      <h4>自分の武器</h4>
      <div id="player-weapon-bars" class="weapon-bars">
        <div
          v-for="weapon in cooldownData.playerWeapons"
          :key="weapon.name"
          class="weapon-cooldown-bar"
        >
          <div class="weapon-name">{{ weapon.name }}</div>
          <div class="cooldown-bar">
            <div
              :class="['cooldown-fill', { 'cooldown-ready': weapon.isReady }]"
              :style="{ width: 100 - weapon.cooldownPercent + '%' }"
            ></div>
          </div>
          <div class="cooldown-text">
            {{
              weapon.isReady
                ? '準備完了'
                : Math.ceil(weapon.remainingTime / 1000) + '秒'
            }}
          </div>
        </div>
      </div>
    </div>

    <div id="monster-cooldowns" class="cooldown-section">
      <h4>敵の攻撃状況</h4>
      <div id="monster-weapon-bars" class="weapon-bars">
        <div
          v-for="monster in cooldownData.monsters"
          :key="monster.id"
          class="monster-weapon-bar"
        >
          <div class="monster-name">{{ monster.name }}</div>
          <div class="monster-weapon-status">
            <span
              v-for="weapon in monster.weapons"
              :key="weapon.name"
              :class="[
                'weapon-status-indicator',
                weapon.isActive ? 'weapon-active' : 'weapon-inactive',
              ]"
            >
              {{ weapon.name }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface WeaponCooldown {
  name: string;
  cooldownPercent: number;
  remainingTime: number;
  isReady: boolean;
}

interface MonsterWeapon {
  name: string;
  isActive: boolean;
}

interface MonsterCooldown {
  id: string;
  name: string;
  weapons: MonsterWeapon[];
}

interface CooldownData {
  playerWeapons: WeaponCooldown[];
  monsters: MonsterCooldown[];
}

interface Props {
  cooldownData: CooldownData;
}

const props = defineProps<Props>();

const isVisible = computed(() => {
  return (
    props.cooldownData.playerWeapons.length > 0 ||
    props.cooldownData.monsters.length > 0
  );
});
</script>

<style scoped>
.cooldown-container {
  position: fixed;
  bottom: 100px;
  right: 20px;
  background-color: rgba(42, 42, 42, 0.95);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1rem;
  min-width: 300px;
  max-width: 400px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 1000;
}

.cooldown-container.visible {
  opacity: 1;
  visibility: visible;
}

.cooldown-section {
  margin-bottom: 1rem;
}

.cooldown-section:last-child {
  margin-bottom: 0;
}

.cooldown-section h4 {
  margin: 0 0 0.5rem 0;
  color: #66ccff;
  font-size: 0.9rem;
}

.weapon-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.weapon-cooldown-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.weapon-name {
  font-size: 0.8rem;
  color: #ccc;
  font-weight: bold;
}

.cooldown-bar {
  width: 100%;
  height: 16px;
  background-color: #444;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.cooldown-fill {
  height: 100%;
  background-color: #4a7c59;
  transition: width 0.1s ease;
}

.cooldown-fill.cooldown-ready {
  background-color: #66ff66;
  animation: pulse 1s ease-in-out infinite alternate;
}

@keyframes pulse {
  0% {
    opacity: 0.8;
  }
  100% {
    opacity: 1;
  }
}

.cooldown-text {
  font-size: 0.7rem;
  color: #aaa;
  text-align: center;
}

.monster-weapon-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.monster-name {
  font-size: 0.8rem;
  color: #ff9999;
  font-weight: bold;
}

.monster-weapon-status {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.weapon-status-indicator {
  font-size: 0.7rem;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  border: 1px solid;
  transition: all 0.2s ease;
}

.weapon-status-indicator.weapon-active {
  background-color: #4a2a2a;
  border-color: #ff6666;
  color: #ff9999;
  animation: blink 1s ease-in-out infinite alternate;
}

.weapon-status-indicator.weapon-inactive {
  background-color: #333;
  border-color: #666;
  color: #999;
}

@keyframes blink {
  0% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}
</style>
