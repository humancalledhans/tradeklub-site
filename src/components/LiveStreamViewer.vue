<template>
  <div>
    <!-- Authentication Check -->
    <div v-if="!isUserLoggedIn" class="auth-section" :style="{ height: `${parentHeight}px` }">
      <div class="auth-content">
        <h3>Authentication Required</h3>
        <p>Please log in to access the live streaming session</p>
        <!-- <button @click="triggerParentLogin" class="login-button">
          Login
        </button> -->
      </div>
    </div>

    <!-- Name input UI before joining -->
    <div v-else-if="!hasJoined" class="join-section" :style="{ height: `${parentHeight}px` }">
      <input v-model="userName" placeholder="Enter your name..." @keyup.enter="joinRoom" class="name-input" />
      <button @click="joinRoom" :disabled="!userName.trim()">Join Chat</button>
    </div>

    <!-- Chat UI after joining -->
    <div v-else-if="hasJoined" class="chat-wrapper" :style="{ width: `${width}px`, height: `${parentHeight}px` }">
      <div class="chat-container">
        <div id="chat-messages" ref="chatMessages" class="chat-messages">
          <div v-for="(message, index) in messages" :key="index"
            :class="['message-box', { 'self-message': message.senderName === userName }]">
            <span class="sender-name">{{ message.senderName }}</span>: {{ message.text }}
          </div>
        </div>
        <div class="chat-input">
          <input v-model="newMessage" placeholder="Type a message..." @keyup.enter="sendMessage" />
          <button @click="sendMessage">Send</button>
          <button class="menu-button" @click="toggleParticipantsMenu">•••</button>
          <div v-if="showParticipantsMenu" class="participants-menu">
            <div class="tabs">
              <button :class="{ active: activeTab === 'viewers' }" @click="activeTab = 'viewers'">
                Viewers ({{ viewerCount }})
              </button>
            </div>
            <div class="tab-content">
              <ul v-if="activeTab === 'viewers'">
                <li v-for="(viewer, index) in connectedViewers" :key="index">
                  👤 {{ viewer.name || viewer.uid }}
                </li>
              </ul>
              <div v-if="connectedViewers.length === 0" class="no-viewers">
                No other viewers connected
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// ⭐ SIMPLIFIED: Use Agora RTC for both video AND messaging
import AgoraRTC from "agora-rtc-sdk-ng";

