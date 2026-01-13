<script setup>
import { ref, onMounted } from 'vue';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';

// --- State ---
const user = ref(null);
const newFeedUrl = ref('');
const userFeeds = ref([]); 
const feedItems = ref([]); 
const loading = ref(false);
const errorMsg = ref('');

// --- Auth State ---
const email = ref('');
const password = ref('');
const isRegistering = ref(false); // Toggle between Login and Signup modes

// --- Auth Logic ---
const handleAuth = async () => {
  errorMsg.value = '';
  if (!email.value || !password.value) {
    errorMsg.value = "Please enter both email and password.";
    return;
  }

  try {
    if (isRegistering.value) {
      // Sign Up
      await createUserWithEmailAndPassword(auth, email.value, password.value);
    } else {
      // Log In
      await signInWithEmailAndPassword(auth, email.value, password.value);
    }
    // Clear form
    email.value = '';
    password.value = '';
  } catch (e) {
    // Make firebase errors readable
    switch (e.code) {
      case 'auth/invalid-email':
        errorMsg.value = 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMsg.value = 'User account disabled.';
        break;
      case 'auth/user-not-found':
        errorMsg.value = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        errorMsg.value = 'Incorrect password.';
        break;
      case 'auth/email-already-in-use':
        errorMsg.value = 'Email already in use.';
        break;
      case 'auth/weak-password':
        errorMsg.value = 'Password should be at least 6 characters.';
        break;
      default:
        errorMsg.value = e.message;
    }
  }
};

const logout = () => signOut(auth);

// --- Data Management ---
const loadUserPreferences = async (uid) => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    userFeeds.value = docSnap.data().feeds || [];
    refreshAllFeeds();
  } else {
    // Initialize new user doc if it doesn't exist
    await setDoc(docRef, { feeds: [] });
    userFeeds.value = [];
  }
};

const addFeed = async () => {
  if (!newFeedUrl.value) return;
  try {
    loading.value = true;
    const feedUrl = newFeedUrl.value.trim();
    
    // update local
    userFeeds.value.push(feedUrl);
    
    // update firestore
    await setDoc(doc(db, "users", user.value.uid), {
      feeds: arrayUnion(feedUrl)
    }, { merge: true });

    newFeedUrl.value = '';
    await fetchSingleFeed(feedUrl); 
  } catch (e) {
    errorMsg.value = "Error adding feed: " + e.message;
  } finally {
    loading.value = false;
  }
};

const removeFeed = async (url) => {
  userFeeds.value = userFeeds.value.filter(f => f !== url);
  feedItems.value = feedItems.value.filter(i => i.sourceUrl !== url);
  
  await setDoc(doc(db, "users", user.value.uid), {
    feeds: arrayRemove(url)
  }, { merge: true });
};

// --- RSS Parsing ---
const parseXML = (xmlText, sourceUrl) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const items = xmlDoc.querySelectorAll("item");
  const channelTitle = xmlDoc.querySelector("channel > title")?.textContent || sourceUrl;

  const parsedItems = [];
  items.forEach(item => {
    parsedItems.push({
      title: item.querySelector("title")?.textContent || "No Title",
      link: item.querySelector("link")?.textContent,
      pubDate: new Date(item.querySelector("pubDate")?.textContent),
      description: item.querySelector("description")?.textContent?.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
      source: channelTitle,
      sourceUrl: sourceUrl,
      id: item.querySelector("guid")?.textContent || item.querySelector("link")?.textContent
    });
  });
  return parsedItems;
};

