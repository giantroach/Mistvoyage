<template>
  <div v-if="show" class="modal" @click="handleBackdropClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>設定</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="setting-item">
          <label for="auto-save-toggle">オートセーブ</label>
          <input
            type="checkbox"
            id="auto-save-toggle"
            v-model="localSettings.autoSave"
            @change="updateSettings"
          />
        </div>
        <div class="setting-item">
          <label for="battle-speed">戦闘速度</label>
          <select
            id="battle-speed"
            v-model="localSettings.battleSpeed"
            @change="updateSettings"
          >
            <option value="slow">遅い</option>
            <option value="normal">普通</option>
            <option value="fast">速い</option>
          </select>
        </div>
        <div class="setting-item">
          <label for="text-size">文字サイズ</label>
          <select
            id="text-size"
            v-model="localSettings.textSize"
            @change="updateSettings"
          >
            <option value="small">小</option>
            <option value="normal">標準</option>
            <option value="large">大</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { GameSettings } from '@/stores/types';

interface Props {
  show: boolean;
  settings: GameSettings;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  updateSettings: [settings: GameSettings];
}>();

const localSettings = ref<GameSettings>({ ...props.settings });

watch(
  () => props.settings,
  newSettings => {
    localSettings.value = { ...newSettings };
  },
  { deep: true }
);

const close = () => {
  emit('close');
};

const handleBackdropClick = () => {
  close();
};

const updateSettings = () => {
  emit('updateSettings', { ...localSettings.value });
};
</script>

<style scoped>
.modal {
  display: block;
  position: fixed;
  z-index: 2000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
}

.modal-content {
  background-color: #1a1a1a;
  margin: 10% auto;
  padding: 0;
  border: 2px solid #66ccff;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(102, 204, 255, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #444;
  background-color: #2a2a2a;
  border-radius: 6px 6px 0 0;
}

.modal-header h2 {
  margin: 0;
  color: #66ccff;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  color: #ff6666;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: #ff9999;
  transform: scale(1.1);
}

.modal-body {
  padding: 1.5rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #2a2a2a;
  border-radius: 6px;
  border: 1px solid #444;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  color: #ccc;
  font-size: 1rem;
  font-weight: 500;
}

.setting-item input[type='checkbox'] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #66ccff;
}

.setting-item select {
  background-color: #1a1a1a;
  color: #ccc;
  border: 1px solid #666;
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  min-width: 120px;
}

.setting-item select:hover {
  border-color: #66ccff;
}

.setting-item select:focus {
  outline: none;
  border-color: #66ccff;
  box-shadow: 0 0 5px rgba(102, 204, 255, 0.3);
}
</style>
