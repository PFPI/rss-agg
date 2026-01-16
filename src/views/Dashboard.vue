<script setup>
import { onMounted, watch } from 'vue'; // Removed ref, computed
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useFeeds } from '../composables/useFeeds';
import { useSaved } from '../composables/useSaved';
// 1. IMPORT NEW COMPOSABLE
import { useFeedFiltering } from '../composables/useFeedFiltering';

// Components
import Sidebar from '../components/Sidebar.vue';
import FeedStream from '../components/FeedStream.vue'; 

const { user, logout } = useAuth();
const router = useRouter();
const { 
  feedItems, userFeeds, categories, loading: feedsLoading, systemFeeds,
  loadUserPreferences, addFeed, removeFeed, addCategory, editCategory, 
  removeCategory, refreshAllFeeds, importOPML, exportOPML, updateFeed 
} = useFeeds(user);

// 1. Destructure publicItems and fetchPublicItems
const { savedItems, publicItems, fetchSavedItems, fetchPublicItems, loading: savedLoading } = useSaved(user);

// 2. Pass publicItems to the filter engine
const {
  searchQuery, hiddenFeeds, activeTab, sortBy, sortOrder, currentCategory, 
  filteredItems, toggleFeed, toggleSortOrder
} = useFeedFiltering(feedItems, savedItems, publicItems); // <--- Pass publicItems here!


// --- AUTH & WATCHERS ---
const handleLogout = async () => {
  try { await logout(); router.push('/login'); } catch (e) { console.error(e); }
};

watch(user, async (newUser) => {
  if (newUser) {
    await loadUserPreferences();
    await fetchSavedItems();
    await fetchPublicItems(); // <--- Fetch team items on load
  }
}, { immediate: true });

// 3. Watch for tab switch to 'Team'
watch(activeTab, (newTab) => {
  if (newTab === 'Saved') fetchSavedItems();
  if (newTab === 'Team') fetchPublicItems(); // <--- Refresh when clicking Team tab
});

watch(activeTab, (newTab) => {
  if (newTab === 'Saved') fetchSavedItems();
});
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
        :news-feeds="systemFeeds" 
        :categories="categories"
        :hidden-feeds="hiddenFeeds"
        :loading="feedsLoading" 
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
            <button :class="['tab', { active: activeTab === 'All' }]" @click="activeTab = 'All'">Stream</button>
            <button :class="['tab', { active: activeTab === 'Saved' }]" @click="activeTab = 'Saved'">★ Saved</button>
            <button :class="['tab', { active: activeTab === 'Team' }]" @click="activeTab = 'Team'">👥 Team Picks</button>
            
            <div class="vertical-divider"></div>

            <div class="select-wrapper">
              <select v-model="currentCategory" class="topic-select" :class="{ active: currentCategory }">
                <option value="" disabled selected>📂 Filter by Topic...</option>
                <option v-for="cat in categories" :key="cat.name" :value="cat.name">
                  {{ cat.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="sort-controls">
            <label>Sort by:</label>
            <select v-model="sortBy">
              <option value="date">Date</option>
              <option value="title">Title</option>
            </select>
            <button class="sort-btn" @click="toggleSortOrder">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </button>
          </div>
        </div>

        <FeedStream 
          :items="filteredItems" 
          :loading="activeTab === 'Saved' ? savedLoading : feedsLoading" 
        />
        
      </div>
    </main>
  </div>
</template>

<style scoped>
/* (All styles remain exactly the same as before) */
.vertical-divider { width: 1px; height: 24px; background: #ddd; margin: 0 5px; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 20px; margin-bottom: 20px; }
main { display: grid; grid-template-columns: 250px 1fr; gap: 20px; }
.search-bar { padding: 5px; margin-right: 10px; width: 200px; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.logout-btn { background-color: #f8f9fa; border: 1px solid #ccc; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
.controls-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.tabs { display: flex; gap: 10px; align-items: center; flex-wrap: nowrap; }
.tab { background: none; border: none; padding: 8px 16px; cursor: pointer; font-size: 1rem; color: #666; border-radius: 20px; white-space: nowrap; transition: all 0.2s; }
.tab.active { background-color: #e0f7fa; color: #006064; font-weight: bold; }
.tab:hover { background-color: #f0f0f0; }
.select-wrapper { position: relative; min-width: 180px; }
.topic-select { width: 100%; padding: 8px 12px; border-radius: 20px; border: 1px solid #ccc; background-color: white; font-size: 0.95rem; color: #555; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 10px center; background-size: 16px; padding-right: 30px; }
.topic-select:hover { border-color: #999; }
.topic-select:focus { outline: none; border-color: #006064; }
.topic-select.active { background-color: #e0f7fa; border-color: #006064; color: #006064; font-weight: bold; }
.sort-controls { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #666; }
.sort-controls select { padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; background: white; }
.sort-btn { background: none; border: 1px solid #ccc; border-radius: 4px; padding: 4px 8px; cursor: pointer; min-width: 30px; }
.sort-btn:hover { background: #f0f0f0; }
</style>