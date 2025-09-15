// Firebase configuration for server
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAIZKwePnYrXoAEmpK9sExT4p7AmwIABLk",
  authDomain: "machina-9a618.firebaseapp.com",
  databaseURL: "https://machina-9a618-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "machina-9a618",
  storageBucket: "machina-9a618.firebasestorage.app",
  messagingSenderId: "1073130718452",
  appId: "1:1073130718452:web:c2987806c8c1aa6456caa1",
  measurementId: "G-ZRLNNDRYN9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);

export default app;
