<template>
    <div class="admin-login-wrapper">
      <div v-if="!isAdmin" class="admin-login">
        <h2>Admin Login</h2>
        <form @submit.prevent="login">
          <input v-model="username" type="text" placeholder="Username" required />
          <input v-model="password" type="password" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
      </div>
      <div v-else class="admin-chat-panel">
        <h2>Admin Chat Panel</h2>
        <p>Welcome, Admin!</p>
        <!-- New Subscribe Button -->
        <button @click="subscribeToNotifications" class="subscribe-button">
          (TEST) Subscribe to Notifications
        </button>
        <button @click="resetChat" class="reset-chat-button">Reset Chat</button> <!-- Reset Chat Button -->
        <div class="chat-window" ref="chatWindow">
        <div 
          v-for="message in messages" 
          :key="message.id" 
          class="chat-bubble"
        >
          <span class="message-name">{{ message.name }}</span>
          <span class="message-text">{{ message.text }}</span>
          <span class="message-timestamp">{{ new Date(message.timestamp).toLocaleString() }}</span>
        </div>
      </div>
      <div class="input-wrapper">
        <input 
          v-model="newMessage" 
          placeholder="Admin reply..." 
          @keyup.enter="sendAdminReply"
        />
        <button @click="sendAdminReply">Reply</button>
      </div>
      <!-- Debug Window -->
      <div class="debug-window">
        <h3>Debug Console</h3>
        <div v-for="log in debugLogs" :key="log.id" class="debug-log">
          {{ log.timestamp }} - {{ log.message }}
        </div>
        <button @click="resetLogs" class="reset-logs-button">Reset Logs</button>
      </div>
      </div>
    </div>
</template>
  
<script>
import { db } from "@/utils/firebase-config";
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { requestNotificationPermission } from "@/utils/firebase-messaging"; 

