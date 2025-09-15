// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAIZKwePnYrXoAEmpK9sExT4p7AmwIABLk",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "machina-9a618.firebaseapp.com",
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://machina-9a618-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "machina-9a618",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "machina-9a618.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1073130718452",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1073130718452:web:c2987806c8c1aa6456caa1",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-ZRLNNDRYN9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;
