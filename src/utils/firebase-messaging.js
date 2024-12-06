import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { firebaseApp } from "./firebase-config";
import { globalLogDebug } from "@/utils/globalLoggingDebug"

// Initialize Firebase Messaging
const messaging = getMessaging(firebaseApp);
const BACKEND_URL = process.env.VUE_APP_BACKEND_URL || "http://localhost:8000";

export async function requestNotificationPermission() {
    console.log("Requesting Notification Permission");
    globalLogDebug("Notification permission requested");

    console.log("beofre 1");
    console.log("Notification" in window);
    globalLogDebug("Notification" in window);
    if (!("Notification" in window)) {
        globalLogDebug("Notification API not supported");
        console.error("Notification API not supported in this browser.");
        return;
    }

    console.log("beofre 2");

    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            globalLogDebug("Notification permission not granted.");
            console.error("Notification permission not granted.");
            return;
        }

        globalLogDebug("Notification permission granted");
        console.log("Permission granted! Attempting to get FCM token...");

        try {
            const token = await getToken(messaging);
            if (token) {
                globalLogDebug("FCM token retrieved successfully", token);
                console.log("FCM Token retrieved successfully:", token);

                // Send token to backend
                await fetch(`${BACKEND_URL}/subscribe`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                })
                    .then(async (response) => {
                        const responseData = await response.json(); // Resolve the response
                        if (!response.ok) {
                            globalLogDebug("Subscription error response", responseData);
                        } else {
                            globalLogDebug("Subscription success response", responseData);
                        }
                    })
                    .catch((error) => {
                        globalLogDebug("Network error while subscribing", { error: error.message });
                    });
            } else {
                globalLogDebug("FCM token retrieval failed", "Token is null or undefined.");
                console.error("Failed to retrieve FCM token. Token is null or undefined.");
            }
        } catch (error) {
            globalLogDebug("Error while fetching FCM token", { error: error.message });
            console.error("Error while fetching FCM token:", error);
        }
    } catch (error) {
        globalLogDebug("Error requesting notification permission", { error: error.message });
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