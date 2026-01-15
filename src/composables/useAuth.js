import { ref, onMounted, onUnmounted } from 'vue';
import { auth } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendEmailVerification // <-- Import this
} from 'firebase/auth';

const user = ref(null);
const ALLOWED_DOMAINS = ["pfpi.net", "forestdefenders.org", "forestlitigation.org"];

export function useAuth() {
  let unsubscribe;
  onMounted(() => {
    unsubscribe = onAuthStateChanged(auth, (u) => user.value = u);
  });
  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  // Update Register Logic
const register = async (email, password) => {

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
      throw new Error(`Registration is restricted to: ${ALLOWED_DOMAINS.join(', ')}. Please contact PFPI if you've received this message in error.`);
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    return userCredential;
  };

  const logout = () => signOut(auth);

  return { user, login, register, logout };
}