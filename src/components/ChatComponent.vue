<template>
  <div class="chat-wrapper" :style="{ width: `${width}px`, height: `${parentHeight}px` }">
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
          { sender: msg.role === 'viewer' && msg.name === user.displayName,
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

      <!-- Vertical Three Dots Menu -->
      <div class="three-dots" @click="toggleMenu">
        <span class="dot">⋮</span>
      </div>
      <div v-if="showMenu" class="overlay" @click="closeMenu">
        <div class="menu" @click.stop>
          <button @click="logout" class="dropdown-item">Sign Out</button>
          <button @click="resetPassword" class="dropdown-item">Reset Password</button>
        </div>
      </div>
    </div>
    <!-- Reset Password Email Input -->
    <div v-if="resetPasswordMode" class="reset-password-modal">
      <input 
        v-model="emailForReset" 
        type="email" 
        placeholder="Enter your email to reset password" 
        class="reset-password-input" 
      />
      <button @click="resetPassword" class="reset-password-btn">Submit</button>
      <button @click="cancelResetPassword" class="reset-password-btn">Cancel</button>
    </div>
  </div>
</template>

<script>
import { db } from "@/utils/firebase-config";
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, getDocs, limit, startAfter } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

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
      user: null,
      emailForReset: '',
      email: '',
      password: '',
      newMessage: "",
      messages: [],
      parentHeight: 0,
      inputBoxHeight: 70, // Default height of the input-wrapper
      sendingMessage: false,
      loadingMoreMessages: false,
      showMenu: false,
      resetPasswordMode: false,
    };
  },
  computed: {
    computedPlaceholder() {
      // Use user displayName if available (will be fetched from Firestore)
      const username = this.user ? this.user.displayName || 'Guest' : 'Guest';
      console.log("this user", this.user);
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
    resetPassword() {
      if (this.resetPasswordMode) {
        const auth = getAuth();
        if (!this.emailForReset) {
          alert("Please enter your email address to reset your password.");
          return;
        }
        sendPasswordResetEmail(auth, this.emailForReset)
          .then(() => {
            alert("Password reset email sent! Please check your inbox.");
            this.resetPasswordMode = false; // Hide reset password modal after submission
          })
          .catch((error) => {
            console.error("Password reset error", error);
            alert("Error sending password reset email. Please try again.");
          });
      } else {
        this.showMenu = false; // Close the main menu before showing the reset password modal
        this.resetPasswordMode = true; // Show reset password input field
      }
    },
    cancelResetPassword() {
      this.resetPasswordMode = false; // Hide the modal if user cancels
    },
    async login() {
      const auth = getAuth();
      try {
        const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
        this.user = userCredential.user;
        this.fetchMessages(); // Fetch messages after login
      } catch (error) {
        console.error("Login Error:", error.message);
        alert("Login failed. Please check your credentials.");
      }
    },
    async register() {
      const auth = getAuth();
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
        this.user = userCredential.user;
        alert("Registration successful! You can now login.");
      } catch (error) {
        console.error("Registration Error:", error.message);
        alert("Registration failed. Please try again.");
      }
    },
    logout() {
      const auth = getAuth();
      auth.signOut().then(() => {
        this.user = null; // Reset the user state
      }).catch((error) => {
        console.error("Sign-out error", error);
      });
    },
    toggleMenu() {
      this.showMenu = !this.showMenu;  // Toggle visibility of the dropdown menu
    },
    closeMenu() {
      this.showMenu = false; // Close the menu when clicking on the overlay
    },
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
        if (chatWindow) { // Check if chatWindow ref exists
          const inputWrapper = this.$el.querySelector(".input-wrapper");
          const inputHeight = inputWrapper ? inputWrapper.offsetHeight : 70;
          chatWindow.scrollTop = chatWindow.scrollHeight - chatWindow.clientHeight + inputHeight;
        }
      });
    },
    async fetchMessages() {
      const messagesQuery = query(
        collection(db, "chatMessages"),
        orderBy("timestamp", "desc"), // Load newest messages first
        limit(20) // Start with loading just 20 messages
      );

      onSnapshot(messagesQuery, (snapshot) => {
        this.messages = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })).reverse(); // Reverse to show oldest messages first if needed

        this.scrollToBottom();
      });
    },
    handleScroll() {
      const chatWindow = this.$refs.chatWindow;
      if (chatWindow && chatWindow.scrollTop === 0 && !this.loadingMoreMessages) {
        this.loadingMoreMessages = true;
        this.loadMoreMessages();
      }
    },
    async loadMoreMessages() {
      const lastMessage = this.messages[0];
      const messagesQuery = query(
        collection(db, "chatMessages"),
        orderBy("timestamp", "desc"),
        startAfter(lastMessage.timestamp),
        limit(20)
      );

      try {
        const snapshot = await getDocs(messagesQuery);
        if (!snapshot.empty) {
          const newMessages = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          }));
          this.messages = [...newMessages.reverse(), ...this.messages]; // Prepend new messages
        }
      } catch (error) {
        console.error("Error loading more messages:", error);
      } finally {
        this.loadingMoreMessages = false;
      }
    },
    sendMessage() {
      if (this.newMessage.trim()) {
        this.sendingMessage = true;
        addDoc(collection(db, "chatMessages"), {
          name: this.user.displayName || 'Guest',  // Use the Firebase user displayName
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
          })
          .finally(() => {
            this.sendingMessage = false;
          });
      }
    },
    resetSession() {
      this.user = null;
      alert("Session expired. Please login again.");
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

    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.user = user;
        // Ensure DOM is updated before accessing chatWindow
        this.$nextTick(() => {
          this.fetchMessages();
        });
      }
    });

    window.addEventListener("resize", this.updateInputBoxHeight); // Recalculate on window resize

  },
  beforeUnmount() {
    window.removeEventListener("resize", this.updateInputBoxHeight);
    const chatWindow = this.$refs.chatWindow;
    if (chatWindow) {
      chatWindow.removeEventListener('scroll', this.handleScroll);
    }
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
  width: 100%;
  margin: 0 auto;
  height: 100%; /* Ensure the wrapper takes the full height */
  overflow: hidden; /* Prevent horizontal overflow */
}


