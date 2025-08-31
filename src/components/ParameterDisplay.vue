<template>
  <div id="parameters-display">
    <div class="parameter-group primary">
      <span id="hull-display"
        >船体: {{ playerParams.hull }}/{{ playerParams.ship.hullMax }}</span
      >
      <span id="food-display">食料: {{ playerParams.food }}</span>
      <span id="money-display">資金: {{ playerParams.money }}</span>
      <span id="crew-display"
        >乗組員: {{ playerParams.crew }}/{{ playerParams.ship.crewMax }}</span
      >
    </div>
    <div class="parameter-group secondary">
      <span id="sight-display">視界: {{ playerParams.sight }}</span>
      <span id="weather-display">天候: {{ playerParams.weather }}</span>
      <span id="storage-display"
        >保管庫: {{ playerParams.relics.length }}/{{
          playerParams.ship.storage
        }}</span
      >
    </div>
    <div class="parameter-group equipment">
      <span id="weapons-display" v-html="weaponsDisplay"></span>
      <span id="relics-display" v-html="relicsDisplay"></span>
    </div>
    <div class="parameter-group progress">
      <span id="chapter-display"
        >チャプター: {{ currentChapter }} - {{ chapterName }}</span
      >
      <span id="progress-display"
        >進行: {{ eventsCompleted }}/{{ requiredEvents }}</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerParameters, ChaptersData } from '@/types';

interface Props {
  playerParams: PlayerParameters;
  currentChapter: number;
  eventsCompleted: number;
  chaptersData?: ChaptersData | null;
}

const props = defineProps<Props>();

const chapterName = computed(() => {
  const chapter = props.chaptersData?.chapters.find(
    c => c.id === props.currentChapter
  );
  return chapter?.name || '不明';
});

const requiredEvents = computed(() => {
  const chapter = props.chaptersData?.chapters.find(
    c => c.id === props.currentChapter
  );
  return chapter?.requiredEvents || 0;
});

const weaponsDisplay = computed(() => {
  if (props.playerParams.weapons.length === 0) {
    return '武器: なし';
  }

  const weaponElements = props.playerParams.weapons
    .map(
      weapon =>
        `<span class="clickable-weapon" data-weapon-id="${weapon.id}" title="${weapon.description}">⚔️ ${weapon.name}</span>`
    )
    .join(', ');

  return `武器: ${weaponElements}`;
});

const relicsDisplay = computed(() => {
  if (props.playerParams.relics.length === 0) {
    return 'レリック: なし';
  }

  const relicElements = props.playerParams.relics
    .map(
      relic =>
        `<span class="clickable-relic" data-relic-id="${relic.id}" title="${relic.description}">🏺 ${relic.name}</span>`
    )
    .join(', ');

  return `レリック: ${relicElements}`;
});

// Emit events for weapon and relic clicks
const emit = defineEmits<{
  showWeaponDetail: [weapon: any];
  showRelicDetail: [relic: any];
}>();

// Add click listeners after mount
import { onMounted, onUpdated } from 'vue';

const addClickListeners = () => {
  // Add weapon click listeners
  document.querySelectorAll('.clickable-weapon').forEach(weaponEl => {
    weaponEl.addEventListener('click', e => {
      const weaponId = (e.target as HTMLElement).getAttribute('data-weapon-id');
      const weapon = props.playerParams.weapons.find(w => w.id === weaponId);
      if (weapon) {
        emit('showWeaponDetail', weapon);
      }
    });
  });

  // Add relic click listeners
  document.querySelectorAll('.clickable-relic').forEach(relicEl => {
    relicEl.addEventListener('click', e => {
      const relicId = (e.target as HTMLElement).getAttribute('data-relic-id');
      const relic = props.playerParams.relics.find(r => r.id === relicId);
      if (relic) {
        emit('showRelicDetail', relic);
      }
    });
  });
};

onMounted(() => {
  addClickListeners();
});

onUpdated(() => {
  addClickListeners();
});
</script>

<style scoped>
.parameter-group {
  display: flex;
  gap: 1rem;
  margin: 0.5rem 0;
}

.clickable-weapon,
.clickable-relic {
  cursor: pointer;
  color: #66ccff;
  text-decoration: underline;
}

.clickable-weapon:hover,
.clickable-relic:hover {
  color: #99ddff;
}
</style>
