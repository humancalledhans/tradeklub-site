import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { firebaseApp } from "./firebase-config";
import { globalLogDebug } from "@/utils/globalLoggingDebug"

// Initialize Firebase Messaging
const messaging = getMessaging(firebaseApp);
const BACKEND_URL = process.env.VUE_APP_BACKEND_URL || "http://localhost:8000";

export async function requestNotificationPermission() {
    console.log("Requesting Notification Permission");
    globalLogDebug("1");
    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            globalLogDebug("1a");
            console.error("Notification permission not granted.");
            return;
        }

        console.log("Permission granted! Attempting to get FCM token...");
        // Get FCM Token
        try {
            const token = await getToken(messaging);
            if (token) {
                console.log("FCM Token retrieved successfully:", token);
                globalLogDebug("2", token);

                // Send token to backend
                await fetch(`${BACKEND_URL}/subscribe`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                })
                    .then((response) => {
                        if (!response.ok) {
                            globalLogDebug("3", response.json());
                            console.error("Error subscribing:", response.status, response.statusText);
                        } else {
                            globalLogDebug("4 response", response.json());
                            console.log("Subscription successful:", response);
                        }
                    })
                    .catch((error) => {
                        console.error("Network error while subscribing:", error);
                    });
            } else {
                globalLogDebug("fcm token retrived fail.",)
                console.error("Failed to retrieve FCM token. Token is null or undefined.");
            }
        } catch (error) {
            console.error("Error while fetching FCM token:", error);
        }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
    }
}

// Listen for foreground messages
onMessage(messaging, (payload) => {
    console.log("Message received in foreground:", payload);

    // Optionally display a notification
    const notificationTitle = payload.notification?.title || "Default Foreground Title";
    const notificationOptions = {
        body: payload.notification?.body || "Default Foreground Body",
        icon: payload.notification?.icon || "/default-icon.png",
    };

    new Notification(notificationTitle, notificationOptions);
});