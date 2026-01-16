import { ref } from 'vue';
import { db } from '../firebase';
import { 
  doc, setDoc, deleteDoc, updateDoc, 
  collection, query, where, getDocs, limit 
} from 'firebase/firestore';
import { generateArticleId } from '../utils/hash';
import { sanitizeForFirestore } from '../utils/firestore';

const savedItems = ref([]);
const publicItems = ref([]);
const loading = ref(false);

export function useSaved(user) {
  
  // Helper to find the matching saved object from any version of the item (RSS or Saved)
  const getSavedVersion = (item) => {
    if (!item?.link) return null;
    const id = generateArticleId(item.link);
    return savedItems.value.find(i => i.id === id);
  };

  const isSaved = (item) => {
    return !!getSavedVersion(item);
  };

  // NEW: Helper for UI to reactively check public status
  const isShared = (item) => {
    const saved = getSavedVersion(item);
    return saved ? saved.isPublic : false;
  };

  const fetchSavedItems = async () => {
    if (!user.value) return;
    loading.value = true;
    try {
      const q = query(
        collection(db, "saved_items"), 
        where("userId", "==", user.value.uid)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => doc.data());
      savedItems.value = items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    } catch (e) {
      console.error("Error fetching saved items:", e);
    } finally {
      loading.value = false;
    }
  };

  const fetchPublicItems = async () => {
    loading.value = true;
    try {
      const q = query(
        collection(db, "saved_items"), 
        where("isPublic", "==", true),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => doc.data());
      publicItems.value = items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    } catch (e) {
      console.error("Error fetching public items:", e);
    } finally {
      loading.value = false;
    }
  };

  const toggleSave = async (item) => {
    if (!user.value) return;
    const articleId = generateArticleId(item.link);
    const docRef = doc(db, "saved_items", articleId);

    if (isSaved(item)) {
      await deleteDoc(docRef);
      savedItems.value = savedItems.value.filter(i => i.id !== articleId);
    } else {
      const rawData = {
        ...item,
        id: articleId,
        userId: user.value.uid,
        sharedBy: user.value.email,
        savedAt: new Date().toISOString(),
        isPublic: false,
        loading: false, 
        error: null 
      };

      const savedData = sanitizeForFirestore(rawData);
      await setDoc(docRef, savedData);
      savedItems.value.unshift(savedData);
    }
  };

  // REFACTORED: Look up the Saved Version first!
  const togglePublic = async (item) => {
    if (!user.value) return;

    // 1. Find the REAL saved item (which has userId and current isPublic status)
    const savedItem = getSavedVersion(item);
    
    // Safety check: You can't share something that isn't saved.
    if (!savedItem) return; 

    // 2. Check Ownership on the SAVED copy, not the passed RSS item
    if (savedItem.userId !== user.value.uid) return;

    const articleId = savedItem.id;
    const docRef = doc(db, "saved_items", articleId);
    
    const newStatus = !savedItem.isPublic;
    
    // 3. Update State (Reactivity will update UI instantly)
    savedItem.isPublic = newStatus;

    // 4. Update DB
    await updateDoc(docRef, { isPublic: newStatus });
    
    if (newStatus) fetchPublicItems();
  };

  return {
    savedItems,
    publicItems,
    loading,
    fetchSavedItems,
    fetchPublicItems,
    toggleSave,
    togglePublic,
    isSaved,
    isShared // <--- Exporting this new helper
  };
}