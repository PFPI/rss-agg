<script setup>
import { ref, onMounted } from 'vue';
import { useFeeds } from '../composables/useFeeds';

const emit = defineEmits(['close', 'add-feed']);
// We don't need 'user' here just for fetching public feeds
const { fetchPublicFeeds, userFeeds } = useFeeds(ref(null)); 

const publicFeeds = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    publicFeeds.value = await fetchPublicFeeds();
  } catch (e) {
    console.error("Error loading library:", e);
  } finally {
    loading.value = false;
  }
});

// Helper: Check if we already have this feed in our list
const isSubscribed = (url) => {
  return userFeeds.value && userFeeds.value.some(f => f.url === url);
};

const handleSubscribe = (feed) => {
  emit('add-feed', feed.url, feed.name);
};
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header>
        <h3>Team Feed Library</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </header>

      <div v-if="loading" class="loading">
        Loading shared feeds...
      </div>
      
      <div v-else-if="publicFeeds.length === 0" class="empty-state">
        <p>No feeds have been shared yet.</p>
        <small>Mark your feeds as "Public" to see them here.</small>
      </div>

      <ul v-else class="library-list">
        <li v-for="feed in publicFeeds" :key="feed.url" class="library-item">
          <div class="info">
            <strong>{{ feed.name }}</strong>
            <span class="url">{{ feed.url }}</span>
            <span class="sharer">Shared by {{ feed.sharedBy }}</span>
          </div>
          
          <button 
            v-if="isSubscribed(feed.url)" 
            class="action-btn subscribed" 
            disabled
          >
            Added
          </button>
          <button 
            v-else 
            class="action-btn add" 
            @click="handleSubscribe(feed)"
          >
            Add +
          </button>
        </li>
      </ul>
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
  background: white; padding: 0; border-radius: 8px; width: 90%; max-width: 600px;
  max-height: 80vh; display: flex; flex-direction: column;
}
header { padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
h3 { margin: 0; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }

.loading { padding: 40px; text-align: center; color: #666; }

.library-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; padding: 20px; }
.library-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; }
.info { display: flex; flex-direction: column; gap: 4px; max-width: 70%; }
.url { font-size: 0.8rem; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sharer { font-size: 0.75rem; color: #006064; background: #e0f7fa; align-self: flex-start; padding: 2px 6px; border-radius: 4px; }

.action-btn { padding: 6px 16px; border-radius: 20px; border: none; font-weight: bold; cursor: pointer; }
.action-btn.add { background: #007bff; color: white; }
.action-btn.add:hover { background: #0056b3; }
.action-btn.subscribed { background: #eee; color: #888; cursor: default; }
.empty-state { padding: 40px; text-align: center; color: #666; }
</style>