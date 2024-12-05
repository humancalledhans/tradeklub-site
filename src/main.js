import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
    authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VUE_APP_FIREBASE_APP_ID,
};

// Function to register a service worker
async function registerServiceWorker(swPath, swName, config = null) {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.register(swPath);
            console.log(`${swName} Service Worker registered successfully:`, registration);

            // Post Firebase configuration to the service worker
            if (config && registration.active) {
                console.log(`Passing ${swName} configuration dynamically.`);
                registration.active.postMessage({ firebaseConfig: config });
            }
        } catch (error) {
            console.error(`${swName} Service Worker registration failed:`, error);
        }
    } else {
        console.warn(`${swName} Service Worker not supported in this browser.`);
    }
}

// Register custom service worker (e.g., caching, offline support)
registerServiceWorker("/sw.js", "Custom");

// Register Firebase Messaging Service Worker and pass Firebase config
registerServiceWorker("/firebase-messaging-sw.js", "Firebase Messaging", firebaseConfig);   