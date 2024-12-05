import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// Firebase project configuration
const firebaseConfig = {
    apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
    authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VUE_APP_FIREBASE_APP_ID,
};

// Check if Firebase app is already initialized
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Force Firestore to use long-polling
const db = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
});

// Initialize Firebase Messaging
const messaging = getMessaging(firebaseApp);

export { firebaseApp, db, messaging };