<template>
  <div class="chat-wrapper" :style="{ width: `${width}px`, height: `${parentHeight}px` }">
    <div v-if="!username" class="name-prompt">
      <input
        v-model="tempName"
        placeholder="Enter your name to start chatting"
        @keyup.enter="setUsername"
      />
      <button @click="setUsername">Start Chatting</button>
    </div>

    <div v-else>
      <div
        class="chat-window"
        :style="{ maxHeight: `${availableChatHeight - 20}px`, height: `${availableChatHeight}px`, overflowY: 'auto' }"
        ref="chatWindow"
      >
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
          :placeholder="computedPlaceholder"
          @keyup.enter="sendMessage"
          :disabled="sendingMessage"
        />
        <button @click="sendMessage" :disabled="sendingMessage">Send</button>
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
    width: {
      type: Number,
      required: true
    },
    // height: {
    //   type: Number,
    //   required: true
    // }
  },
  data() {
    return {
      username: null,
      tempName: "",
      newMessage: "",
      messages: [],
      parentHeight: 0,
      inputBoxHeight: 70, // Default height of the input-wrapper
      sendingMessage: false,
    };
  },
  computed: {
    computedPlaceholder() {
      const username = sessionStorage.getItem('username') || 'Guest';
      if (this.role === 'admin') {
        return 'Type your admin message here...';
      }
      return `You are chatting as ${username}`;
    },
    chatWrapperStyle() {
      return {
        width: `${this.width}px`,
        height: `${this.height}px`,
      };
    },
    availableChatHeight() {
      const calculatedHeight = this.parentHeight - this.inputBoxHeight;
      return Number.isFinite(calculatedHeight) ? calculatedHeight : 0;
    },
  },
  methods: {
    updateParentHeight() {
      this.$nextTick(() => {
        const parent = this.$el.parentNode; // Get the parent node
        if (parent) {
          this.parentHeight = parent.offsetHeight; // Calculate height of the parent
          console.log("Parent height updated:", this.parentHeight);
        }
      });
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const chatWindow = this.$refs.chatWindow;
        const inputWrapper = this.$el.querySelector(".input-wrapper");
        const inputHeight = inputWrapper ? inputWrapper.offsetHeight : 70; // Default to 60px if input-wrapper height isn't found
        if (chatWindow) {
          chatWindow.scrollTop = chatWindow.scrollHeight - chatWindow.clientHeight + inputHeight;
        }
      });
    },
    setUsername() {
      if (this.tempName.trim()) {
        this.username = this.tempName.trim();
        sessionStorage.setItem('username', this.username); // Save username to sessionStorage
        this.fetchMessages();
      }
    },
    fetchMessages() {
      const messagesQuery = query(
        collection(db, "chatMessages"),
        orderBy("timestamp", "asc")
      );
      onSnapshot(messagesQuery, (snapshot) => {
        this.messages = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        this.scrollToBottom(); // Always scroll to the bottom on new message fetch
      });
    },
    sendMessage() {
      if (this.newMessage.trim()) {
        this.sendingMessage = true;
        addDoc(collection(db, "chatMessages"), {
          name: this.username,
          text: this.newMessage.trim(),
          timestamp: Date.now(),
          role: this.role,
        })
          .then(() => {
            this.newMessage = "";
            this.scrollToBottom(); // Scroll after sending a message
          })
          .catch((error) => {
            console.error("Error sending message:", error);
          })
          .finally(() => {
            this.sendingMessage = false; // Re-enable input
          });
      }
    },
    resetSession() {
      sessionStorage.removeItem('username'); // Clear the username from sessionStorage
      this.username = null; // Reset local username
      alert("Session expired. Please re-enter your name.");
    },
    updateInputBoxHeight() {
      this.$nextTick(() => {
        const inputWrapper = this.$el.querySelector(".input-wrapper");
        if (inputWrapper) {
          this.inputBoxHeight = inputWrapper.offsetHeight || 70; // Fallback to 60 if not found
        }
      });
    },
    deleteMessage(messageId) {
      deleteDoc(doc(db, "chatMessages", messageId))
        .then(() => {
          console.log("Message deleted successfully");
          this.updateComponentHeight();
        })
        .catch((error) => {
          console.error("Error deleting message:", error);
        });
    },
    updateComponentHeight() {
      this.$nextTick(() => {
        const chatWindow = this.$refs.chatWindow;
        if (chatWindow) {
          chatWindow.style.maxHeight = `${this.height}px`;
        }
      });
    }
  },
  mounted() {
    this.updateParentHeight();
    this.updateInputBoxHeight(); // Calculate input-wrapper height initially
    this.scrollToBottom(); // Ensure initial scroll position is at the bottom
    window.addEventListener("resize", this.updateInputBoxHeight); // Recalculate on window resize
    // Retrieve username from sessionStorage on mount
    const savedUsername = sessionStorage.getItem('username');
    if (savedUsername) {
      this.username = savedUsername;
      this.fetchMessages(); // Fetch messages if a username is already set
    }
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.updateInputBoxHeight);
  },
};
</script>

<style scoped>
.chat-wrapper {
  display: flex;
  flex-direction: column;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 100%; /* Allow the wrapper to scale with its container */
  margin: 0 auto; /* Center the chat component horizontally */
  height: 100%; /* Set height to ensure layout is contained */
  overflow: hidden; /* Prevent horizontal overflow */
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
  background-color: #162D5D;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.name-prompt button:hover {
  background-color: #315297;
}

.chat-window {
  flex-grow: 1; /* Allow chat-window to take up available space */
  overflow-y: auto; /* Enable scrolling for chat messages */
  padding: 20px 10px 10px 10px; /* Prevent extra padding that may affect height */
  background-color: #fff;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #ddd;
  word-wrap: break-word; /* Ensure long text wraps */
  height: 100%; /* Enforce consistent height */
}

.chat-bubble {
  padding: 10px 15px;
  margin: 10px 0;
  max-width: 100%; /* Prevent chat bubbles from exceeding container width */
  display: block;
  border-radius: 15px;
  position: relative;
  word-wrap: break-word; /* Wrap text to avoid horizontal overflow */
  overflow-wrap: break-word;
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
  flex-shrink: 0; /* Prevent shrinking */
  position: sticky; /* Keep it fixed within the chat-wrapper */
  bottom: 0; /* Align to the bottom */
  max-width: 100%; /* Ensure input-wrapper respects the max width */
  height: 40px; /* Consistent height */
}


.input-wrapper input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  font-size: 16px;
  max-width: calc(100% - 100px); /* Leave space for the button */
}

.input-wrapper button {
  padding: 10px 15px;
  background-color: #162D5D;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.input-wrapper button:hover {
  background-color: #315297;
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