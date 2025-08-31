<template>
  <div id="status-bar">
    <span id="save-status" :style="{ color: messageColor }">
      {{ message }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  message?: string;
  isError?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  isError: false,
});

const message = ref('');
const messageColor = ref('#66ccff');

watch(
  () => [props.message, props.isError],
  ([newMessage, newIsError]) => {
    if (newMessage) {
      message.value = newMessage;
      messageColor.value = newIsError ? '#ff6666' : '#66ccff';

      // Clear message after 3 seconds
      setTimeout(() => {
        message.value = '';
      }, 3000);
    }
  },
  { immediate: true }
);

// Expose method for external calls
const showMessage = (msg: string, isError = false) => {
  message.value = msg;
  messageColor.value = isError ? '#ff6666' : '#66ccff';

  setTimeout(() => {
    message.value = '';
  }, 3000);
};

defineExpose({
  showMessage,
});
</script>

<style scoped>
#status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background-color: #2a2a2a;
  border-top: 1px solid #444;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  z-index: 100;
}

#save-status {
  font-size: 0.8rem;
  transition: color 0.3s ease;
}
</style>
