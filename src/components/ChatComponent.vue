<template>
  <div class="chat-wrapper">
    <div v-if="!username" class="name-prompt">
      <input
        v-model="tempName"
        placeholder="Enter your name to start chatting"
        @keyup.enter="setUsername"
      />
      <button @click="setUsername">Start Chatting</button>
    </div>

    <div v-else>
      <div class="chat-window" ref="chatWindow">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="[
            'chat-bubble', 
            { sender: msg.role === 'viewer' && msg.name === username, 
              admin: msg.role === 'admin' }, 
            { 'admin-view': role === 'admin' }
          ]"
        >
          <span class="message-name">{{ msg.name }}</span>
          <span class="message-text">{{ msg.text }}</span>
          <div v-if="role === 'admin' && msg.role !== 'admin'" class="admin-controls">
            <button @click="deleteMessage(msg.id)">Delete</button>
          </div>
        </div>
      </div>

      <div class="input-wrapper">
        <input
          v-model="newMessage"
          :placeholder="role === 'admin' ? 'Type your admin message here...' : 'Type your message here...'"
          @keyup.enter="sendMessage"
        />
        <button @click="sendMessage">Send</button>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from "@/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc } from "firebase/firestore";

export default {
  props: {
    role: {
      type: String,
      required: true,
      validator: value => ['viewer', 'admin'].includes(value)
    },
  },
  data() {
    return {
      username: null,
      tempName: "",
      newMessage: "",
      messages: [],
    };
  },
  methods: {
    scrollToBottom() {
      this.$nextTick(() => {
        const chatWindow = this.$refs.chatWindow;
        if (chatWindow) {
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
      });
    },
    setUsername() {
      if (this.tempName.trim()) {
        this.username = this.tempName.trim();
        this.fetchMessages();
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
    sendMessage() {
      if (this.newMessage.trim()) {
        addDoc(collection(db, "chatMessages"), {
          name: this.username,
          text: this.newMessage.trim(),
          timestamp: Date.now(),
          role: this.role,
        })
          .then(() => {
            this.newMessage = "";
            this.scrollToBottom();
          })
          .catch((error) => {
            console.error("Error sending message:", error);
          });
      }
    },
    deleteMessage(messageId) {
      deleteDoc(doc(db, "chatMessages", messageId))
        .then(() => {
          console.log("Message deleted successfully");
        })
        .catch((error) => {
          console.error("Error deleting message:", error);
        });
    },
  },
  mounted() {
    this.fetchMessages();
  }
};
</script>

<style scoped>
.chat-wrapper {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  height: 80vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.name-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.name-prompt input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.name-prompt button {
  padding: 10px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.name-prompt button:hover {
  background-color: #45a049;
}

.chat-window {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #ddd;
}

.chat-bubble {
  padding: 10px 15px;
  margin: 10px 0;
  max-width: 80%;
  display: inline-block;
  border-radius: 15px;
  position: relative;
}

.sender {
  align-self: flex-end;
  background-color: #DCF8C6;
  border-bottom-right-radius: 0;
}

.admin {
  align-self: flex-start;
  background-color: #E3F2FD;
  border-bottom-left-radius: 0;
  color: #2196F3;  /* Admin messages in a distinct color */
}

.message-name {
  font-weight: bold;
  margin-right: 5px;
  display: block;
}

.message-text {
  display: block;
}

.input-wrapper {
  display: flex;
  padding: 10px;
  background-color: #fff;
  border-radius: 0 0 8px 8px;
}

.input-wrapper input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  font-size: 16px;
}

.input-wrapper button {
  padding: 10px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.input-wrapper button:hover {
  background-color: #45a049;
}

/* Scrollbar styling for better aesthetics on chat window */
.chat-window::-webkit-scrollbar {
  width: 10px;
}

.chat-window::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 5px;
}

.chat-window::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.admin-view {
  /* Admins see messages aligned to the left */
  align-self: flex-start;
  background-color: #E3F2FD; /* Light blue for admin view to differentiate */
}

.admin-controls {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
}

.admin-controls button {
  padding: 5px 10px;
  background-color: #FF5722;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.admin-controls button:hover {
  background-color: #E64A19;
}

</style>