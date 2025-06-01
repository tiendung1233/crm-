import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyDs9uWWsMWrDbm_ntcQOn8MfRMe1ujxkpY",
  authDomain: "my-app-da8f2.firebaseapp.com",
  projectId: "my-app-da8f2",
  storageBucket: "my-app-da8f2.firebasestorage.app",
  messagingSenderId: "91509533989",
  appId: "1:91509533989:web:aa692df59462955780becc",
  measurementId: "G-60C4BVZQH4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 