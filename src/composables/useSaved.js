import { ref } from 'vue';
import { db } from '../firebase';
import { 
  doc, setDoc, deleteDoc, updateDoc, 
  collection, query, where, getDocs, orderBy, limit 
} from 'firebase/firestore';
import { generateArticleId } from '../utils/hash';
import { sanitizeForFirestore } from '../utils/firestore';

const savedItems = ref([]);
const publicItems = ref([]); // <--- NEW: Stores the team's shared items
const loading = ref(false);

export function useSaved(user) {
  
  const isSaved = (item) => {
    if (!item?.link) return false;
    const id = generateArticleId(item.link);
    // Check if it exists in my personal saved list
    return savedItems.value.some(i => i.id === id);
  };

  // 1. FETCH MY ITEMS
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

  // 2. NEW: FETCH TEAM ITEMS
  const fetchPublicItems = async () => {
    loading.value = true;
    try {
      // Query: items where isPublic == true
      const q = query(
        collection(db, "saved_items"), 
        where("isPublic", "==", true),
        limit(50) // Safety limit
      );
      
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => doc.data());
      
      // Sort in memory
      publicItems.value = items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    } catch (e) {
      console.error("Error fetching public items:", e);
    } finally {
      loading.value = false;
    }
  };

  // 3. TOGGLE SAVE (Personal)
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
        sharedBy: user.value.email, // <--- NEW: Store who saved it
        savedAt: new Date().toISOString(),
        isPublic: false,            // <--- Default to Private
        loading: false, 
        error: null 
      };

      const savedData = sanitizeForFirestore(rawData);
      await setDoc(docRef, savedData);
      savedItems.value.unshift(savedData);
    }
  };

  // 4. NEW: TOGGLE PUBLIC (Sharing)
  const togglePublic = async (item) => {
    if (!user.value) return;
    // Only allow the owner to share
    if (item.userId !== user.value.uid) return;

    const articleId = item.id || generateArticleId(item.link);
    const docRef = doc(db, "saved_items", articleId);
    
    const newStatus = !item.isPublic;
    
    // Update Local State immediately (UI feels faster)
    const localItem = savedItems.value.find(i => i.id === articleId);
    if (localItem) localItem.isPublic = newStatus;

    // Update DB
    await updateDoc(docRef, { isPublic: newStatus });
    
    // Refresh the public list so the changes appear in "Team Picks"
    if (newStatus) fetchPublicItems();
  };

  return {
    savedItems,
    publicItems, // <--- Exported
    loading,
    fetchSavedItems,
    fetchPublicItems, // <--- Exported
    toggleSave,
    togglePublic,     // <--- Exported
    isSaved
  };
}