import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: "studytree-app-w0ga5",
  appId: "1:142039381774:web:9bb9b5e343fd72d96b895f",
  storageBucket: "studytree-app-w0ga5.firebasestorage.app",
  apiKey: "AIzaSyACnVTgPGJ9GSYR68jT5SClrxFn-NR31cg",
  authDomain: "studytree-app-w0ga5.firebaseapp.com",
  messagingSenderId: "142039381774",
  projectNumber: "142039381774"
};

// Initialize Firebase (singleton pattern)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
