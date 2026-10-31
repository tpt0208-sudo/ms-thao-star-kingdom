import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
export { signInWithPopup, signInWithEmailAndPassword };

export interface AuthUserState {
  user: User | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isTeacher: boolean;
}

// Allowed teacher emails or default admin
export const TEACHER_EMAILS = [
  'tpt0208@gmail.com',
  'cothao@gmail.com',
  'admin@starkingdom.edu.vn',
];

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    // If user not found, try creating account for convenience in classroom setting
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        const createResult = await createUserWithEmailAndPassword(auth, email, pass);
        return createResult.user;
      } catch (createErr) {
        throw error;
      }
    }
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}
