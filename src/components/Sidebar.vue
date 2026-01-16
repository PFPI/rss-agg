<script setup>
import SidebarSources from './SidebarSources.vue';
import SidebarBuckets from './SidebarBuckets.vue';

defineProps(['feeds', 'loading', 'hiddenFeeds', 'categories', 'newsFeeds']);
defineEmits([
  'add-feed', 'remove-feed', 'refresh', 'toggle-feed', 
  'add-category', 'remove-category', 'edit-category', 'update-feed'
]);
</script>

<template>
  <div class="sidebar-container">
<SidebarSources 
      :feeds="feeds"
      :news-feeds="newsFeeds" 
      :hidden-feeds="hiddenFeeds"
      @add-feed="$emit('add-feed', $event)"
      @remove-feed="$emit('remove-feed', $event)"
      @toggle-feed="$emit('toggle-feed', $event)"
      @update-feed="(u, n, p) => $emit('update-feed', u, n, p)" 
      @import-opml="$emit('import-opml', $event)"  
      @export-opml="$emit('export-opml')"
    />

    <button class="refresh-btn" @click="$emit('refresh')" :disabled="loading">
      {{ loading ? 'Updating...' : 'Refresh All' }}
    </button>

    <hr class="divider" />

<SidebarBuckets 
      :categories="categories"
      @add-category="(n, k) => $emit('add-category', n, k)"
      @edit-category="(o, n, k, p) => $emit('edit-category', o, n, k, p)"
      @remove-category="$emit('remove-category', $event)"
    />
  </div>
</template>

<style scoped>
.sidebar-container { 
  padding-right: 20px; 
  border-right: 1px solid #eee; 
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.refresh-btn { width: 100%; padding: 8px; background-color: #f8f9fa; border: 1px solid #ddd; cursor: pointer; }
.divider { width: 100%; border: 0; border-top: 1px solid #eee; margin: 10px 0; }
</style>