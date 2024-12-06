export function globalLogDebug(label, message) {
    const timestamp = new Date().toLocaleTimeString();

    // Convert objects to strings for proper storage
    const logMessage =
        typeof message === "object" ? `${label}: ${JSON.stringify(message, null, 2)}` : `${label}: ${message}`;

    const newLog = { id: Date.now(), message: logMessage, timestamp };

    // Retrieve existing logs from sessionStorage or initialize empty
    let logs = JSON.parse(sessionStorage.getItem("debugLogs")) || [];
    logs.push(newLog);

    // Keep only the latest 50 logs
    if (logs.length > 50) {
        logs.shift();
    }

    // Save updated logs back to sessionStorage
    sessionStorage.setItem("debugLogs", JSON.stringify(logs));
}