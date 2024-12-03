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
      </div>
    </div>
</template>
  
<script>
import { db } from "@/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

export default {
    data() {
        return {
        username: '',
        password: '',
        isAdmin: false,
        messages: [],
        newMessage: '',

        };
    },
    methods: {
        login() {
        if (this.username === process.env.VUE_APP_ADMIN_USERNAME && 
                this.password === process.env.VUE_APP_ADMIN_PASSWORD) {
                this.isAdmin = true;
                this.fetchMessages(); // Fetch messages once logged in as admin
            } else {
                alert('Invalid credentials');
            }
        },
        fetchMessages() {
            const messagesQuery = query(
                collection(db, "chatMessages"),
                orderBy("timestamp", "asc")
            );
            onSnapshot(messagesQuery, (snapshot) => {
                this.messages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
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
                    name: "Admin", // or any identifier for admin
                    text: this.newMessage.trim(),
                    timestamp: Date.now(),
                    role: 'admin'
                })
                .then(() => {
                    this.newMessage = ""; // Clear the input after sending
                    this.scrollToBottom(); // Scroll to show the new message
                })
                .catch((error) => {
                    console.error("Error sending admin reply:", error);
                    // Consider showing an error message to the user here
                });
            }
        },
        async resetChat() {
            try {
                const messagesCollection = collection(db, "chatMessages");
                const messagesSnapshot = await getDocs(messagesCollection);

                // Filter messages where role is admin (optional)
                const deletePromises = messagesSnapshot.docs
                    // .filter((docSnapshot) => docSnapshot.data().role === "admin") // Ensure only admin messages
                    .map((docSnapshot) =>
                        deleteDoc(doc(db, "chatMessages", docSnapshot.id))
                    );

                await Promise.all(deletePromises); // Ensure all deletions complete
                alert("Chat has been reset.");
                this.messages = []; // Clear local messages array
            } catch (error) {
                console.error("Error resetting chat:", error);
                alert("Failed to reset chat. Please try again.");
            }
        }

    },
    mounted() {
        // You might want to fetch messages here if you want them to load for all users, 
        // but since we're only showing them to admins, we call fetchMessages in login method
    }
}
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
  </style>