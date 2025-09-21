<template>
  <div class="chapter-start-screen">
    <div id="story-display">
      <div id="story-text">
        <h2>{{ chapter?.name || 'チャプター開始' }}</h2>
        <p>{{ chapter?.description || '新しい冒険が始まります...' }}</p>
        <div class="chapter-info">
          <h3>チャプター情報</h3>
          <ul>
            <li>必要イベント数: {{ chapter?.requiredEvents || 0 }}</li>
            <li>海域: {{ chapter?.name || '不明' }}</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="chapter-choices">
      <button class="choice-btn start-voyage-btn" @click="handleStartVoyage">
        航海を開始する
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Chapter } from '@/types';

interface Props {
  chapter: Chapter | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  startVoyage: [];
}>();

const handleStartVoyage = () => {
  emit('startVoyage');
};
</script>

<style scoped>
.chapter-start-screen {
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

.chapter-info {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #1a1a1a;
  border-radius: 6px;
  border: 1px solid #333;
}

.chapter-info h3 {
  margin: 0 0 0.5rem 0;
  color: #66ccff;
}

.chapter-info ul {
  margin: 0;
  padding-left: 1.5rem;
}

.chapter-info li {
  margin-bottom: 0.25rem;
}

.chapter-choices {
  display: flex;
  justify-content: center;
}

.choice-btn {
  background-color: #333;
  color: #fff;
  border: 2px solid #555;
  border-radius: 6px;
  padding: 1rem 2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 1rem;
  font-weight: bold;
}

.start-voyage-btn {
  background-color: #2a4a2a;
  border-color: #66ff66;
  color: #66ff66;
}

.choice-btn:hover {
  background-color: #444;
  border-color: #66ccff;
  transform: translateY(-2px);
}

.start-voyage-btn:hover {
  background-color: #3a5a3a;
  border-color: #88ff88;
}

.choice-btn:active {
  transform: translateY(0);
}
</style>
