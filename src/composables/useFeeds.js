import { ref, computed } from 'vue';
import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { parseXML, autoCategorize } from '../utils/feedProcessor';
import { parseOPML, downloadOPML } from '../utils/opml';
import { isFederalRegisterUrl, fetchFederalRegisterDocs } from '../utils/federalRegister';
import { generateArticleId } from '../utils/hash';

// --- STATE ---
const feedItems = ref([]);
const userFeeds = ref([]);
const categories = ref([]);
const loading = ref(false);

// --- FETCHERS (Internal) ---
const fetchGuardianNews = async () => {
    try {
        const res = await fetch('/.netlify/functions/fetch-guardian');
        if (!res.ok) throw new Error("Failed to fetch Guardian news");
        return await res.json();
    } catch (e) {
        console.error("Guardian API Error:", e);
        return [];
    }
};

const fetchNYTNews = async () => {
    try {
        const res = await fetch('/.netlify/functions/fetch-nyt');
        if (!res.ok) throw new Error("Failed to fetch NYT news");
        return await res.json();
    } catch (e) {
        console.error("NYT API Error:", e);
        return [];
    }
};

const fetchCongressBills = async () => {
    try {
        const res = await fetch('/.netlify/functions/fetch-congress');
        if (!res.ok) throw new Error("Failed to fetch Congress bills");
        return await res.json();
    } catch (e) {
        console.error("Congress API Error:", e);
        return [];
    }
};

// --- SYSTEM FEED CONFIGURATION ---
// 1. Define them in one place (Name + URL + The Function to call)
const SYSTEM_FEEDS_CONFIG = [
    { 
        name: 'The Guardian', 
        url: 'https://www.theguardian.com/us/environment', 
        fetcher: fetchGuardianNews 
    },
    { 
        name: 'New York Times', 
        url: 'https://www.nytimes.com/section/climate', 
        fetcher: fetchNYTNews 
    },
    { 
        name: 'US Congress',  // <--- NEW ENTRY
        url: 'https://www.congress.gov', 
        fetcher: fetchCongressBills 
    }
];

// 2. Expose the list for the UI (Sidebar) to render
// We computed this so if we ever add dynamic system feeds, it reacts.
const systemFeeds = computed(() => SYSTEM_FEEDS_CONFIG.map(f => ({
    name: f.name,
    url: f.url
})));

