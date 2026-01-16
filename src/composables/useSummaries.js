import { db } from '../firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { generateArticleId } from '../utils/hash';
import { sanitizeForFirestore } from '../utils/firestore';

export function useSummaries() {

  const fetchSummary = async (item) => {
    const articleId = generateArticleId(item.link);
    if (!articleId) return null;

    const docRef = doc(db, 'summaries', articleId);
    
    try {
      // 1. Check Cache
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), fromCache: true };
      }
      return null;
    } catch (e) {
      console.error("Error reading summary cache:", e);
      return null;
    }
  };

  const generateAndSaveSummary = async (item) => {
    const articleId = generateArticleId(item.link);
    if (!articleId) throw new Error("Invalid Article Link");

    // 2. Call AI API
    const res = await fetch('/.netlify/functions/summarize', {
      method: 'POST',
      body: JSON.stringify({
        title: item.title,
        text: item.description
      })
    });

    if (!res.ok) throw new Error("AI generation failed");
    const data = await res.json();

    // 3. Save to DB (SANITIZED)
    const rawSummary = {
      ...data,
      originalUrl: item.link,
      createdAt: Timestamp.now()
    };

    // If the AI returns "undefined" for a field (rare but possible), this fixes it:
    const summaryData = sanitizeForFirestore(rawSummary);

    const docRef = doc(db, 'summaries', articleId);
    await setDoc(docRef, summaryData);

    return { ...summaryData, fromCache: false };
  };

  return {
    fetchSummary,
    generateAndSaveSummary
  };
}