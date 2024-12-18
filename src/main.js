import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { getMessaging, onMessage } from "firebase/messaging";
import { initializeApp, setLogLevel } from "firebase/app";
import { getToken, isSupported } from "firebase/messaging";
setLogLevel("debug");

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

const firebaseApp = initializeApp(firebaseConfig);

// Check if messaging is supported in the browser
isSupported().then(supported => {
    if (supported) {
        // Initialize Firebase Messaging
        const messaging = getMessaging(firebaseApp);

        // Request permission to receive notifications
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                // Get Instance ID token. Initially this makes a network call, once retrieved
                // subsequent calls to getToken will return from cache.
                getToken(messaging, { vapidKey: process.env.VUE_APP_FIREBASE_VAPID_KEY }).then((currentToken) => {
                    if (currentToken) {
                        console.log('Token:', currentToken);
                        // Send the token to your server to store for later use
                    } else {
                        console.log('No registration token available. Request permission to generate one.');
                    }
                }).catch((err) => {
                    console.log('An error occurred while retrieving token. ', err);
                });

                // Handle foreground messages
                onMessage(messaging, (payload) => {
                    console.log('Message received. ', payload);
                    // Here you can handle the notification when the app is in the foreground
                    // For instance, you can show a toast or update the UI directly
                    const notificationTitle = payload.notification.title;
                    const notificationOptions = {
                        body: payload.notification.body,
                        icon: payload.notification.icon || "/default-icon.png",
                    };

                    // If you want to show a system notification even in the foreground:
                    new Notification(notificationTitle, notificationOptions);

                    // Or you might prefer to show an in-app notification or update UI
                    // Example: app.config.globalProperties.$notify({ title: notificationTitle, message: notificationOptions.body });
                });
            } else {
                console.log('Unable to get permission to notify.');
            }
        });
    } else {
        console.log("Messaging isn't supported on this browser.");
    }
});

// Function to register a service worker
async function registerServiceWorker(swPath, swName, config = null) {
    if ("serviceWorker" in navigator) {
        try {
            console.log(`Attempting to register ${swName} Service Worker at path: ${swPath}`);
            const registration = await navigator.serviceWorker.register(swPath);
            console.log(`${swName} Service Worker registration successful for path ${swPath}:`, registration);

            // Check for updates right after registration
            await checkForServiceWorkerUpdate(registration);

            const serviceWorker = await waitForServiceWorkerActivation(registration);
            console.log(`Service Worker for ${swName} activated successfully.`);
            if (config && serviceWorker) {
                console.log(`Sending configuration to ${swName} Service Worker.`);
                serviceWorker.postMessage({ firebaseConfig: config });
            }
            return registration;
        } catch (error) {
            if (error.code === 'messaging/unsupported-browser') {
                console.warn('This browser does not support the necessary APIs for Firebase Messaging:', error);
            } else {
                console.error(`${swName} Service Worker registration failed with error:`, error);
            }
        }
    } else {
        console.warn(`${swName} Service Worker is not supported in this browser.`);
    }
}


// New function to check for service worker updates
async function checkForServiceWorkerUpdate(registration) {
    try {
        await registration.update();
        console.log('Service Worker updated');
        // Here you might want to notify the user or decide if you want to reload the page
        // Uncomment the below line if you want an automatic reload after an update
        // window.location.reload();
    } catch (error) {
        console.error('Service Worker update check failed:', error);
    }
}


// Helper function to wait for Service Worker activation
async function waitForServiceWorkerActivation(registration) {
    if (registration.active) {
        return registration.active;
    }

    return new Promise((resolve, reject) => {
        if (registration.installing || registration.waiting) {
            const worker = registration.installing || registration.waiting;
            worker.addEventListener('statechange', () => {
                if (worker.state === 'activated') {
                    resolve(worker);
                }
            });
        } else {
            reject(new Error('Service Worker failed to activate.'));
        }
    });
}

// Function to deregister all service workers
async function deregisterServiceWorkers() {
    if ("serviceWorker" in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log("Service Worker unregistered:", registration.scope);
            }
            console.log("All service workers deregistered successfully.");
        } catch (error) {
            console.error("Failed to deregister service workers:", error);
        }
    } else {
        console.warn("Service workers are not supported in this browser.");
    }
}

// Call deregisterServiceWorkers() to clean up old service workers (if needed)
console.log("Deregistering old service workers...");
deregisterServiceWorkers().then(() => {
    console.log("All service workers deregistered successfully, proceeding to register new one...");
    registerServiceWorker("/firebase-messaging-sw.js", "Firebase Messaging", firebaseConfig)
        .then(() => {
            console.log("Service worker registered successfully after deregistration.");
        })
        .catch((error) => {
            console.error("An error occurred during service worker registration:", error);
            // Here we catch the error but don't re-throw it, so the app continues to run
        });
}).catch((error) => {
    console.error("An error occurred during service worker deregistration:", error);
    // Here we catch the error but don't re-throw it, so the app continues to run
});