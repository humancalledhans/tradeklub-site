import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { firebaseApp } from "./firebase-config";
import { globalLogDebug } from "@/utils/globalLoggingDebug";

// Initialize Firebase Messaging
const messaging = getMessaging(firebaseApp);
const BACKEND_URL = process.env.VUE_APP_BACKEND_URL || "http://localhost:8000";

// Helper functions for local storage
const storeTokenInLocalStorage = (token) => {
    localStorage.setItem('fcmToken', token);
};

const getTokenFromLocalStorage = () => {
    return localStorage.getItem('fcmToken');
};

// Function to check and update token
const checkToken = async () => {

    if (!("Notification" in window)) {
        globalLogDebug("Notification API not supported CT");
        console.error("Notification API not supported in this browser.");
        return;
    }

    try {
        globalLogDebug("CT 1");
        const currentToken = await getToken(messaging);
        if (currentToken) {
            globalLogDebug("CT 2a");
            const storedToken = getTokenFromLocalStorage();

            globalLogDebug("CT 3a");
            if (currentToken !== storedToken) {
                console.log('Token changed:', currentToken);
                globalLogDebug("Token changed", currentToken);
                storeTokenInLocalStorage(currentToken);

                globalLogDebug("CT 4a call updateToken endpoint");
                // Send this token to your server
                fetch(`${BACKEND_URL}/updateToken`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token: currentToken })
                })
                    .then((response) => response.json())
                    .then((data) => {
                        globalLogDebug("CT 5a token update response");
                        console.log('Token update response:', data);
                        globalLogDebug("Token update response", data);
                    })
                    .catch((error) => {
                        console.error('Error sending refreshed token to server:', error);
                        globalLogDebug("Error sending refreshed token to server", { error: error.message });
                    });
            } else {
                globalLogDebug("CT 1b token unchanged");
                console.log('Token unchanged');
            }
        } else {
            globalLogDebug("CT 1c no instance id token available. request perm");
            console.log('No Instance ID token available. Request permission to generate one.');
            globalLogDebug("No Instance ID token available");
        }
    } catch (error) {
        console.error('An error occurred while retrieving token:', error);
        globalLogDebug("Error retrieving token", { error: error.message });
    }
};

// Call this function when you initialize your app or when you think the token might have changed
// For example, on app load or after significant user actions that might lead to token refresh
checkToken();

// Or you can set an interval to periodically check for token changes
setInterval(checkToken, 60000); // Every minute, for example

export async function requestNotificationPermission() {
    console.log("Requesting Notification Permission");
    globalLogDebug("Notification permission requested");

    if (!("Notification" in window)) {
        globalLogDebug("Notification API not supported");
        console.error("Notification API not supported in this browser.");
        return;
    }

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
                storeTokenInLocalStorage(token); // Store the token

                // Directly send token to backend without user profile
                await fetch(`${BACKEND_URL}/subscribe`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                })
                    .then(async (response) => {
                        const responseData = await response.json();
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
                console.log("Failed to retrieve FCM token. Token is null or undefined.");
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
    console.log("on message called");
    console.log("Message received in foreground:", payload);

    const notificationTitle = payload.notification?.title || "Default Foreground Title";
    const notificationOptions = {
        body: payload.notification?.body || "Default Foreground Body",
        icon: payload.notification?.icon || "/default-icon.png",
    };

    new Notification(notificationTitle, notificationOptions);
});