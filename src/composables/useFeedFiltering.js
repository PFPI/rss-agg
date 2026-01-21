import { ref, computed } from 'vue';

// 1. ADD 'publicItems' AND 'hiddenFeeds' HERE
export function useFeedFiltering(feedItems, savedItems, publicItems, hiddenFeeds) {
  // --- STATE ---
  const searchQuery = ref('');
  // REMOVED: const hiddenFeeds = ref([]);  <-- No longer local!
  const activeTab = ref('All'); 
  const sortBy = ref('date');
  const sortOrder = ref('desc');

  // REMOVED: const toggleFeed = ... <-- Logic moved to useFeeds.js

  const toggleSortOrder = () => {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  };

  // --- LOGIC ---
  const filteredItems = computed(() => {
    // 1. CHOOSE SOURCE
    let items;
    if (activeTab.value === 'Saved') {
      items = savedItems.value;
    } else if (activeTab.value === 'Team') {
      items = publicItems.value || []; 
    } else {
      items = feedItems.value;
    }

    // 2. FILTER HIDDEN (Using the passed-in hiddenFeeds ref)
    if (activeTab.value !== 'Saved' && activeTab.value !== 'Team' && hiddenFeeds.value.length > 0) {
       items = items.filter(item => !hiddenFeeds.value.includes(item.sourceUrl));
    }

    // 3. FILTER CATEGORY
    if (activeTab.value !== 'All' && activeTab.value !== 'Saved' && activeTab.value !== 'Team') {
      items = items.filter(item => item.categories && item.categories.includes(activeTab.value));
    }

    // 4. SEARCH
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q)
      );
    }

    // 5. SORT
    return [...items].sort((a, b) => {
      const valA = sortBy.value === 'date' ? new Date(a.pubDate) : a.title;
      const valB = sortBy.value === 'date' ? new Date(b.pubDate) : b.title;

      if (sortBy.value === 'date') {
        return sortOrder.value === 'asc' ? valA - valB : valB - valA;
      } else {
        return sortOrder.value === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
    });
  });

  const currentCategory = computed({
    get: () => ['All', 'Saved', 'Team'].includes(activeTab.value) ? '' : activeTab.value,
    set: (newValue) => { if (newValue) activeTab.value = newValue; }
  });

  return {
    searchQuery,
    // hiddenFeeds, // We don't return this because Dashboard gets it from useFeeds
    activeTab,
    sortBy,
    sortOrder,
    currentCategory,
    filteredItems,
    // toggleFeed, // REMOVED
    toggleSortOrder
  };
}