.chat-window {
  flex-grow: 1; /* Allow chat window to expand and take available height */
  overflow-y: auto; /* Enable scrolling for chat messages */
  padding: 20px 10px 10px 10px;
  background-color: #fff;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #ddd;
  word-wrap: break-word; /* Ensure long text wraps */
  height: 100%; /* Ensure it takes full height in the wrapper */
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

.auth-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.auth-prompt h3 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.login-input {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s ease;
}

.login-input:focus {
  border-color: #162D5D;
}

.login-button, .register-button {
  padding: 12px 20px;
  background-color: #162D5D;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
  margin: 10px 0;
  width: 100%;
}

.login-button:hover, .register-button:hover {
  background-color: #315297;
}

.register-button {
  background-color: #4CAF50;
}

.register-button:hover {
  background-color: #45a049;
}

.three-dots {
  font-size: 24px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.dot {
  line-height: 1.5;  /* Space between dots */
}

.dropdown-menu {
  position: absolute;
  right: 0;
  background-color: #fff;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  margin-top: 10px;
  z-index: 10;
}

.dropdown-item {
  padding: 10px;
  border: none;
  background-color: #fff;
  width: 150px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.3s;
}

.dropdown-item:not(:last-child) {
    margin-bottom: 10px;
  }

.dropdown-item:hover {
  background-color: #f1f1f1;
}

.logout-button {
  padding: 12px 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
  margin-top: 20px;
  width: 100%;
}

.logout-button:hover {
  background-color: #c0392b;
}

/* Overlay covering the entire screen */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Menu inside the overlay */
.menu {
  background-color: #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 20px;
  width: 250px;
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  padding: 10px;
  border: none;
  background-color: #fff;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.3s;
}

.dropdown-item:hover {
  background-color: #f1f1f1;
}

.reset-password-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  padding: 20px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.reset-password-input {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  width: 200px;
  font-size: 16px;
}

.reset-password-btn {
  padding: 12px 20px;
  background-color: #162D5D;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
  width: 100%;
  transition: background-color 0.3s ease;
}

.reset-password-btn:hover {
  background-color: #315297;
}

</style>