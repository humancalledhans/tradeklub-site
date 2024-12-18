import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';


// Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyD041NKmcgIUvCEyOQ4Qnj40o2bIaciRsc",
    authDomain: "trade-like-the-pros-1.firebaseapp.com",
    projectId: "trade-like-the-pros-1",
    storageBucket: "trade-like-the-pros-1.firebasestorage.app",
    messagingSenderId: "139658812511",
    appId: "1:139658812511:web:4e39392b2c3c4a52830fea",
};

// Check if Firebase app is already initialized
const firebaseApp = initializeApp(firebaseConfig);

// Force Firestore to use long-polling
const db = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
});

// Initialize Firebase Messaging
const messaging = getMessaging(firebaseApp);

export { firebaseApp, db, messaging };