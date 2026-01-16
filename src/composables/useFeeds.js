import { ref } from 'vue';
import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { parseXML, autoCategorize } from '../utils/feedProcessor'; // Import logic
import { parseOPML, downloadOPML } from '../utils/opml';
import { isFederalRegisterUrl, fetchFederalRegisterDocs } from '../utils/federalRegister';
import { generateArticleId } from '../utils/hash';

const feedItems = ref([]);
const userFeeds = ref([]);
const categories = ref([]);
const loading = ref(false);

export function useFeeds(user) {

    // Helper: Normalize legacy string feeds to objects
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

        // Override the "Source" name if the user gave it a custom label
        if (name && name !== url) {
            items = items.map(i => ({ ...i, source: name }));
        }

        return autoCategorize(items, categories.value);
    };

const fetchGuardianNews = async () => {
    try {
        const res = await fetch('/.netlify/functions/fetch-guardian');
        if (!res.ok) throw new Error("Failed to fetch Guardian news");

        const items = await res.json();
        // Run them through your auto-categorizer so they get tagged "Forests", "Water", etc.
        return autoCategorize(items, categories.value);
    } catch (e) {
        console.error("Guardian API Error:", e);
        return [];
    }
};

const refreshAllFeeds = async () => {
    if (!user.value) return;
    loading.value = true;
    feedItems.value = [];

    // 1. Fetch User's RSS Feeds
    const feedPromises = userFeeds.value.map(f => fetchSingleFeed(f));

    // 2. Fetch Guardian News (Run in parallel)
    // You can make this optional, but for now let's just include it
    const guardianPromise = fetchGuardianNews();

    const results = await Promise.all([...feedPromises, guardianPromise]);

    feedItems.value = results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
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
            // Init new user
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
        // Prevent duplicates
        if (userFeeds.value.some(f => f.url === url)) return;

        const newFeed = { 
            url, 
            name: name || url, // Default name is URL until edited
            isPublic: false 
        };

        userFeeds.value.push(newFeed);
        await saveUserFeeds();
        refreshAllFeeds();
    };

    const removeFeed = async (feedToRemove) => {
        // If it was public, remove it from the public library too
        if (feedToRemove.isPublic) {
            await togglePublic(feedToRemove, false); // Turn off sharing first
        }

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

        // Handle Public Library Sync
        if (oldFeed.isPublic !== newFeed.isPublic || (newFeed.isPublic && oldFeed.name !== newFeed.name)) {
            await syncToPublicLibrary(newFeed);
        }

        if (oldFeed.name !== newFeed.name) {
            refreshAllFeeds();
        }
    };

    // --- Sharing Logic ---

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
         // Helper to safely reuse sync logic
         const updatedFeed = { ...feed, isPublic: shouldBePublic };
         await syncToPublicLibrary(updatedFeed);
    }

    const fetchPublicFeeds = async () => {
        const querySnapshot = await getDocs(collection(db, "public_feeds"));
        return querySnapshot.docs.map(doc => doc.data());
    };

    const syncBucketToPublicLibrary = async (bucket) => {
        // Create a unique ID based on the name (simple hash)
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

    const addCategory = async (name, keywordsString, isPublic = false) => {
        if (!user.value) return;
        
        // Check for duplicates
        if (categories.value.some(c => c.name === name)) return;

        const keywords = keywordsString.split(',').map(k => k.trim()).filter(k => k);
        const newCat = { name, keywords, isPublic };
        
        categories.value.push(newCat);
        
        await updateDoc(doc(db, "users", user.value.uid), { categories: categories.value });
        
        if (isPublic) {
            await syncBucketToPublicLibrary(newCat);
        }

        feedItems.value = autoCategorize(feedItems.value, categories.value);
    };

    const editCategory = async (originalName, newName, newKeywordsString, isPublic) => {
        if (!user.value) return;
        const index = categories.value.findIndex(c => c.name === originalName);
        if (index === -1) return;

        const oldCat = categories.value[index];
        const keywords = newKeywordsString.split(',').map(k => k.trim()).filter(k => k);
        
        const updatedCat = { name: newName, keywords, isPublic };
        categories.value[index] = updatedCat;

        await updateDoc(doc(db, "users", user.value.uid), { categories: categories.value });

        // Handle Public Sync
        // If name changed or public status changed, we need to sync
        if (oldCat.isPublic !== isPublic || (isPublic && oldCat.name !== newName) || (isPublic && oldCat.keywords !== keywords)) {
            // If name changed, we might need to delete the old ID from public library, but for now let's just add the new one
            // Ideally: if (oldCat.name !== newName && oldCat.isPublic) deleteOldPublicBucket(oldCat.name);
            await syncBucketToPublicLibrary(updatedCat);
        }
        
        // If turning OFF public, remove it
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


const importOPML = async (file) => {
        if (!user.value || !file) return;
        try {
            loading.value = true;
            const text = await file.text();
            const newUrls = parseOPML(text);
            
            // Convert simple URLs to feed objects
            const newFeedObjects = newUrls.map(url => ({ 
                url, 
                name: url, 
                isPublic: false 
            }));

            // Filter out duplicates
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
        // Map back to simple strings for OPML export
        downloadOPML(userFeeds.value.map(f => f.url));
    };

    return {
        feedItems, userFeeds, categories, loading,
        loadUserPreferences, addFeed, removeFeed, updateFeed,
        addCategory, editCategory, removeCategory, refreshAllFeeds,
        importOPML, exportOPML, fetchPublicFeeds, fetchPublicBuckets,
    };
}