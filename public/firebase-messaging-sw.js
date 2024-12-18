const staticFirebaseConfig = {
    apiKey: "AIzaSyD041NKmcgIUvCEyOQ4Qnj40o2bIaciRsc",
    authDomain: "trade-like-the-pros-1.firebaseapp.com",
    projectId: "trade-like-the-pros-1",
    storageBucket: "trade-like-the-pros-1.firebasestorage.app",
    messagingSenderId: "139658812511",
    appId: "1:139658812511:web:4e39392b2c3c4a52830fea",
};

let firebaseInitialized = false;

self.addEventListener("message", (event) => {
    if (event.data && event.data.firebaseConfig && !firebaseInitialized) {
        initializeFirebase(event.data.firebaseConfig);
    }
});

// Fallback: Initialize Firebase with static config if no dynamic config is provided
if (!firebaseInitialized) {
    initializeFirebase(staticFirebaseConfig);
}

function initializeFirebase(config) {
    try {
        importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js');
        importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging.js');

        firebase.initializeApp(config);
        const messaging = firebase.messaging();

        console.log("Firebase initialized in Service Worker with config:", config);

        messaging.onBackgroundMessage((payload) => {
            console.log("Received background message:", payload);

            const notificationTitle = payload.notification?.title || "Default Title";
            const notificationOptions = {
                body: payload.notification?.body || "Default Body",
                icon: payload.notification?.icon || "/default-icon.png",
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });

        firebaseInitialized = true;
    } catch (error) {
        console.error("Error initializing Firebase in Service Worker:", error);
    }
}

// Handle generic push events (in case you use another push service in future or for testing)
self.addEventListener("push", (event) => {
    const data = event.data.json();
    const title = data.title || "Default Title";
    const options = {
        body: data.body || "Default body",
        icon: data.icon || "/favicon.ico",
        badge: data.badge || "/favicon.ico",
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click events
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const notificationData = event.notification.data;
    if (notificationData && notificationData.url) {
        event.waitUntil(clients.openWindow(notificationData.url));
    } else {
        console.log("No URL found in notification data.");
    }
});