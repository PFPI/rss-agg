/**
 * SANITIZE FOR FIRESTORE
 * Firebase crashes if you try to save 'undefined'. 
 * This helper converts all 'undefined' values to 'null' (which is allowed).
 */
export const sanitizeForFirestore = (obj) => {
  // 1. THE FIX: Catch scalar 'undefined' immediately
  if (obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      // We can now simplify this because the recursive call handles the null conversion
      acc[key] = sanitizeForFirestore(obj[key]);
      return acc;
    }, {});
  }
  
  return obj;
};