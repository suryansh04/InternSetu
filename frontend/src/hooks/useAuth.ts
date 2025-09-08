import { useState, useEffect } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "@/firebase/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

interface AuthUser extends User {
  role?: string;
  name?: string;
}

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setCurrentUser({
          ...user,
          ...userDoc.data(),
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Sign up with email and password
  const signup = async (email: string, password: string, name: string) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user profile in Firestore with all required fields
      const userProfile = {
        uid: userCredential.user.uid,
        displayName: name,
        email: email,
        // Initialize optional fields with empty values
        bio: "",
        location: "",
        phone: "",
        photoURL: userCredential.user.photoURL || "",
        joinDate: new Date().toISOString(),
        role: "user", // default role
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), userProfile);

      // Update the auth profile with the display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: name,
        });
      }

      // Update local state
      setCurrentUser({
        ...userCredential.user,
        ...userProfile,
      });

      return { ...userCredential.user, ...userProfile };
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Login with email and password
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<AuthUser> => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let userData: any = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        role: "user", // Default role
      };

      if (!userDoc.exists()) {
        // Create user profile if it doesn't exist
        const userProfile = {
          ...userData,
          name: user.displayName || "User",
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "users", user.uid), userProfile);
      } else {
        // Merge with existing user data
        userData = { ...userData, ...userDoc.data() };
      }

      // Update the current user in state
      setCurrentUser(userData);
      return userData;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    currentUser,
    loading,
    error,
    signup,
    login,
    signInWithGoogle,
    logout,
    resetPassword,
  };
};
