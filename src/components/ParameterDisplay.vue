<template>
  <div id="parameters-display">
    <div class="parameter-group primary">
      <span id="hull-display">
        <Ship :size="16" class="param-icon" />
        船体: {{ playerParams.hull }}/{{ playerParams.ship.hullMax }}
      </span>
      <span id="food-display">
        <Package :size="16" class="param-icon" />
        食料: {{ playerParams.food }}
      </span>
      <span id="money-display">
        <Coins :size="16" class="param-icon" />
        資金: {{ playerParams.money }}
      </span>
      <span id="crew-display">
        <Ship :size="16" class="param-icon" />
        乗組員: {{ playerParams.crew }}/{{ playerParams.ship.crewMax }}
      </span>
    </div>
    <div class="parameter-group secondary">
      <span id="sight-display">
        <Eye :size="16" class="param-icon" />
        視界: {{ playerParams.sight }}
      </span>
      <span id="weather-display">
        <CloudRain :size="16" class="param-icon" />
        天候: {{ playerParams.weather.displayName }}
      </span>
      <span id="storage-display">
        <Package :size="16" class="param-icon" />
        保管庫: {{ playerParams.relics.length }}/{{ playerParams.maxStorage }}
      </span>
    </div>
    <div class="parameter-group equipment">
      <span id="weapons-display" v-html="weaponsDisplay"></span>
      <span id="relics-display" v-html="relicsDisplay"></span>
    </div>
    <!-- <div class="parameter-group progress"> -->
    <!--   <span id="chapter-display" -->
    <!--     >チャプター: {{ currentChapter }} - {{ chapterName }}</span -->
    <!--   > -->
    <!--   <span id="progress-display" -->
    <!--     >進行: {{ eventsCompleted }}/{{ requiredEvents }}</span -->
    <!--   > -->
    <!-- </div> -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Ship,
  Coins,
  Eye,
  CloudRain,
  Package,
  Sword,
  Zap,
} from 'lucide-vue-next';
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
    return '<span class="param-icon-container"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="param-icon"><polyline points="14.5,17.5 3,6 3,3 6,3 17.5,14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="12"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg></span>武器: なし';
  }

  const weaponElements = props.playerParams.weapons
    .map(
      weapon =>
        `<span class="clickable-weapon" data-weapon-id="${weapon.id}" title="${weapon.description}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="param-icon"><polyline points="14.5,17.5 3,6 3,3 6,3 17.5,14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="12"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg> ${weapon.name}</span>`
    )
    .join(', ');

  return `<span class="param-icon-container"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="param-icon"><polyline points="14.5,17.5 3,6 3,3 6,3 17.5,14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="12"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg></span>武器: ${weaponElements}`;
});

const relicsDisplay = computed(() => {
  if (props.playerParams.relics.length === 0) {
    return '<span class="param-icon-container"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="param-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm1 16h18"></path></svg></span>レリック: なし';
  }

  const relicElements = props.playerParams.relics
    .map(
      relic =>
        `<span class="clickable-relic" data-relic-id="${relic.id}" title="${relic.description}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="param-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm1 16h18"></path></svg> ${relic.name}</span>`
    )
    .join(', ');

  return `<span class="param-icon-container"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="param-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm1 16h18"></path></svg></span>レリック: ${relicElements}`;
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
  gap: 0.2rem;
  margin: 0.2rem 0;
}

.param-icon {
  vertical-align: middle;
  margin-right: 4px;
  display: inline-block;
}

.param-icon-container {
  display: inline-flex;
  align-items: center;
}

.clickable-weapon,
.clickable-relic {
  cursor: pointer;
  color: #66ccff;
  text-decoration: underline;
  display: inline-flex;
  align-items: center;
}

.clickable-weapon:hover,
.clickable-relic:hover {
  color: #99ddff;
}
</style>
