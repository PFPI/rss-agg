<script setup>
import { ref, onMounted, watch } from 'vue';
// 1. ADD 'isValid' to imports
import { formatDistanceToNow, isPast, parseISO, isValid } from 'date-fns';
import { useSummaries } from '../composables/useSummaries';
import { useSaved } from '../composables/useSaved';
import { useAuth } from '../composables/useAuth';

const props = defineProps(['item']);

const { user } = useAuth();
const { fetchSummary, generateAndSaveSummary } = useSummaries();
const { toggleSave, isSaved } = useSaved(user);

const summary = ref(null);
const loading = ref(false);
const checkingCache = ref(true);
const error = ref(null);

// 2. NEW: Safe Date Formatter
const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (!isValid(date)) return ''; // Return empty string if invalid
  return formatDistanceToNow(date) + ' ago';
};

const loadSummary = async () => {
  summary.value = null;
  error.value = null;
  checkingCache.value = true;

  const cached = await fetchSummary(props.item);
  if (cached) summary.value = cached;
  
  checkingCache.value = false;
};

onMounted(loadSummary);
watch(() => props.item, loadSummary);

const handleSummarize = async () => {
  loading.value = true;
  error.value = null;

  try {
    summary.value = await generateAndSaveSummary(props.item);
    
    if (!isSaved(props.item)) {
      await toggleSave(props.item);
    }

  } catch (e) {
    error.value = "Could not generate summary. Try again.";
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const getDeadlineStatus = (dateString) => {
  if (!dateString) return null;
  const date = parseISO(dateString);
  if (isPast(date)) return 'expired';
  return 'active';
};
</script>

<template>
  <article 
    class="card" 
    :class="{ 
      'official-doc': item.isOfficial, 
      'guardian-news': item.source === 'The Guardian',
      'nyt-news': item.source === 'New York Times'
    }"
  >
    <div v-if="item.image" class="card-image">
      <img :src="item.image" alt="Article Thumbnail" loading="lazy" />
    </div>

    <div class="meta-header">
      <div class="meta-left">
        <span class="source-tag">{{ item.source }}</span>
        
        <span class="date">{{ getRelativeTime(item.pubDate) }}</span>
        
        <span v-if="item.agency" class="agency-tag">{{ item.agency }}</span>
      </div>
      
      <button 
        class="icon-btn save-btn" 
        @click="toggleSave(item)" 
        :class="{ 'saved': isSaved(item) }"
        :title="isSaved(item) ? 'Remove from Saved' : 'Save for Later'"
      >
        {{ isSaved(item) ? '★ Saved' : '☆ Save' }}
      </button>
    </div>

    <div v-if="item.dueDate" class="deadline-banner">
      📅 Comments Due: <strong>{{ item.dueDate }}</strong>
      <span v-if="getDeadlineStatus(item.dueDate) === 'active'" class="urgent-badge">OPEN</span>
    </div>
    
    <h3><a :href="item.link" target="_blank">{{ item.title }}</a></h3>
    
    <p v-if="!summary">{{ item.description }}</p>

    <div v-if="summary" class="ai-result">
      <div class="summary-header">
        <strong>⚡ AI Analysis</strong>
        <span class="badge" :class="summary.relevance?.toLowerCase()">{{ summary.relevance }} Priority</span>
      </div>
      <p class="summary-text">{{ summary.summary }}</p>
      
      <div class="tweet-box">
        <small>Draft Tweet:</small>
        <p>"{{ summary.tweet }}"</p>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div class="actions">
      <span v-if="checkingCache" class="checking-msg">Checking knowledge base...</span>

      <button 
        v-else-if="!summary" 
        class="ai-btn" 
        @click="handleSummarize" 
        :disabled="loading"
      >
        {{ loading ? 'Analyzing...' : '⚡ Summarize & Save' }}
      </button>
      
      <span v-else class="saved-indicator">
        {{ summary.fromCache ? 'Loaded from Knowledge Base' : 'Saved to Knowledge Base' }}
      </span>
    </div>
  </article>
</template>

<style scoped>
/* Keep existing styles */
.card { border: 1px solid #ddd; padding: 15px; border-radius: 4px; background: #fff; display: flex; flex-direction: column; gap: 10px; }
.meta { font-size: 0.8em; color: #666; display: flex; justify-content: space-between; }
.source-tag { background: #e0f7fa; padding: 2px 5px; border-radius: 3px; color: #006064; }
h3 { margin: 0; font-size: 1.1em; }
p { margin: 0; color: #444; line-height: 1.4; }
.actions { margin-top: auto; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; min-height: 36px; }
.saved-indicator { font-size: 0.8rem; color: #166534; font-weight: bold; }
.checking-msg { font-size: 0.8rem; color: #999; font-style: italic; }
.ai-btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 0.9rem; transition: opacity 0.2s; }
.ai-btn:hover { opacity: 0.9; }
.ai-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ai-result { background: #fdfcff; border: 1px solid #e0e7ff; border-radius: 6px; padding: 12px; margin-top: 5px; }
.summary-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
.badge { padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
.badge.high { background: #fee2e2; color: #991b1b; }
.badge.medium { background: #ffedd5; color: #9a3412; }
.badge.low { background: #dcfce7; color: #166534; }
.tweet-box { margin-top: 10px; background: #f3f4f6; padding: 8px; border-radius: 4px; font-size: 0.9rem; font-style: italic; color: #555; }
.error-msg { color: #dc2626; font-size: 0.9rem; }
.official-doc { border-left: 4px solid #003366; background-color: #fbfbfd; }
.agency-tag { font-size: 0.75rem; color: #666; background: #eee; padding: 2px 6px; border-radius: 4px; margin-left: 8px; }
.deadline-banner { background-color: #fff3cd; color: #856404; padding: 8px; border-radius: 4px; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid #ffeeba; }
.urgent-badge { background: #28a745; color: white; font-weight: bold; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.guardian-news { border-left: 4px solid #052962; }
.guardian-news .source-tag { background-color: #052962; color: white; }
.nyt-news { border-left: 4px solid #000000; }
.nyt-news .source-tag { background-color: #000000; color: white; font-family: 'Georgia', serif; }
.card-image { margin-bottom: 12px; border-radius: 4px; overflow: hidden; height: 180px; background: #f0f0f0; }
.card-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-content { display: flex; flex-direction: column; gap: 8px; }
.meta-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.meta-left { font-size: 0.8em; color: #666; display: flex; gap: 8px; align-items: center; }
.save-btn { background: none; border: 1px solid #ccc; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; color: #555; transition: all 0.2s; }
.save-btn:hover { background: #f0f0f0; }
.save-btn.saved { background: #fffbeb; color: #b45309; border-color: #fcd34d; font-weight: bold; }
</style>