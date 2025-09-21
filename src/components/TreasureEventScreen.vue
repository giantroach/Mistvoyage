<template>
  <div class="treasure-event-screen">
    <div id="story-display">
      <div id="story-text">
        <h2>宝箱を発見しました！</h2>
        <p>
          古い宝箱を発見しました。中からレリックが見つかりそうです。どれか一つを選んでください。
        </p>
      </div>
    </div>

    <div class="treasure-choices">
      <div class="relics-container">
        <div class="relics-grid">
          <button
            v-for="(relic, index) in relics"
            :key="index"
            class="choice-btn relic-choice"
            @click="handleRelicSelection(index)"
          >
            <div class="relic-info">
              <div class="relic-header">
                <span class="relic-icon">🏺</span>
                <strong>{{ relic.name }}</strong>
                <span class="rarity-badge" :class="`rarity-${relic.rarity}`">
                  {{ relic.rarity }}
                </span>
              </div>
              <div class="relic-description">
                {{ relic.description }}
              </div>
              <div class="relic-effects">
                <div
                  v-for="(effect, effectIndex) in relic.effects"
                  :key="effectIndex"
                  class="effect"
                >
                  {{ effect.description }}
                </div>
              </div>
            </div>
          </button>
        </div>

        <div class="skip-option">
          <button class="choice-btn skip-btn" @click="handleSkipTreasure">
            何も取らずに立ち去る
          </button>
        </div>
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
  selectRelic: [relicIndex: number];
  skipTreasure: [];
}>();

const handleRelicSelection = (index: number) => {
  emit('selectRelic', index);
};

const handleSkipTreasure = () => {
  emit('skipTreasure');
};
</script>

<style scoped>
.treasure-event-screen {
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

.treasure-choices {
  display: flex;
  justify-content: center;
}

.relics-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1200px;
}

.relics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  width: 100%;
  margin-bottom: 2rem;
}

.choice-btn {
  background-color: #333;
  color: #fff;
  border: 2px solid #555;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  text-align: left;
}

.relic-choice {
  background-color: #2a2a2a;
  border-color: #666;
  min-height: 150px;
}

.choice-btn:hover {
  background-color: #444;
  border-color: #66ccff;
  transform: translateY(-2px);
}

.choice-btn:active {
  transform: translateY(0);
}

.relic-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
}

.relic-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.relic-icon {
  font-size: 1.5rem;
}

.rarity-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.rarity-common {
  background-color: #666;
  color: #fff;
}

.rarity-uncommon {
  background-color: #4a7c59;
  color: #66ff66;
}

.rarity-rare {
  background-color: #4a5c7c;
  color: #6699ff;
}

.rarity-epic {
  background-color: #7c4a7c;
  color: #cc66ff;
}

.rarity-legendary {
  background-color: #7c5c2a;
  color: #ffcc66;
}

.relic-description {
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.3;
  flex-grow: 1;
}

.relic-effects {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.effect {
  color: #66ccff;
  font-size: 0.85rem;
  background-color: #1a1a1a;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #333;
}

.skip-option {
  display: flex;
  justify-content: center;
  width: 100%;
}

.skip-btn {
  background-color: #4a2a2a;
  border-color: #844;
  color: #ff8888;
  width: 300px;
  padding: 1rem 2rem;
  white-space: nowrap;
}

.skip-btn:hover {
  background-color: #5a3a3a;
  border-color: #a66;
}
</style>
