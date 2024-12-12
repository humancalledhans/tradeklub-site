import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { setLogLevel } from "firebase/app";
setLogLevel("debug");

const app = createApp(App);
app.use(router);
app.mount('#app');

// Firebase configuration
// const firebaseConfig = {
//     apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
//     authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
//     projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
//     storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
//     messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
//     appId: process.env.VUE_APP_FIREBASE_APP_ID,
// };

// // Function to register a service worker
// async function registerServiceWorker(swPath, swName, config = null) {
//     // Check if Service Workers are supported
//     if ("serviceWorker" in navigator) {
//         try {
//             // Register the Service Worker
//             const registration = await navigator.serviceWorker.register(swPath);
//             console.log(`${swName} Service Worker registered successfully:`, registration);

//             // Wait for the Service Worker to become active
//             const serviceWorker = await waitForServiceWorkerActivation(registration);

//             // Post Firebase configuration to the active Service Worker
//             if (config && serviceWorker) {
//                 console.log(`Passing ${swName} configuration dynamically.`);
//                 serviceWorker.postMessage({ firebaseConfig: config });
//             }
//         } catch (error) {
//             console.error(`${swName} Service Worker registration failed:`, error);
//         }
//     } else {
//         console.warn(`${swName} Service Worker not supported in this browser.`);
//     }
// }

// // Helper function to wait for Service Worker activation
// async function waitForServiceWorkerActivation(registration) {
//     if (registration.active) {
//         return registration.active;
//     }

//     // Wait for the Service Worker to become active
//     return new Promise((resolve, reject) => {
//         if (registration.installing || registration.waiting) {
//             const worker = registration.installing || registration.waiting;
//             worker.addEventListener('statechange', () => {
//                 if (worker.state === 'activated') {
//                     resolve(worker);
//                 }
//             });
//         } else {
//             reject(new Error('Service Worker failed to activate.'));
//         }
//     });
// }

// // Function to deregister all service workers
// async function deregisterServiceWorkers() {
//     if ("serviceWorker" in navigator) {
//         try {
//             const registrations = await navigator.serviceWorker.getRegistrations();
//             for (const registration of registrations) {
//                 await registration.unregister();
//                 console.log("Service Worker unregistered:", registration.scope);
//             }
//             console.log("All service workers deregistered successfully.");
//         } catch (error) {
//             console.error("Failed to deregister service workers:", error);
//         }
//     } else {
//         console.warn("Service workers are not supported in this browser.");
//     }
// }

// // Call deregisterServiceWorkers() to clean up old service workers (if needed)
// console.log("Deregistering old service workers...");
// deregisterServiceWorkers().then(() => {
//     console.log("Registering service workers...");
//     // Register custom service worker (e.g., caching, offline support)
//     registerServiceWorker("/sw.js", "Custom");

//     // Register Firebase Messaging Service Worker and pass Firebase config
//     registerServiceWorker("/firebase-messaging-sw.js", "Firebase Messaging", firebaseConfig);
// });