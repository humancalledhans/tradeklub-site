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

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const notificationData = event.notification.data;
    if (notificationData && notificationData.url) {
        event.waitUntil(clients.openWindow(notificationData.url));
    } else {
        console.log("No URL found in notification data.");
    }
});