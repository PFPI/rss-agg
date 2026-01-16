import { ref, computed } from 'vue';

export function useFeedFiltering(feedItems, savedItems, publicItems) {
  // --- STATE ---
  const searchQuery = ref('');
  const hiddenFeeds = ref([]); 
  const activeTab = ref('All'); 
  const sortBy = ref('date');
  const sortOrder = ref('desc');

  // --- ACTIONS ---
  const toggleFeed = (url) => {
    console.log("🔘 Toggle Request for:", url); // <--- DEBUG LOG
    console.log("   Current Hidden List:", hiddenFeeds.value);

    if (hiddenFeeds.value.includes(url)) {
      hiddenFeeds.value = hiddenFeeds.value.filter(u => u !== url);
      console.log("   Action: Un-hiding (Removed from list)");
    } else {
      hiddenFeeds.value.push(url);
      console.log("   Action: Hiding (Added to list)");
    }
  };

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
      items = publicItems.value || []; // Handle Team Tab
    } else {
      items = feedItems.value;
    }
    // 2. FILTER HIDDEN
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
    get: () => ['All', 'Saved'].includes(activeTab.value) ? '' : activeTab.value,
    set: (newValue) => { if (newValue) activeTab.value = newValue; }
  });

  return {
    searchQuery,
    hiddenFeeds,
    activeTab,
    sortBy,
    sortOrder,
    currentCategory,
    filteredItems,
    toggleFeed,
    toggleSortOrder
  };
}