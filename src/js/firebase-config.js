// Firebase Configuration (New Clean Start)
const firebaseConfig = {
  apiKey: "AIzaSyAwlBUQFf_HDxO3Ux6co0hd6RvLS4ndLRU",
  authDomain: "flapfing-new-2026.firebaseapp.com",
  projectId: "flapfing-new-2026",
  databaseURL: "https://flapfing-new-2026-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "flapfing-new-2026.firebasestorage.app",
  messagingSenderId: "1091000467623",
  appId: "1:1091000467623:web:8c69d6fb64f967c65a5b82"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
