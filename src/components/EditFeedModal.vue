<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  feed: Object // { url, name, isPublic }
});

const emit = defineEmits(['close', 'save']);

const formName = ref('');
const isPublic = ref(false);

watch(() => props.feed, (newVal) => {
  if (newVal) {
    formName.value = newVal.name;
    isPublic.value = newVal.isPublic || false;
  }
}, { immediate: true });

const handleSave = () => {
  emit('save', {
    url: props.feed.url,
    name: formName.value,
    isPublic: isPublic.value
  });
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>Edit Feed Source</h3>
      
      <div class="form-group">
        <label>Display Name</label>
        <input v-model="formName" placeholder="e.g. EPA Updates" />
      </div>

      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" v-model="isPublic" />
          Share with Team Library
        </label>
        <small>Checking this makes this feed visible to other users in your organization.</small>
      </div>

      <div class="meta-info">
        <small>URL: {{ feed?.url }}</small>
      </div>

      <div class="actions">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button class="save-btn" @click="handleSave">Save Changes</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex; justify-content: center; align-items: center; z-index: 1000;
}
.modal-content {
  background: white; padding: 25px; border-radius: 8px; width: 90%; max-width: 450px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
}
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
.checkbox-group label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.checkbox-group small { display: block; margin-top: 5px; color: #666; margin-left: 24px; }
input[type="text"] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
.meta-info { margin-bottom: 20px; color: #999; font-size: 0.8rem; word-break: break-all; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.save-btn { background-color: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.cancel-btn { background: none; border: 1px solid #ccc; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
</style>