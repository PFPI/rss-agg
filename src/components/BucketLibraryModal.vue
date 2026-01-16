<script setup>
import { ref, onMounted } from 'vue';
import { useFeeds } from '../composables/useFeeds';

const emit = defineEmits(['close', 'add-category']);
const { fetchPublicBuckets, categories } = useFeeds(ref(null)); 

const publicBuckets = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    publicBuckets.value = await fetchPublicBuckets();
  } catch (e) {
    console.error("Error loading bucket library:", e);
  } finally {
    loading.value = false;
  }
});

const isSubscribed = (name) => {
  return categories.value && categories.value.some(c => c.name === name);
};

const handleAdd = (bucket) => {
  // Convert array back to string for the addCategory function
  const keywordsStr = bucket.keywords.join(', ');
  emit('add-category', bucket.name, keywordsStr);
};
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header>
        <h3>Team Bucket Library</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </header>

      <div v-if="loading" class="loading">Loading shared buckets...</div>
      
      <div v-else-if="publicBuckets.length === 0" class="empty-state">
        <p>No buckets shared yet.</p>
        <small>Share your smart buckets to help the team filter noise.</small>
      </div>

      <ul v-else class="library-list">
        <li v-for="bucket in publicBuckets" :key="bucket.name" class="library-item">
          <div class="info">
            <strong>{{ bucket.name }}</strong>
            <small class="keywords">{{ bucket.keywords.join(', ') }}</small>
            <span class="sharer">Shared by {{ bucket.sharedBy }}</span>
          </div>
          
          <button v-if="isSubscribed(bucket.name)" class="action-btn subscribed" disabled>Added</button>
          <button v-else class="action-btn add" @click="handleAdd(bucket)">Add +</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: white; padding: 0; border-radius: 8px; width: 90%; max-width: 600px; max-height: 80vh; display: flex; flex-direction: column; }
header { padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
h3 { margin: 0; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.loading { padding: 40px; text-align: center; color: #666; }
.library-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; padding: 20px; }
.library-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; }
.info { display: flex; flex-direction: column; gap: 4px; max-width: 70%; }
.keywords { color: #666; font-size: 0.85rem; }
.sharer { font-size: 0.75rem; color: #006064; background: #e0f7fa; align-self: flex-start; padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
.action-btn { padding: 6px 16px; border-radius: 20px; border: none; font-weight: bold; cursor: pointer; }
.action-btn.add { background: #007bff; color: white; }
.action-btn.add:hover { background: #0056b3; }
.action-btn.subscribed { background: #eee; color: #888; cursor: default; }
.empty-state { padding: 40px; text-align: center; color: #666; }
</style>