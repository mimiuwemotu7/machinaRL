// Firebase configuration for server
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAIZKwePnYrXoAEmpK9sExT4p7AmwIABLk",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "machina-9a618.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://machina-9a618-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.FIREBASE_PROJECT_ID || "machina-9a618",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "machina-9a618.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1073130718452",
  appId: process.env.FIREBASE_APP_ID || "1:1073130718452:web:c2987806c8c1aa6456caa1",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-ZRLNNDRYN9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);

export default app;
