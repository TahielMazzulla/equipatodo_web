// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // <-- Agregá esta línea

const firebaseConfig = {
  apiKey: "AIzaSyDhFoqUs5psm4s0rdCQMiBuR_Dj9q-Ergk",
  authDomain: "equipatodo-app.firebaseapp.com",
  projectId: "equipatodo-app",
  storageBucket: "equipatodo-app.firebasestorage.app",
  messagingSenderId: "679240805625",
  appId: "1:679240805625:web:61fce0237872201e728628"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app); // <-- Agregá esta línea también

export { db, auth }; // <-- Y exportá auth junto con db