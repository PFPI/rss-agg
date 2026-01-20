<script setup>
import { ref } from 'vue';
import SourceHelpModal from './SourceHelpModal.vue';
import EditFeedModal from './EditFeedModal.vue';
import FeedLibraryModal from './FeedLibraryModal.vue';

// NEW: Accept 'newsFeeds' prop
defineProps(['feeds', 'hiddenFeeds', 'newsFeeds']);
const emit = defineEmits(['add-feed', 'remove-feed', 'toggle-feed', 
                          'update-feed', 'import-opml', 'export-opml']);

const newUrl = ref('');
const fileInput = ref(null); 
const showHelp = ref(false);
const showLibrary = ref(false);
const editingFeed = ref(null);

const submit = () => {
  if(newUrl.value) {
    emit('add-feed', newUrl.value);
    newUrl.value = '';
  }
}

const handleEditSave = (updatedFeed) => {
  emit('update-feed', updatedFeed.url, updatedFeed.name, updatedFeed.isPublic);
};

const triggerImport = () => {
  fileInput.value.click();
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) emit('import-opml', file);
  event.target.value = '';
};
</script>

<template>
  <div>
    <div class="section-header">
      <h3>News APIs</h3>
    </div>
    
    <ul class="feed-list system-list">
      <li v-for="feed in newsFeeds" :key="feed.url" class="feed-item" :class="{ 'muted': hiddenFeeds.includes(feed.url) }">
        <div class="feed-info">
          <button class="icon-btn toggle-btn" @click="$emit('toggle-feed', feed.url)" :title="hiddenFeeds.includes(feed.url) ? 'Show' : 'Hide'">
            <span v-if="hiddenFeeds.includes(feed.url)">👁️</span>
            <span v-else>✅</span>
          </button>
          
          <span class="feed-name">
            {{ feed.name }}
            <span class="system-badge">OFFICIAL</span>
          </span>
        </div>
        </li>
    </ul>

    <hr class="divider">

    <div class="header-row">
      <h3>RSS Feeds</h3>
      <button type="button" class="help-btn" @click="showHelp = true" title="How to find sources">?</button>
    </div>

    <div class="input-group">
      <input v-model="newUrl" placeholder="RSS URL" @keyup.enter="submit" />
      <button class="add-btn" @click="submit">+</button>
    </div>

    <button class="library-btn" @click="showLibrary = true">
      📖 Browse Team Library
    </button>

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
      <li v-for="feed in feeds" :key="feed.url" class="feed-item" :class="{ 'muted': hiddenFeeds.includes(feed.url) }">
        <div class="feed-info">
          <button class="icon-btn toggle-btn" @click="$emit('toggle-feed', feed.url)" title="Show/Hide">
            <span v-if="hiddenFeeds.includes(feed.url)">👁️</span>
            <span v-else>✅</span>
          </button>
          
          <span v-if="feed.isPublic" class="public-badge" title="Shared with team">👥</span>

          <span class="feed-name" :title="feed.name">
            {{ feed.name }}
            
          </span>
        </div>

        <div class="item-actions">
          <button class="icon-btn edit-btn" @click="editingFeed = feed" title="Edit Settings">⚙️</button>
          <button class="icon-btn danger-btn" @click="$emit('remove-feed', feed)" title="Remove">x</button>
        </div>
      </li>
    </ul>

    <SourceHelpModal v-if="showHelp" @close="showHelp = false" />
    
    <EditFeedModal 
      :is-open="!!editingFeed" 
      :feed="editingFeed"
      @close="editingFeed = null"
      @save="handleEditSave"
    />

    <FeedLibraryModal 
      v-if="showLibrary"
      @close="showLibrary = false"
      @add-feed="(url, name) => emit('add-feed', url, name)"
    />
  </div>
</template>

<style scoped>
/* HTML STYLES */
h3 { margin: 0; font-size: 1.1rem; }

/* LAYOUT */
.section-header { margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
.divider { border: 0; border-top: 1px solid #eee; margin: 15px 0; }
.system-list { margin-bottom: 15px; }

/* BADGES */
.system-badge { font-size: 0.65rem; background: #e0e7ff; color: #4338ca; padding: 1px 5px; border-radius: 4px; margin-left: 6px; font-weight: bold; }
.public-badge { font-size: 0.7rem; }

/* BUTTONS */
.add-btn { padding: 5px 12px; cursor: pointer; background: #eee; border: 1px solid #ccc; border-radius: 4px; }
.add-btn:hover { background: #ddd; }

.danger-btn { color: #dc3545; border: 1px solid #dc3545; border-radius: 4px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
.danger-btn:hover { background: #dc3545; color: white; }

.edit-btn { font-size: 0.9rem; opacity: 0.5; }
.edit-btn:hover { opacity: 1; }

.toggle-btn { font-size: 1rem; width: 20px; }

.help-btn { background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; border-radius: 50%; width: 20px; height: 20px; font-size: 0.75rem;  font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.help-btn:hover { background: #d1d5db; color: #374151; border-color: #9ca3af; }

.library-btn { width: 100%; margin-bottom: 15px; padding: 8px; background: #e0f7fa; color: #006064; border: 1px solid #b2ebf2; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
.library-btn:hover { background: #b2ebf2; }

.opml-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 0.85rem; padding: 6px 10px; background-color: #ffffff; border: 1px solid #ddd; border-radius: 4px; color: #555; cursor: pointer; transition: all 0.2s; }
.opml-btn:hover { background-color: #f8f9fa; border-color: #bbb; color: #333; }

/* LIST ITEMS */
.feed-list { padding: 0; margin: 0; list-style: none; }
.feed-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.feed-item.muted { opacity: 0.5; }
.feed-info { display: flex; align-items: center; gap: 8px; overflow: hidden; }
.feed-name { font-size: 0.85rem; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }

.header-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.input-group { display: flex; gap: 5px; margin-bottom: 15px; }
.input-group input { flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
.item-actions { display: flex; gap: 4px; }
.opml-actions { display: flex; gap: 8px; margin-bottom: 15px; }
.icon { font-size: 1rem; line-height: 1; }
.icon-btn { background: none; border: none; cursor: pointer; padding: 0; }
</style>