const fetchSingleFeed = async (url) => {
  try {
    const res = await fetch(`/.netlify/functions/fetch-feed?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Proxy error');
    const text = await res.text();
    const newItems = parseXML(text, url);
    feedItems.value = [...feedItems.value, ...newItems].sort((a, b) => b.pubDate - a.pubDate);
  } catch (e) {
    console.error(`Failed to load ${url}`, e);
    errorMsg.value = `Failed to load ${url}`;
  }
};

const refreshAllFeeds = async () => {
  loading.value = true;
  feedItems.value = [];
  await Promise.all(userFeeds.value.map(url => fetchSingleFeed(url)));
  loading.value = false;
};

// --- Lifecycle ---
onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser;
    if (currentUser) {
      loadUserPreferences(currentUser.uid);
    } else {
      userFeeds.value = [];
      feedItems.value = [];
    }
  });
});
</script>

<template>
  <div class="container">
    <header>
      <h1>Policy Stream v1</h1>
      <div v-if="user">
        <span>{{ user.email }}</span>
        <button class="link-btn" @click="logout">Logout</button>
      </div>
    </header>

    <main v-if="user">
      <div class="sidebar">
        <h3>Sources</h3>
        <div class="input-group">
          <input v-model="newFeedUrl" placeholder="RSS URL" @keyup.enter="addFeed" />
          <button @click="addFeed">+</button>
        </div>
        <ul>
          <li v-for="feed in userFeeds" :key="feed">
            <small>{{ feed.substring(0, 30) }}...</small>
            <button class="danger-btn" @click="removeFeed(feed)">x</button>
          </li>
        </ul>
        <button @click="refreshAllFeeds" :disabled="loading">Refresh All</button>
      </div>

      <div class="content">
        <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
        <div v-if="loading">Loading updates...</div>
        
        <div class="feed-grid">
          <article v-for="item in feedItems" :key="item.id" class="card">
            <div class="meta">
              <span class="source-tag">{{ item.source }}</span>
              <span class="date">{{ formatDistanceToNow(item.pubDate) }} ago</span>
            </div>
            <h3><a :href="item.link" target="_blank">{{ item.title }}</a></h3>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </div>
    </main>

    <div v-else class="auth-wrapper">
      <div class="auth-box">
        <h2>{{ isRegistering ? 'Create Account' : 'Welcome Back' }}</h2>
        <form @submit.prevent="handleAuth">
          <div class="form-group">
            <label>Email</label>
            <input v-model="email" type="email" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input v-model="password" type="password" required />
          </div>
          <button type="submit" class="primary-btn">
            {{ isRegistering ? 'Sign Up' : 'Log In' }}
          </button>
        </form>
        
        <div class="auth-toggle">
          <button class="link-btn" @click="isRegistering = !isRegistering">
            {{ isRegistering ? 'Already have an account? Log in' : 'New here? Create account' }}
          </button>
        </div>
        <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
main { display: grid; grid-template-columns: 250px 1fr; gap: 20px; }
.sidebar { padding-right: 20px; border-right: 1px solid #eee; }
.input-group { display: flex; gap: 5px; margin-bottom: 10px; }
.feed-grid { display: grid; gap: 15px; }
.card { border: 1px solid #ddd; padding: 15px; border-radius: 4px; background: #fff; }
.meta { font-size: 0.8em; color: #666; margin-bottom: 5px; display: flex; justify-content: space-between; }
.source-tag { background: #e0f7fa; padding: 2px 5px; border-radius: 3px; color: #006064; }
.danger-btn { color: red; border: none; background: none; cursor: pointer; }
.error { color: red; margin: 10px 0; }

/* Auth Styles */
.auth-wrapper { display: flex; justify-content: center; margin-top: 50px; }
.auth-box { border: 1px solid #ddd; padding: 30px; border-radius: 8px; width: 100%; max-width: 400px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.form-group { margin-bottom: 15px; display: flex; flex-direction: column; }
.form-group input { padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; }
.primary-btn { width: 100%; padding: 10px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
.primary-btn:hover { background-color: #0056b3; }
.link-btn { background: none; border: none; color: #007bff; text-decoration: underline; cursor: pointer; padding: 0; }
.auth-toggle { margin-top: 15px; text-align: center; font-size: 0.9em; }
</style>