export function useFeeds(user) {

    const normalizeFeeds = (feeds) => {
        return feeds.map(f => typeof f === 'string' ? { url: f, name: f, isPublic: false } : f);
    };

    const fetchSingleFeed = async (feedObj) => {
        const { url, name } = feedObj;
        let items = [];

        if (isFederalRegisterUrl(url)) {
            try {
                items = await fetchFederalRegisterDocs(url);
            } catch (e) {
                console.error(`FR Error: ${url}`, e);
            }
        } else {
            try {
                const res = await fetch(`/.netlify/functions/fetch-feed?url=${encodeURIComponent(url)}`);
                if (res.ok) {
                    const text = await res.text();
                    items = parseXML(text, url);
                }
            } catch (e) {
                console.error(`RSS Error: ${url}`, e);
            }
        }

        if (name && name !== url) {
            items = items.map(i => ({ ...i, source: name }));
        }

        return autoCategorize(items, categories.value);
    };

   // ... inside src/composables/useFeeds.js

    const refreshAllFeeds = async () => {
        if (!user.value) return;
        loading.value = true;
        feedItems.value = [];

        // 1. Fetch RSS Feeds
        const rssPromises = userFeeds.value.map(f => fetchSingleFeed(f));

        // 2. Fetch System Feeds (Wrapped to Enforce URL Consistency)
        const systemPromises = SYSTEM_FEEDS_CONFIG.map(async (config) => {
            const items = await config.fetcher();
            if (!Array.isArray(items)) return [];
            
            // THE FIX: Overwrite 'sourceUrl' to match the Config URL exactly.
            // This ensures the "Hide" button (which uses config.url) always matches the item.
            return items.map(item => ({
                ...item, 
                sourceUrl: config.url 
            }));
        });

        // 3. Wait for all
        const [rssResults, ...systemResults] = await Promise.all([
            Promise.all(rssPromises),
            ...systemPromises
        ]);

        // 4. Flatten and Merge
        let allItems = rssResults.flat();
        
        systemResults.forEach(res => {
            if (Array.isArray(res)) allItems = [...allItems, ...res];
        });
        
        allItems = autoCategorize(allItems, categories.value);

        feedItems.value = allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        loading.value = false;
    };

    const loadUserPreferences = async () => {
        if (!user.value) return;
        const docRef = doc(db, "users", user.value.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            userFeeds.value = normalizeFeeds(data.feeds || []);
            categories.value = data.categories || [];
            refreshAllFeeds();
        } else {
            await setDoc(docRef, { feeds: [], categories: [] });
            userFeeds.value = [];
            categories.value = [];
        }
    };

    const saveUserFeeds = async () => {
        if (!user.value) return;
        await updateDoc(doc(db, "users", user.value.uid), { feeds: userFeeds.value });
    };

    const addFeed = async (url, name = null) => {
        if (userFeeds.value.some(f => f.url === url)) return;
        const newFeed = { 
            url, 
            name: name || url, 
            isPublic: false 
        };
        userFeeds.value.push(newFeed);
        await saveUserFeeds();
        refreshAllFeeds();
    };

    const removeFeed = async (feedToRemove) => {
        
        userFeeds.value = userFeeds.value.filter(f => f.url !== feedToRemove.url);
        feedItems.value = feedItems.value.filter(i => i.sourceUrl !== feedToRemove.url);
        await saveUserFeeds();
    };

    const updateFeed = async (originalUrl, newName, isPublic) => {
        const feedIndex = userFeeds.value.findIndex(f => f.url === originalUrl);
        if (feedIndex === -1) return;

        const oldFeed = userFeeds.value[feedIndex];
        const newFeed = { ...oldFeed, name: newName, isPublic };
        
        userFeeds.value[feedIndex] = newFeed;
        await saveUserFeeds();

        if (oldFeed.isPublic !== newFeed.isPublic || (newFeed.isPublic && oldFeed.name !== newFeed.name)) {
            await syncToPublicLibrary(newFeed);
        }

        if (oldFeed.name !== newFeed.name) {
            refreshAllFeeds();
        }
    };

    // --- Sharing Logic (Public Feeds) ---
    const syncToPublicLibrary = async (feed) => {
        const feedId = generateArticleId(feed.url);
        const docRef = doc(db, 'public_feeds', feedId);

        if (feed.isPublic) {
            await setDoc(docRef, {
                url: feed.url,
                name: feed.name,
                sharedBy: user.value ? user.value.email : 'Anonymous',
                updatedAt: new Date()
            }, { merge: true });
        } else {
            await deleteDoc(docRef);
        }
    };

    const togglePublic = async (feed, shouldBePublic) => {
         const updatedFeed = { ...feed, isPublic: shouldBePublic };
         await syncToPublicLibrary(updatedFeed);
    }

    const fetchPublicFeeds = async () => {
        const querySnapshot = await getDocs(collection(db, "public_feeds"));
        return querySnapshot.docs.map(doc => doc.data());
    };

    const syncBucketToPublicLibrary = async (bucket) => {
        const bucketId = generateArticleId(bucket.name); 
        const docRef = doc(db, 'public_buckets', bucketId);

        if (bucket.isPublic) {
            await setDoc(docRef, {
                name: bucket.name,
                keywords: bucket.keywords,
                sharedBy: user.value ? user.value.email : 'Anonymous',
                updatedAt: new Date()
            }, { merge: true });
        } else {
            await deleteDoc(docRef);
        }
    };

    const fetchPublicBuckets = async () => {
        const querySnapshot = await getDocs(collection(db, "public_buckets"));
        return querySnapshot.docs.map(doc => doc.data());
    };

    // --- Categories Logic ---
    const addCategory = async (name, keywordsString, isPublic = false) => {
        if (!user.value) return;
        if (categories.value.some(c => c.name === name)) return;

        const keywords = keywordsString.split(',').map(k => k.trim()).filter(k => k);
        const newCat = { name, keywords, isPublic };
        
        categories.value.push(newCat);
        await updateDoc(doc(db, "users", user.value.uid), { categories: categories.value });
        
        if (isPublic) await syncBucketToPublicLibrary(newCat);
        feedItems.value = autoCategorize(feedItems.value, categories.value);
    };

    const editCategory = async (originalName, newName, newKeywordsString, isPublic) => {
        if (!user.value) return;
        const index = categories.value.findIndex(c => c.name === originalName);
        if (index === -1) return;

        const oldCat = categories.value[index];
        const keywords = Array.isArray(newKeywordsString) 
            ? newKeywordsString 
            : newKeywordsString.split(',').map(k => k.trim()).filter(k => k);
        
        const updatedCat = { name: newName, keywords, isPublic };
        categories.value[index] = updatedCat;

        await updateDoc(doc(db, "users", user.value.uid), { categories: categories.value });

        if (oldCat.isPublic !== isPublic || (isPublic && (oldCat.name !== newName || oldCat.keywords !== keywords))) {
            await syncBucketToPublicLibrary(updatedCat);
        }
        if (oldCat.isPublic && !isPublic) {
             const oldId = generateArticleId(oldCat.name);
             await deleteDoc(doc(db, 'public_buckets', oldId));
        }

        feedItems.value = autoCategorize(feedItems.value, categories.value);
    };

    const removeCategory = async (name) => {
        if (!user.value) return;
        const catToRemove = categories.value.find(c => c.name === name);
        if (catToRemove && catToRemove.isPublic) {
            const oldId = generateArticleId(catToRemove.name);
            await deleteDoc(doc(db, 'public_buckets', oldId));
        }
        categories.value = categories.value.filter(c => c.name !== name);
        await updateDoc(doc(db, "users", user.value.uid), { categories: categories.value });
        feedItems.value = autoCategorize(feedItems.value, categories.value);
    };

    // --- OPML ---
    const importOPML = async (file) => {
        if (!user.value || !file) return;
        try {
            loading.value = true;
            const text = await file.text();
            const newUrls = parseOPML(text);
            const newFeedObjects = newUrls.map(url => ({ url, name: url, isPublic: false }));
            const existingUrls = new Set(userFeeds.value.map(f => f.url));
            const uniqueFeeds = newFeedObjects.filter(f => !existingUrls.has(f.url));

            if (uniqueFeeds.length === 0) return;

            userFeeds.value = [...userFeeds.value, ...uniqueFeeds];
            await saveUserFeeds();
            await refreshAllFeeds();
        } catch (e) {
            console.error("OPML Import Failed", e);
            alert("Failed to import OPML file.");
        } finally {
            loading.value = false;
        }
    };

    const exportOPML = () => {
        if (userFeeds.value.length === 0) return;
        downloadOPML(userFeeds.value.map(f => f.url));
    };

    return {
        feedItems, userFeeds, categories, loading, systemFeeds, // <--- Exported here
        loadUserPreferences, addFeed, removeFeed, updateFeed,
        addCategory, editCategory, removeCategory, refreshAllFeeds,
        importOPML, exportOPML, fetchPublicFeeds, fetchPublicBuckets,
    };
}