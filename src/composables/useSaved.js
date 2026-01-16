import { ref, computed } from 'vue';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { generateArticleId } from '../utils/hash';

const savedItems = ref([]);
const loading = ref(false);

export function useSaved(user) {
  
  const isSaved = (item) => {
    if (!item?.link) return false;
    const id = generateArticleId(item.link);
    return savedItems.value.some(i => i.id === id);
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
      
      // Sort client-side
      savedItems.value = items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    } catch (e) {
      console.error("Error fetching saved items:", e);
    } finally {
      loading.value = false;
    }
  };

  const toggleSave = async (item) => {
    if (!user.value) return;
    const articleId = generateArticleId(item.link);
    const docRef = doc(db, "saved_items", articleId);

    if (isSaved(item)) {
      // UNSAVE
      await deleteDoc(docRef);
      savedItems.value = savedItems.value.filter(i => i.id !== articleId);
    } else {
      // SAVE
      const savedData = {
        ...item,
        id: articleId,
        userId: user.value.uid,
        savedAt: new Date().toISOString(),
        loading: false, // Don't save UI state
        error: null 
      };

      // 🛡️ SANITIZATION FIX:
      // Firestore crashes on 'undefined', so we must delete those keys or set them to null.
      Object.keys(savedData).forEach(key => {
        if (savedData[key] === undefined) {
          savedData[key] = null; // Convert undefined to null (safer than delete)
        }
      });
      
      await setDoc(docRef, savedData);
      savedItems.value.unshift(savedData);
    }
  };

  return {
    savedItems,
    loading,
    fetchSavedItems,
    toggleSave,
    isSaved
  };
}