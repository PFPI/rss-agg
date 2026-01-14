<script setup>
import { ref } from 'vue';
import SourceHelpModal from './SourceHelpModal.vue';

defineProps(['feeds', 'hiddenFeeds']);
const emit = defineEmits(['add-feed', 'remove-feed', 'toggle-feed', 'import-opml', 'export-opml']);

const newUrl = ref('');
const fileInput = ref(null); 
const showHelp = ref(false);

const submit = () => {
  if(newUrl.value) {
    emit('add-feed', newUrl.value);
    newUrl.value = '';
  }
}

const triggerImport = () => {
  fileInput.value.click();
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    emit('import-opml', file);
  }
  event.target.value = '';
};
</script>

<template>
  <div>
    <div class="header-row">
      <h3>Sources</h3>
      <button type="button" class="help-btn" @click="showHelp = true" title="How to find sources">
        ?
      </button>
    </div>

    <div class="input-group">
      <input v-model="newUrl" placeholder="RSS URL" @keyup.enter="submit" />
      <button class="add-btn" @click="submit">+</button>
    </div>

    <div class="opml-actions">
      <input 
        type="file" 
        ref="fileInput" 
        accept=".opml,.xml" 
        style="display: none" 
        @change="handleFileChange" 
      />
      
      <button class="opml-btn" @click="triggerImport">
        <span class="icon">📂</span> Import
      </button>
      
      <button class="opml-btn" @click="$emit('export-opml')">
        <span class="icon">💾</span> Export
      </button>
    </div>
    
    <ul class="feed-list">
      <li v-for="feed in feeds" :key="feed" class="feed-item" :class="{ 'muted': hiddenFeeds.includes(feed) }">
        <div class="feed-info">
          <button class="icon-btn toggle-btn" @click="$emit('toggle-feed', feed)">
            <span v-if="hiddenFeeds.includes(feed)">👁️</span>
            <span v-else>✅</span>
          </button>
          <span class="feed-name" :title="feed">{{ feed }}</span>
        </div>
        <button class="icon-btn danger-btn" @click="$emit('remove-feed', feed)">x</button>
      </li>
    </ul>

    <SourceHelpModal v-if="showHelp" @close="showHelp = false" />
  </div>
</template>

<style scoped>
/* NEW: Header Alignment */
.header-row {
  display: flex;
  align-items: center;
  gap: 8px; /* Space between text and button */
  margin-bottom: 10px;
}

h3 {
  margin: 0; /* Remove default margin so it aligns nicely */
  font-size: 1.1rem;
}

.help-btn {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 50%;
  width: 20px;       /* Slightly smaller to fit next to header */
  height: 20px;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.help-btn:hover {
  background: #d1d5db;
  color: #374151;
  border-color: #9ca3af;
}

/* Existing Styles ... */
.input-group { display: flex; gap: 5px; margin-bottom: 15px; }
.input-group input { flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
.add-btn { padding: 5px 12px; cursor: pointer; background: #eee; border: 1px solid #ccc; border-radius: 4px; }
.add-btn:hover { background: #ddd; }

.opml-actions { display: flex; gap: 8px; margin-bottom: 15px; }
.opml-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 0.85rem; padding: 6px 10px; background-color: #ffffff; border: 1px solid #ddd; border-radius: 4px; color: #555; cursor: pointer; transition: all 0.2s; }
.opml-btn:hover { background-color: #f8f9fa; border-color: #bbb; color: #333; }
.icon { font-size: 1rem; line-height: 1; }

/* List Styles */
.feed-list { padding: 0; margin: 0; list-style: none; }
.feed-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.feed-item.muted { opacity: 0.5; }
.feed-info { display: flex; align-items: center; gap: 8px; overflow: hidden; }
.feed-name { font-size: 0.85rem; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
.icon-btn { background: none; border: none; cursor: pointer; padding: 0; }
.toggle-btn { font-size: 1rem; width: 20px; }
.danger-btn { color: #dc3545; border: 1px solid #dc3545; border-radius: 4px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
.danger-btn:hover { background: #dc3545; color: white; }
</style>