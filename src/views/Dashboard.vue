<script setup>
import { onMounted, computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useFeeds } from '../composables/useFeeds';

// Components
import Sidebar from '../components/Sidebar.vue';
import FeedStream from '../components/FeedStream.vue'; // <--- New Import

const { user, logout } = useAuth();
const { 
  feedItems, 
  userFeeds, 
  categories,
  loading, 
  loadUserPreferences, 
  addFeed, 
  removeFeed, 
  addCategory,
  editCategory,
  removeCategory,
  refreshAllFeeds,
  importOPML,
  exportOPML, 
  updateFeed, 
} = useFeeds(user);

const router = useRouter();

// --- UI State ---
const searchQuery = ref('');
const hiddenFeeds = ref([]); 
const activeTab = ref('All'); 
const sortBy = ref('date');
const sortOrder = ref('desc');

// --- Filtering Logic ---
// (We calculate the full filtered list here, and pass it to FeedStream to paginate)
const filteredItems = computed(() => {
  let items = feedItems.value;

  // 1. Filter out hidden sources
  if (hiddenFeeds.value.length > 0) {
    items = items.filter(item => !hiddenFeeds.value.includes(item.sourceUrl));
  }

  // 2. Filter by Category Tab
  if (activeTab.value !== 'All') {
    items = items.filter(item => item.categories && item.categories.includes(activeTab.value));
  }

  // 3. Filter by Search Keywords
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.description.toLowerCase().includes(q)
    );
  }

  // 4. Sort
  const sorted = [...items].sort((a, b) => {
    if (sortBy.value === 'date') {
      const dateA = new Date(a.pubDate);
      const dateB = new Date(b.pubDate);
      return sortOrder.value === 'asc'
        ? dateA - dateB
        : dateB - dateA;
    } else if (sortBy.value === 'title') {
      return sortOrder.value === 'asc'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    }
    return 0;
  });

  return sorted;
});

// --- Actions ---
const toggleFeed = (url) => {
  if (hiddenFeeds.value.includes(url)) {
    hiddenFeeds.value = hiddenFeeds.value.filter(u => u !== url);
  } else {
    hiddenFeeds.value.push(url);
  }
};

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
};

const handleLogout = async () => {
  try {
    await logout();
    router.push('/login');
  } catch (e) {
    console.error("Logout failed", e);
  }
};

watch(user, (newUser) => {
  if (newUser) {
    loadUserPreferences();
  }
}, { immediate: true });
</script>

<template>
  <div class="container">
    <header>
      <h1>Policy Stream</h1>
      <div class="header-actions">
        <input v-model="searchQuery" placeholder="Search keywords..." class="search-bar" />
        <button class="logout-btn" @click="handleLogout">Logout</button>
      </div>
    </header>

    <main>
<Sidebar 
  :feeds="userFeeds" 
  :categories="categories"
  :hidden-feeds="hiddenFeeds"
  :loading="loading" 
  @add-feed="addFeed"
  @remove-feed="removeFeed"
  @add-category="addCategory"
  @edit-category="editCategory" 
  @remove-category="removeCategory"
  @toggle-feed="toggleFeed"
  @refresh="refreshAllFeeds"
  @import-opml="importOPML" 
  @export-opml="exportOPML"
  @update-feed="updateFeed"
/>

      <div class="content">
        <div class="controls-row">
          <div class="tabs">
            <button
              :class="['tab', { active: activeTab === 'All' }]"
              @click="activeTab = 'All'">
              All
            </button>
            <button
              v-for="cat in categories"
              :key="cat.name"
              :class="['tab', { active: activeTab === cat.name }]"
              @click="activeTab = cat.name">
              {{ cat.name }}
            </button>
          </div>

          <div class="sort-controls">
            <label>Sort by:</label>
            <select v-model="sortBy">
              <option value="date">Date</option>
              <option value="title">Title</option>
            </select>
            <button class="sort-btn" @click="toggleSortOrder" title="Toggle Sort Order">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </button>
          </div>
        </div>

        <FeedStream 
          :items="filteredItems" 
          :loading="loading" 
        />
        
      </div>
    </main>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 20px; margin-bottom: 20px; }
main { display: grid; grid-template-columns: 250px 1fr; gap: 20px; }
.search-bar { padding: 5px; margin-right: 10px; width: 200px; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.logout-btn { background-color: #f8f9fa; border: 1px solid #ccc; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
.controls-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.tabs { display: flex; gap: 10px; overflow-x: auto; }
.tab { background: none; border: none; padding: 8px 16px; cursor: pointer; font-size: 1rem; color: #666; border-radius: 20px; white-space: nowrap; }
.tab.active {  background-color: #e0f7fa; color: #006064; font-weight: bold; }
.tab:hover { background-color: #f0f0f0; }
.sort-controls { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #666; }
.sort-controls select { padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; background: white; }
.sort-btn { background: none; border: 1px solid #ccc; border-radius: 4px; padding: 4px 8px; cursor: pointer; min-width: 30px; }
.sort-btn:hover { background: #f0f0f0; }
</style>