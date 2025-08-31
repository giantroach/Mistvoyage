<template>
  <div id="temple-screen">
    <div class="temple-header">
      <h2>🏛️ 古の寺院</h2>
      <p>
        静寂に包まれた古い寺院に辿り着きました。神秘的な力がこの場所を満たしており、
        悪天候を鎮める力があると言われています。
      </p>
    </div>

    <div class="temple-content">
      <div class="weather-status">
        <div class="current-weather">
          <h3>現在の天候</h3>
          <div class="weather-display">
            <span class="weather-value">{{
              playerParams.weather.displayName
            }}</span>
            <span class="weather-progress"
              >(天候値: {{ playerParams.weather.value }}/20)</span
            >
          </div>
        </div>

        <div class="weather-effects" v-if="hasWeatherEffects">
          <h4>天候による影響</h4>
          <ul>
            <li v-if="weatherEffects.speed !== 0">
              速度: {{ weatherEffects.speed > 0 ? '+' : ''
              }}{{ weatherEffects.speed }}
            </li>
            <li v-if="weatherEffects.accuracy !== 0">
              命中率: {{ weatherEffects.accuracy > 0 ? '+' : ''
              }}{{ weatherEffects.accuracy }}%
            </li>
            <li v-if="weatherEffects.sight !== 0">
              視界: {{ weatherEffects.sight > 0 ? '+' : ''
              }}{{ weatherEffects.sight }}
            </li>
          </ul>
        </div>
      </div>

      <div class="temple-actions">
        <div class="prayer-option">
          <h3>祈りを捧げる</h3>
          <p>
            神々に祈りを捧げることで、悪天候を鎮めることができます。
            天候値が0（快晴）にリセットされます。
          </p>
          <button
            @click="offerPrayer"
            class="prayer-button"
            :disabled="playerParams.weather.value === 0"
          >
            {{
              playerParams.weather.value === 0 ? '既に快晴です' : '祈りを捧げる'
            }}
          </button>
        </div>

        <div class="leave-option">
          <button @click="leaveTemple" class="leave-button">寺院を出る</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerParameters, WeatherEffect } from '@/types';

interface Props {
  playerParams: PlayerParameters;
  weatherEffects: WeatherEffect;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  offerPrayer: [];
  leaveTemple: [];
}>();

const hasWeatherEffects = computed(() => {
  return (
    props.weatherEffects.speed !== 0 ||
    props.weatherEffects.accuracy !== 0 ||
    props.weatherEffects.sight !== 0
  );
});

const offerPrayer = () => {
  emit('offerPrayer');
};

const leaveTemple = () => {
  emit('leaveTemple');
};
</script>

<style scoped>
#temple-screen {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  color: #e0e0e0;
}

.temple-header {
  text-align: center;
  margin-bottom: 2rem;
}

.temple-header h2 {
  color: #ffd700;
  margin-bottom: 1rem;
  font-size: 2rem;
}

.temple-header p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #b0b0b0;
}

.temple-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.weather-status {
  background: rgba(30, 30, 30, 0.7);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1.5rem;
}

.current-weather h3 {
  color: #66ccff;
  margin-bottom: 1rem;
}

.weather-display {
  margin-bottom: 1.5rem;
}

.weather-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffd700;
}

.weather-progress {
  display: block;
  font-size: 0.9rem;
  color: #888;
  margin-top: 0.5rem;
}

.weather-effects h4 {
  color: #ff9999;
  margin-bottom: 0.5rem;
}

.weather-effects ul {
  list-style: none;
  padding: 0;
}

.weather-effects li {
  color: #ff9999;
  margin-bottom: 0.25rem;
}

.temple-actions {
  background: rgba(30, 30, 30, 0.7);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1.5rem;
}

.prayer-option {
  margin-bottom: 2rem;
}

.prayer-option h3 {
  color: #66ccff;
  margin-bottom: 1rem;
}

.prayer-option p {
  color: #b0b0b0;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.prayer-button {
  background: linear-gradient(145deg, #2d4a6b, #1a2d42);
  color: #ffd700;
  border: 2px solid #ffd700;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: bold;
  transition: all 0.3s ease;
  width: 100%;
}

.prayer-button:hover:not(:disabled) {
  background: linear-gradient(145deg, #3a5b7f, #2d4a6b);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.prayer-button:disabled {
  background: #333;
  color: #666;
  border-color: #666;
  cursor: not-allowed;
}

.leave-button {
  background: linear-gradient(145deg, #4a4a4a, #2a2a2a);
  color: #e0e0e0;
  border: 1px solid #666;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  width: 100%;
}

.leave-button:hover {
  background: linear-gradient(145deg, #5a5a5a, #3a3a3a);
  border-color: #888;
}

@media (max-width: 768px) {
  .temple-content {
    grid-template-columns: 1fr;
  }
}
</style>
