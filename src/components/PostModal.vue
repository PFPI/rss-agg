<script setup>
import { ref, watch, computed } from 'vue';
import { useSocial } from '../composables/useSocial';

const props = defineProps({
  isOpen: Boolean,
  initialText: String,
  item: Object
});

const emit = defineEmits(['close']);

const postText = ref('');
const { postToBlueSky, posting, error, success, resetSocial } = useSocial();

const LIMIT = 300;

// Computed count for the UI
const charCount = computed(() => postText.value.length);
const remaining = computed(() => LIMIT - charCount.value);

// Reset when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // Truncate initial text if it's already too long (e.g. from a long AI summary)
    postText.value = props.initialText ? props.initialText.substring(0, LIMIT) : '';
    resetSocial();
  }
});

const handleSend = async () => {
  if (!props.item) return;
  await postToBlueSky(postText.value, props.item);
  if (success.value) {
    setTimeout(() => emit('close'), 1500); 
  }
};
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Draft BlueSky Post</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <textarea 
          v-model="postText" 
          rows="5" 
          placeholder="What's happening?"
          :disabled="posting || success"
          :maxlength="LIMIT"
        ></textarea>
        
        <div class="char-counter" :class="{ 'warning': remaining < 20 }">
           {{ remaining }} characters left
        </div>
        
        <div class="preview-card" v-if="item">
            <div class="card-meta">{{ item.source }}</div>
            <div class="card-title">{{ item.title }}</div>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>
        <div v-if="success" class="success-msg">✓ Posted successfully!</div>
      </div>

      <div class="modal-actions">
        <button @click="$emit('close')" :disabled="posting">Cancel</button>
        <button 
          class="post-btn" 
          @click="handleSend" 
          :disabled="posting || success || !postText"
        >
          {{ posting ? 'Sending...' : 'Post to BlueSky' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: white; width: 90%; max-width: 500px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.modal-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f0f9ff; }
.modal-body { padding: 15px; display: flex; flex-direction: column; gap: 10px; }
.modal-actions { padding: 15px; background: #f9fafb; display: flex; justify-content: flex-end; gap: 10px; }
textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical; box-sizing: border-box; }

/* Counter Styles */
.char-counter { text-align: right; font-size: 0.8rem; color: #6b7280; margin-top: -5px; }
.char-counter.warning { color: #d97706; font-weight: bold; }

.preview-card { border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px; background: #f9fafb; font-size: 0.9em; }
.card-meta { color: #6b7280; font-size: 0.8em; margin-bottom: 4px; }
.card-title { font-weight: bold; color: #1f2937; }
.error-msg { color: #dc2626; font-size: 0.9em; }
.success-msg { color: #059669; font-weight: bold; text-align: center; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; }
.post-btn { background: #0085ff; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; }
.post-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>