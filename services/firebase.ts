import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasjon hentet fra brukerens input
const firebaseConfig = {
  apiKey: "AIzaSyAxj7oqOE2wu-uR3M8snQ4McspL743eY4k",
  authDomain: "lumiere-a0c58.firebaseapp.com",
  projectId: "lumiere-a0c58",
  storageBucket: "lumiere-a0c58.firebasestorage.app",
  messagingSenderId: "1018471450720",
  appId: "1:1018471450720:web:8a766db20154eee115db05",
  measurementId: "G-7HJ5S6GKPG"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);