export default {
  name: "LiveStreamViewer",
  props: {
    width: {
      type: Number,
      required: true,
    },
    parentHeight: {
      type: Number,
      required: true,
    },
    isAuthenticated: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      // ⭐ SIMPLIFIED: Use RTC client for both video and messaging
      client: null,
      
      // Chat data
      messages: [],
      newMessage: "",
      
      // User data
      userId: null,
      userName: localStorage.getItem('userName') || '',
      hasJoined: false,
      
      // UI state
      showParticipantsMenu: false,
      activeTab: 'viewers',
      
      // Channel info
      channelName: 'trading-room', // Match your video streaming setup
      connectedViewers: [],
      
      // Agora credentials
      appId: process.env.VUE_APP_AGORA_APP_ID,
    };
  },
  computed: {
    isUserLoggedIn() {
      if (this.isAuthenticated) {
        return true;
      }
      
      const sessionUser = sessionStorage.getItem('user');
      if (sessionUser) {
        try {
          const userData = JSON.parse(sessionUser);
          return !!(userData && (userData.uid || userData.email || userData.authenticated));
        } catch (error) {
          console.error('Error parsing session user:', error);
          return false;
        }
      }
      
      return false;
    },
    viewerCount() {
      return this.connectedViewers.length;
    }
  },
  watch: {
    isAuthenticated(newValue, oldValue) {
      console.log('LiveStreamViewer auth status changed:', { from: oldValue, to: newValue });
      if (newValue && !oldValue) {
        console.log('User just logged in to LiveStreamViewer');
        if (this.userName.trim() && !this.hasJoined) {
          this.joinRoom();
        }
      } else if (!newValue && oldValue) {
        console.log('User logged out from LiveStreamViewer');
        if (this.hasJoined) {
          this.leaveRoom();
        }
      }
    },
    
    isUserLoggedIn(newValue, oldValue) {
      console.log('isUserLoggedIn computed changed:', { from: oldValue, to: newValue });
    }
  },
  async mounted() {
    console.log('LiveStreamViewer mounted with auth status:', this.isAuthenticated);
    console.log('Computed isUserLoggedIn:', this.isUserLoggedIn);

    // Generate or get user ID
    this.userId = localStorage.getItem('user_id');
    if (!this.userId) {
      if (window.crypto && window.crypto.randomUUID) {
        this.userId = window.crypto.randomUUID();
      } else {
        this.userId = "viewer-" + Math.random().toString(36).substr(2, 9);
      }
      localStorage.setItem('user_id', this.userId);
    }

    // Auto-join if authenticated and has saved name
    if (this.isUserLoggedIn && this.userName.trim()) {
      await this.joinRoom();
    }

    document.addEventListener('click', this.closeParticipantsMenu);
    window.addEventListener('storage', this.handleStorageChange);
    window.addEventListener('session-storage-change', this.handleStorageChange);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeParticipantsMenu);
    window.removeEventListener('storage', this.handleStorageChange);
    window.removeEventListener('session-storage-change', this.handleStorageChange);
    if (this.hasJoined) {
      this.leaveRoom();
    }
  },
  methods: {
    handleStorageChange() {
      console.log('Storage changed, rechecking auth status');
      this.$forceUpdate();
    },

    triggerParentLogin() {
      console.log('Requesting login from LiveStreamViewer');
      this.$emit('request-login');
    },

    // ⭐ SIMPLIFIED: Get regular RTC token (reuse existing endpoint)
    async fetchToken(userId) {
      try {
        const BACKEND_URL = process.env.VUE_APP_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${BACKEND_URL}/generate-agora-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            channel_name: this.channelName,
            uid: userId,
            role: 'audience'  // Join as audience for chat
          })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching token:', error);
        return null;
      }
    },

    // ⭐ SIMPLIFIED: Use RTC client for messaging
    async joinRoom() {
      if (!this.isUserLoggedIn) {
        console.log('User not authenticated');
        return;
      }

      if (!this.userName.trim()) {
        console.error("User name is required to join the room");
        return;
      }

      try {
        console.log('Initializing Agora RTC for chat...');
        
        // Create RTC client (same as your video streaming)
        this.client = AgoraRTC.createClient({ 
          mode: "rtc", 
          codec: "vp8" 
        });
        
        // Get token using existing endpoint
        const tokenData = await this.fetchToken(this.userId);
        if (!tokenData) {
          throw new Error('Failed to get authentication token');
        }
        
        console.log('Token received for chat');
        
        // Join channel as audience (no video/audio publishing)
        await this.client.join(
          tokenData.app_id, 
          this.channelName, 
          tokenData.token,
          parseInt(tokenData.uid)
        );
        
        console.log('Joined RTC channel for chat');
        
        // Set up event listeners for messaging
        this.setupEventListeners();
        
        // Send join notification using stream message
        await this.sendStreamMessage({
          type: 'user_joined',
          userName: this.userName,
          userId: this.userId,
          timestamp: Date.now()
        });
        
        this.hasJoined = true;
        localStorage.setItem('userName', this.userName);
        
        console.log('Successfully joined chat room');
        
      } catch (error) {
        console.error("Error joining room:", error);
        alert('Failed to join chat: ' + error.message);
      }
    },

    // ⭐ NEW: Set up RTC event listeners for messaging
    setupEventListeners() {
      // Listen for users joining/leaving
      this.client.on("user-joined", (user) => {
        console.log("User joined:", user.uid);
        this.addViewer(user);
      });

      this.client.on("user-left", (user) => {
        console.log("User left:", user.uid);
        this.removeViewer(user.uid);
      });

      // ⭐ KEY: Listen for stream messages (chat messages)
      this.client.on("stream-message", (uid, stream) => {
        try {
          // Convert stream data back to string
          const messageText = new TextDecoder().decode(stream);
          const messageData = JSON.parse(messageText);
          
          console.log('Received stream message:', messageData);
          
          if (messageData.type === 'chat_message') {
            const newMessage = {
              id: messageData.id || `${uid}-${Date.now()}`,
              senderName: messageData.userName || uid,
              text: messageData.message,
              timestamp: messageData.timestamp || Date.now()
            };
            
            // Avoid duplicate messages
            if (!this.messages.some(m => m.id === newMessage.id)) {
              this.messages.push(newMessage);
              this.scrollToBottom();
            }
          } else if (messageData.type === 'user_joined') {
            // Add user to connected viewers list
            const existingViewer = this.connectedViewers.find(v => v.uid === uid);
            if (!existingViewer) {
              this.connectedViewers.push({
                uid: uid,
                name: messageData.userName,
                joinTime: messageData.timestamp
              });
            }
          }
        } catch (error) {
          console.error('Error parsing stream message:', error);
        }
      });
    },

    // ⭐ NEW: Send stream message helper
    async sendStreamMessage(data) {
      try {
        const messageString = JSON.stringify(data);
        const messageBuffer = new TextEncoder().encode(messageString);
        await this.client.sendStreamMessage(messageBuffer);
      } catch (error) {
        console.error('Error sending stream message:', error);
        throw error;
      }
    },

    // ⭐ SIMPLIFIED: Send message via RTC stream message
    async sendMessage() {
      if (!this.newMessage.trim() || !this.hasJoined) return;

      try {
        const messageData = {
          type: 'chat_message',
          id: `${this.userId}-${Date.now()}`,
          userName: this.userName,
          message: this.newMessage.trim(),
          timestamp: Date.now()
        };

        // Send via RTC stream message
        await this.sendStreamMessage(messageData);

        // Add to local messages immediately
        const selfMessage = {
          id: messageData.id,
          senderName: this.userName,
          text: messageData.message,
          timestamp: messageData.timestamp
        };

        if (!this.messages.some(m => m.id === selfMessage.id)) {
          this.messages.push(selfMessage);
          this.scrollToBottom();
        }

        this.newMessage = "";
        console.log('Message sent successfully');

      } catch (error) {
        console.error('Failed to send message:', error);
        alert('Failed to send message: ' + error.message);
      }
    },

    // ⭐ SIMPLIFIED: Leave RTC channel
    async leaveRoom() {
      try {
        if (this.client) {
          // Send leave notification
          await this.sendStreamMessage({
            type: 'user_left',
            userName: this.userName,
            userId: this.userId,
            timestamp: Date.now()
          });

          await this.client.leave();
          this.client = null;
        }

        this.hasJoined = false;
        this.connectedViewers = [];
        this.messages = [];
        
        console.log('Left chat room successfully');
        
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    },

    addViewer(user) {
      const existingViewer = this.connectedViewers.find(v => v.uid === user.uid);
      if (!existingViewer) {
        this.connectedViewers.push({
          uid: user.uid,
          name: user.uid, // Will be updated when they send join message
          joinTime: Date.now()
        });
      }
    },

    removeViewer(uid) {
      this.connectedViewers = this.connectedViewers.filter(viewer => viewer.uid !== uid);
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const chatMessages = this.$refs.chatMessages;
        if (chatMessages) {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      });
    },

    toggleParticipantsMenu(event) {
      this.showParticipantsMenu = !this.showParticipantsMenu;
      event.stopPropagation();
    },

    closeParticipantsMenu(event) {
      if (this.showParticipantsMenu && !this.$el.querySelector('.participants-menu')?.contains(event.target) &&
        !this.$el.querySelector('.menu-button')?.contains(event.target)) {
        this.showParticipantsMenu = false;
      }
    },
  },
};
</script>

