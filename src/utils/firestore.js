/**
 * SANITIZE FOR FIRESTORE
 * Firebase crashes if you try to save 'undefined'. 
 * This helper converts all 'undefined' values to 'null' (which is allowed).
 */
export const sanitizeForFirestore = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      acc[key] = value === undefined ? null : sanitizeForFirestore(value);
      return acc;
    }, {});
  }
  return obj;
};