export default {
  data() {
    return {
      username: "",
      password: "",
      isAdmin: false, // Tracks if the user is logged in as admin
      messages: [],
      newMessage: "",
      debugLogs: [],
    };
  },
  methods: {
    resetLogs() {
      sessionStorage.removeItem("debugLogs"); // Clear the logs from sessionStorage
      this.debugLogs = []; // Clear the logs from the local state
    },
    logDebug(message) {
      const timestamp = new Date().toLocaleTimeString();
      const newLog = { id: Date.now(), message, timestamp };

      // Retrieve existing logs from sessionStorage or initialize empty
      let logs = JSON.parse(sessionStorage.getItem("debugLogs")) || [];
      logs.push(newLog);

      // Keep only the latest 50 logs
      if (logs.length > 50) {
        logs.shift();
      }

      // Save updated logs back to sessionStorage
      sessionStorage.setItem("debugLogs", JSON.stringify(logs));

      // Update local debugLogs for real-time display
      this.debugLogs = logs;
    },
    loadLogsFromSessionStorage() {
      // Load logs from sessionStorage when the component is mounted
      this.debugLogs = JSON.parse(sessionStorage.getItem("debugLogs")) || [];
    },
    login() {
      if (
        this.username === process.env.VUE_APP_ADMIN_USERNAME &&
        this.password === process.env.VUE_APP_ADMIN_PASSWORD
      ) {
        this.isAdmin = true;
        sessionStorage.setItem("isAdmin", "true"); // Store admin status in session storage
        this.fetchMessages(); // Fetch messages once logged in as admin
      } else {
        alert("Invalid credentials");
      }
    },
    fetchMessages() {
      const messagesQuery = query(
        collection(db, "chatMessages"),
        orderBy("timestamp", "asc")
      );
      onSnapshot(messagesQuery, (snapshot) => {
        this.messages = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        this.scrollToBottom();
      });
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const chatWindow = this.$refs.chatWindow;
        if (chatWindow) {
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
      });
    },
    sendAdminReply() {
      if (this.newMessage.trim()) {
        addDoc(collection(db, "chatMessages"), {
          name: "Admin", // Identifier for admin
          text: this.newMessage.trim(),
          timestamp: Date.now(),
          role: "admin",
        })
          .then(() => {
            this.newMessage = ""; // Clear the input after sending
            this.scrollToBottom(); // Scroll to show the new message
          })
          .catch((error) => {
            console.error("Error sending admin reply:", error);
          });
      }
    },
    async resetChat() {
      try {
        const messagesCollection = collection(db, "chatMessages");
        const messagesSnapshot = await getDocs(messagesCollection);

        const deletePromises = messagesSnapshot.docs.map((docSnapshot) =>
          deleteDoc(doc(db, "chatMessages", docSnapshot.id))
        );

        await Promise.all(deletePromises); // Ensure all deletions complete
        alert("Chat has been reset.");
        this.messages = []; // Clear local messages array
      } catch (error) {
        console.error("Error resetting chat:", error);
        alert("Failed to reset chat. Please try again.");
      }
    },
    async subscribeToNotifications() {

      console.log("subscribe to notification button clicked");
      try {
        await requestNotificationPermission(); // Calls the utility function to handle subscription
        alert("Subscribed to notifications successfully!");
      } catch (error) {
        this.logDebug("main notif func error.", error);
        console.error("Failed to subscribe to notifications:", error);
        alert("Failed to subscribe to notifications. Please try again.");
      }
    },
  },
  mounted() {
    const adminStatus = sessionStorage.getItem("isAdmin");
    if (adminStatus === "true") {
      this.isAdmin = true; // Restore admin status
      this.fetchMessages(); // Fetch messages if logged in as admin
    }

    this.loadLogsFromSessionStorage();
  },
};
</script>

  <style scoped>
  .admin-login-wrapper {
    width: 100%;
    height: 100%;
    margin: 0 auto;
  }
  
  .admin-login {
    background-color: #f8f8f8;
    padding: 20px;
    border-radius: 8px;
  }
  
  .admin-login input {
    width: 100%;
    padding: 10px;
    margin: 10px 0;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .admin-login button {
    width: 100%;
    padding: 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .admin-login button:hover {
    background-color: #45a049;
  }
  
  .admin-chat-panel {
    background-color: #e3f2fd;
    padding: 20px;
    border-radius: 8px;
  }

  .chat-window {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ddd;
  padding: 10px;
  margin-bottom: 20px;
}

.chat-bubble {
  height: 90%;
  width: 100%;
  margin: 10px 0;
  padding: 10px;
  background-color: #f1f1f1;
  border-radius: 8px;
}

.message-name {
  font-weight: bold;
  margin-right: 5px;
}

.message-text {
  margin-right: 10px;
}

.message-timestamp {
  font-size: 0.8em;
  color: #888;
}

.input-wrapper {

  margin-top: 10px;
  display: flex;
}

.input-wrapper input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
}

.input-wrapper button {
  padding: 10px;
  background-color: #162D5D;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.input-wrapper button:hover {
  background-color: #315297;
}

.reset-chat-button {
  padding: 10px 15px;
  background-color: #FF5722; /* A red color for warning actions */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 15px;
  transition: background-color 0.3s;
}

.reset-chat-button:hover {
  background-color: #E64A19; /* Slightly darker red on hover */
}


.subscribe-button {
  padding: 10px 15px;
  background-color: #4CAF50; /* Green color for positive actions */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 15px;
  transition: background-color 0.3s;
}

.subscribe-button:hover {
  background-color: #45a049; /* Slightly darker green on hover */
}

.debug-window {
  margin-top: 20px;
  border: 1px solid #ddd;
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.debug-window h3 {
  margin-top: 0;
  font-size: 1.2em;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
}

.debug-log {
  font-size: 0.9em;
  color: #333;
  margin-bottom: 5px;
}

.reset-logs-button {
  padding: 10px 15px;
  background-color: #d9534f; /* A red color for danger actions */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.3s;
}

.reset-logs-button:hover {
  background-color: #c9302c; /* Slightly darker red on hover */
}
  </style>