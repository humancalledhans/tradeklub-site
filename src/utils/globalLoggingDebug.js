export function globalLogDebug(label, message = "") {
    console.log(`globalLogDebug called with: label="${label}", message=`, message);
    const timestamp = new Date().toLocaleTimeString();

    const logMessage =
        typeof message === "object"
            ? `${label}: ${JSON.stringify(message, null, 2)}`
            : `${label}: ${message}`;

    const newLog = { id: Date.now(), message: logMessage, timestamp };

    let logs = JSON.parse(sessionStorage.getItem("debugLogs")) || [];
    logs.push(newLog);

    if (logs.length > 50) {
        logs.shift();
    }

    sessionStorage.setItem("debugLogs", JSON.stringify(logs));
}