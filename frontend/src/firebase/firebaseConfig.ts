import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref as storageRef } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "internsetu-9f79b.firebaseapp.com",
  projectId: "internsetu-9f79b",
  storageBucket: "internsetu-9f79b.firebasestorage.app",
  messagingSenderId: "554517363427",
  appId: "1:554517363427:web:cef96f32f326a326c363d6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { updateProfile };

// Helper function to get storage reference
export const getStorageRef = (path: string) => storageRef(storage, path);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;
