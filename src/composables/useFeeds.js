import { ref } from 'vue';
import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { parseXML, autoCategorize } from '../utils/feedProcessor'; // Import logic
import { parseOPML, downloadOPML } from '../utils/opml';
import { isFederalRegisterUrl, fetchFederalRegisterDocs } from '../utils/federalRegister';

const feedItems = ref([]);
const userFeeds = ref([]);
const categories = ref([]);
const loading = ref(false);

export function useFeeds(user) {

    const fetchSingleFeed = async (url) => {
        if (isFederalRegisterUrl(url)) {
            try {
                console.log(`Fetching Federal Register API: ${url}`);
                const docs = await fetchFederalRegisterDocs(url);

                // Add categories (using your existing autoCategorize logic)
                return autoCategorize(docs, categories.value);
            } catch (e) {
                console.error(`Failed to load FR feed: ${url}`, e);
                return [];
            }
        }

        try {
            const res = await fetch(`/.netlify/functions/fetch-feed?url=${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error('Proxy error');
            const text = await res.text();
            const newItems = parseXML(text, url);
            return autoCategorize(newItems, categories.value); // Pass value, not ref
        } catch (e) {
            console.error(`Failed to load ${url}`, e);
            return [];
        }
    };



    const refreshAllFeeds = async () => {
        if (!user.value) return;
        loading.value = true;
        feedItems.value = [];
        const results = await Promise.all(userFeeds.value.map(url => fetchSingleFeed(url)));
        feedItems.value = results.flat().sort((a, b) => b.pubDate - a.pubDate);
        loading.value = false;
    };

    const loadUserPreferences = async () => {
        if (!user.value) return;
        const docRef = doc(db, "users", user.value.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            userFeeds.value = data.feeds || [];
            categories.value = data.categories || [];
            refreshAllFeeds();
        } else {
            await setDoc(docRef, { feeds: [], categories: [] });
            userFeeds.value = [];
            categories.value = [];
        }
    };

    const addFeed = async (url) => {
        if (!user.value) return;
        userFeeds.value.push(url);
        await setDoc(doc(db, "users", user.value.uid), { feeds: arrayUnion(url) }, { merge: true });
        refreshAllFeeds();
    };

    const removeFeed = async (url) => {
        if (!user.value) return;
        userFeeds.value = userFeeds.value.filter(f => f !== url);
        feedItems.value = feedItems.value.filter(i => i.sourceUrl !== url);
        await setDoc(doc(db, "users", user.value.uid), { feeds: arrayRemove(url) }, { merge: true });
    };

    const addCategory = async (name, keywordsString) => {
        if (!user.value) return;
        const keywords = keywordsString.split(',').map(k => k.trim()).filter(k => k);
        categories.value.push({ name, keywords });
        await updateDoc(doc(db, "users", user.value.uid), { categories: categories.value });
        feedItems.value = autoCategorize(feedItems.value, categories.value);
    };

    const editCategory = async (originalName, newName, newKeywordsString) => {
        if (!user.value) return;
        const index = categories.value.findIndex(c => c.name === originalName);
        if (index === -1) return;

        const keywords = newKeywordsString.split(',').map(k => k.trim()).filter(k => k);
        categories.value[index] = { name: newName, keywords };

        await updateDoc(doc(db, "users", user.value.uid), { categories: categories.value });
        feedItems.value = autoCategorize(feedItems.value, categories.value);
    };

    const removeCategory = async (name) => {
        if (!user.value) return;
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

            if (newUrls.length === 0) throw new Error("No feeds found in OPML");

            // Bulk update Firestore
            // arrayUnion(...newUrls) adds only unique values
            await updateDoc(doc(db, "users", user.value.uid), {
                feeds: arrayUnion(...newUrls)
            });

            // Update local state and refresh
            userFeeds.value = [...new Set([...userFeeds.value, ...newUrls])];
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
        downloadOPML(userFeeds.value);
    };

    return {
        feedItems, userFeeds, categories, loading,
        loadUserPreferences, addFeed, removeFeed,
        addCategory, editCategory, removeCategory, refreshAllFeeds,
        importOPML, exportOPML,
    };
}