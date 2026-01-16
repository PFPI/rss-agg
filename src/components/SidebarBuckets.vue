<script setup>
import { ref } from 'vue';
import EditBucketModal from './EditBucketModal.vue';
import BucketLibraryModal from './BucketLibraryModal.vue';

defineProps(['categories']);
const emit = defineEmits(['add-category', 'remove-category', 'edit-category']);

const newCatName = ref('');
const newCatKeywords = ref('');
const isModalOpen = ref(false);
const showLibrary = ref(false);
const categoryToEdit = ref(null);

const submitCategory = () => {
  if (newCatName.value && newCatKeywords.value) {
    emit('add-category', newCatName.value, newCatKeywords.value);
    newCatName.value = '';
    newCatKeywords.value = '';
  }
};

const openEditModal = (cat) => {
  categoryToEdit.value = cat;
  isModalOpen.value = true;
};
</script>

<template>
  <div>
    <h3>Smart Buckets</h3>
    
    <div class="cat-form">
      <input v-model="newCatName" placeholder="Name (e.g. Forests)" />
      <input v-model="newCatKeywords" placeholder="Keywords (tree, log)" @keyup.enter="submitCategory" />
      <button class="add-btn full-width" @click="submitCategory">Create Bucket</button>
    </div>

    <button class="library-btn" @click="showLibrary = true">
      📖 Browse Team Buckets
    </button>

    <ul class="feed-list">
      <li v-for="cat in categories" :key="cat.name" class="feed-item">
        <span class="feed-name">
          {{ cat.name }}
          <span v-if="cat.isPublic" class="public-badge" title="Shared with team">👥</span>
        </span>
        <div class="actions">
          <button class="icon-btn edit-btn" @click="openEditModal(cat)">✏️</button>
          <button class="icon-btn danger-btn" @click="$emit('remove-category', cat.name)">x</button>
        </div>
      </li>
    </ul>

    <EditBucketModal 
      :is-open="isModalOpen"
      :category="categoryToEdit"
      @close="isModalOpen = false"
      @save="(p) => emit('edit-category', p.originalName, p.newName, p.newKeywords, p.isPublic)"
    />

    <BucketLibraryModal
      v-if="showLibrary"
      @close="showLibrary = false"
      @add-category="(n, k) => emit('add-category', n, k)"
    />
  </div>
</template>

<style scoped>
.cat-form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.cat-form input { padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
.add-btn { padding: 6px; cursor: pointer; background: #eee; border: 1px solid #ccc; border-radius: 4px; }
.add-btn:hover { background: #ddd; }
.full-width { width: 100%; }

.library-btn { width: 100%; margin-bottom: 15px; padding: 8px; background: #e0f7fa; color: #006064; border: 1px solid #b2ebf2; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
.library-btn:hover { background: #b2ebf2; }

.feed-list { padding: 0; margin: 0; list-style: none; }
.feed-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.feed-name { font-size: 0.85rem; color: #555; display: flex; align-items: center; gap: 5px; }
.public-badge { font-size: 0.7rem; }

.actions { display: flex; gap: 5px; }
.icon-btn { background: none; border: none; cursor: pointer; padding: 0; }
.edit-btn { font-size: 0.9rem; opacity: 0.6; }
.edit-btn:hover { opacity: 1; }
.danger-btn { color: #dc3545; border: 1px solid #dc3545; border-radius: 4px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
.danger-btn:hover { background: #dc3545; color: white; }
</style>