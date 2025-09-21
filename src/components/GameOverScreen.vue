<template>
  <div class="game-over-screen">
    <div id="story-display">
      <div id="story-text">
        <h2 v-if="isVictory">🎉 勝利！</h2>
        <h2 v-else>💀 ゲームオーバー</h2>
        <p v-if="isVictory">すべてのチャプターを制覇しました！</p>
        <p v-else>あなたの冒険は終わりを告げました...</p>
      </div>
    </div>

    <div class="game-over-choices">
      <button class="choice-btn restart-btn" @click="handleRestart">
        新しいゲームを開始
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isVictory: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  restart: [];
}>();

const handleRestart = () => {
  emit('restart');
};
</script>

<style scoped>
.game-over-screen {
  padding: 1rem;
  text-align: center;
}

#story-display {
  margin-bottom: 2rem;
}

#story-text {
  background-color: #2a2a2a;
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid #444;
}

#story-text h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.game-over-choices {
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

.restart-btn {
  background-color: #2a4a2a;
  border-color: #66ff66;
  color: #66ff66;
}

.choice-btn:hover {
  background-color: #444;
  border-color: #66ccff;
  transform: translateY(-2px);
}

.restart-btn:hover {
  background-color: #3a5a3a;
  border-color: #88ff88;
}

.choice-btn:active {
  transform: translateY(0);
}
</style>
