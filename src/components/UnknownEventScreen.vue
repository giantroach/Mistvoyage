<template>
  <div class="unknown-event-screen">
    <div id="story-display">
      <div id="story-text">
        <h2>❓ 謎のイベント</h2>
        <p>霧が晴れると、その正体が明らかになりました...</p>
        <p>
          このイベントは実際には<strong>{{ eventTypeName }}</strong
          >でした！
        </p>
      </div>
    </div>

    <div class="unknown-choices">
      <button class="choice-btn continue-btn" @click="handleContinue">
        続ける
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EventType } from '@/types';

interface Props {
  resolvedEventType: EventType;
  eventTypeName: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  continue: [eventType: EventType];
}>();

const handleContinue = () => {
  emit('continue', props.resolvedEventType);
};
</script>

<style scoped>
.unknown-event-screen {
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

#story-text strong {
  color: #ffcc66;
}

.unknown-choices {
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

.continue-btn {
  background-color: #2a4a6b;
  border-color: #6699ff;
  color: #66ccff;
}

.choice-btn:hover {
  background-color: #444;
  border-color: #66ccff;
  transform: translateY(-2px);
}

.continue-btn:hover {
  background-color: #3a5a7b;
  border-color: #88aaff;
}

.choice-btn:active {
  transform: translateY(0);
}
</style>