<style scoped>
/* Your existing styles remain the same */
.join-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 10px;
  background: #1e2a44;
  color: #ffffff;
}

.name-input {
  padding: 8px;
  font-size: 16px;
  width: 200px;
  border: 1px solid #3b4a6b;
  border-radius: 4px;
  background: #2c3e5a;
  color: #ffffff;
}

.join-section button {
  padding: 8px 16px;
  background: #4a6fa5;
  border: none;
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
}

.join-section button:disabled {
  background: #3b4a6b;
  cursor: not-allowed;
}

.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e2a44;
  color: #d1d9e6;
}

.chat-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 15px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-box {
  background: #ffffff;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  color: #2c3e5a;
  max-width: 80%;
  word-wrap: break-word;
  align-self: flex-start;
}

.message-box.self-message {
  background: #d1e4ff;
  align-self: flex-end;
  color: #1e2a44;
}

.sender-name {
  font-weight: bold;
  color: #4a6fa5;
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 15px;
  border-top: 1px solid #3b4a6b;
  position: relative;
}

.chat-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #3b4a6b;
  border-radius: 4px;
  background: #2c3e5a;
  color: #ffffff;
}

.chat-input button {
  padding: 8px 16px;
  background: #4a6fa5;
  border: none;
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
}

.chat-input button:hover {
  background: #5d87bf;
}

.menu-button {
  font-size: 16px;
  padding: 8px;
  background: none;
  border: none;
  color: #d1d9e6;
  cursor: pointer;
}

.participants-menu {
  position: absolute;
  bottom: 100%;
  right: 0;
  transform: translateY(-10px);
  background: #2c3e5a;
  border: 1px solid #3b4a6b;
  border-radius: 4px;
  padding: 10px;
  height: 300px;
  width: 200px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 10;
  display: flex;
  flex-direction: column;
  color: #d1d9e6;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #3b4a6b;
  margin-bottom: 10px;
}

.tabs button {
  flex: 1;
  padding: 5px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #d1d9e6;
}

.tabs button.active {
  background: #3b4a6b;
  font-weight: bold;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}

.tab-content ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tab-content li {
  margin: 5px 0;
}

.no-viewers {
  color: #8a9ba8;
  font-style: italic;
  text-align: center;
  padding: 20px;
  font-size: 14px;
}

.auth-content {
  text-align: center;
  background: #2c3e5a;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  width: 100%;
}

.auth-content h3 {
  margin-bottom: 16px;
  color: #d1d9e6;
  font-size: 24px;
  font-weight: 600;
}

.auth-content p {
  margin-bottom: 24px;
  color: #a1b1c6;
  font-size: 16px;
  line-height: 1.5;
}

.login-button {
  padding: 12px 24px;
  background: #4a6fa5;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background 0.3s ease;
  min-width: 120px;
}

.login-button:hover {
  background: #5a7fb5;
}

.login-button:active {
  transform: translateY(1px);
}

.auth-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  box-sizing: border-box;
  flex: 1;
  overflow: hidden;
}

@media (max-width: 768px) {
  .auth-content {
    padding: 20px;
    margin: 0 10px;
  }

  .auth-content h3 {
    font-size: 20px;
  }

  .auth-content p {
    font-size: 14px;
  }
}
</style>