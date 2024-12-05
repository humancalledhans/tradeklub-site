let firebaseInitialized = false;

// Listen for messages (Firebase configuration will be sent from main.js)
self.addEventListener("message", (event) => {
    if (event.data && event.data.firebaseConfig && !firebaseInitialized) {
        const firebaseConfig = event.data.firebaseConfig;

        // Import Firebase scripts
        importScripts('https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js');
        importScripts('https://www.gstatic.com/firebasejs/9.16.0/firebase-messaging.js');

        // Initialize Firebase with the received config
        firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();

        console.log("Firebase initialized in Service Worker with config:", firebaseConfig);

        // Handle background messages
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
    }
});