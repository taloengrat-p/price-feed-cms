import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB6i-apVzDsyCDCvd10d_dR7pzMVW9LG7Q",
  authDomain: "wealth-sphere-app.firebaseapp.com",
  databaseURL: "https://wealth-sphere-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wealth-sphere-app",
  storageBucket: "wealth-sphere-app.firebasestorage.app",
  messagingSenderId: "897696438055",
  appId: "1:897696438055:web:9e68839de523f18a71bb02"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);
