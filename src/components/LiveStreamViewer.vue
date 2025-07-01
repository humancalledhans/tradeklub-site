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
      <button @click="joinRoom" :disabled="!userName.trim()">Join Room</button>
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
              <button :class="{ active: activeTab === 'broadcasters' }" @click="activeTab = 'broadcasters'">
                Broadcasters ({{ broadcasters.length }})
              </button>
              <button :class="{ active: activeTab === 'members' }" @click="activeTab = 'members'">
                Members ({{ members.length }})
              </button>
            </div>
            <div class="tab-content">
              <ul v-if="activeTab === 'broadcasters'">
                <li v-for="(peer, index) in broadcasters" :key="index">
                  {{ peer.name }}
                </li>
              </ul>
              <ul v-if="activeTab === 'members'">
                <li v-for="(peer, index) in members" :key="index">
                  {{ peer.name }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { hmsActions, hmsStore, hmsNotifications } from '../hms.js';

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
  },
  data() {
    return {
      messages: [],
      newMessage: "",
      participants: [],
      broadcasters: [],
      members: [],
      userId: null,
      userName: localStorage.getItem('userName') || '',
      hasJoined: false,
      showParticipantsMenu: false,
      activeTab: 'broadcasters',
      // Authentication state
      isUserLoggedIn: false
    };
  },
  async mounted() {

    // Check authentication status first
    this.checkAuthStatus();

    this.userId = localStorage.getItem('user_id');
    if (!this.userId) {
      if (window.crypto && window.crypto.randomUUID) {
        this.userId = window.crypto.randomUUID();
      } else {
        this.userId = "viewer-" + Math.random().toString(36).substr(2, 9);
      }
      localStorage.setItem('user_id', this.userId);
    }

    if (this.userName.trim()) {
      await this.joinRoom();
    }

    document.addEventListener('click', this.closeParticipantsMenu);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeParticipantsMenu);
    if (this.hasJoined) {
      hmsActions.leave();
    }
  },
  methods: {
    checkAuthStatus() {
      // Check for user in sessionStorage (you can modify this based on your auth implementation)
      const user = sessionStorage.getItem('user');
      this.isUserLoggedIn = !!user;

      // Alternative approaches:
      // const token = localStorage.getItem('authToken');
      // this.isUserLoggedIn = !!token;

      // Or check for a specific user property:
      // const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
      // this.isUserLoggedIn = userData.authenticated === true;

      console.log('Auth status:', this.isUserLoggedIn);
    },

    triggerParentLogin() {
      // Emit an event to the parent component to trigger login
      this.$emit('request-login');
    },


    async fetchAuthToken(userId) {
      try {
        const BACKEND_URL = process.env.VUE_APP_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(BACKEND_URL + '/generate-100ms-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user_id: userId })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return { token: data.token, roomId: data.room_id };
      } catch (error) {
        console.error('Error fetching auth token:', error);
        return null;
      }
    },
    async joinRoom() {
      if (!this.userName.trim()) {
        console.error("User name is required to join the room");
        return;
      }

      const authData = await this.fetchAuthToken(this.userId);
      if (!authData) {
        console.error("Failed to fetch auth token, cannot join room");
        return;
      }

      const config = {
        userName: this.userName,
        authToken: authData.token,
        settings: {
          isAudioMuted: true,
          isVideoMuted: true,
        },
        role: "viewer-realtime",
      };

      try {
        await hmsActions.join(config);
        console.log("Joined room successfully");
        this.hasJoined = true;
        localStorage.setItem('userName', this.userName);

        hmsNotifications.onNotification((notification) => {
          console.log('Notification received 3535:', notification);
          if (notification.data && notification.data.message) {
            const newMessage = {
              id: notification.data.id || `${notification.data.senderUserId}-${notification.data.message}`,
              senderName: notification.data.senderName || 'Unknown',
              text: notification.data.message || 'No message text'
            };
            if (!this.messages.some(m => m.id === newMessage.id)) {
              this.messages.push(newMessage);
              this.scrollToBottom();
            }
          } else if (notification.type === 'PEER_JOINED' || notification.type === 'PEER_LEFT') {
            console.log('Peer event:', notification);
            this.updateParticipants(hmsStore.getState().peers);
          }
        });

        hmsStore.subscribe(
          (state) => this.updateMessages(state.messages ? state.messages.byID : undefined),
          (state) => (state.messages ? state.messages.byID : undefined)
        );

        hmsStore.subscribe(
          (state) => this.updateParticipants(state.peers),
          (state) => state.peers
        );

        const initialState = hmsStore.getState();
        console.log('Initial peers:', initialState.peers);
        this.updateMessages(initialState.messages ? initialState.messages.byID : undefined);
        this.updateParticipants(initialState.peers);

        console.log('Initial store state:', initialState);

        setInterval(() => {
          const state = hmsStore.getState();
          console.log('Periodic peers check:', state.peers);
        }, 5000);
      } catch (error) {
        console.error("Error joining room:", error);
      }
    },
    sendMessage() {
      if (this.newMessage.trim()) {
        console.log('Sending message:', this.newMessage);
        hmsActions.sendBroadcastMessage(this.newMessage);
        const selfMessage = {
          id: `${this.userId}-${Date.now()}`,
          senderName: this.userName,
          text: this.newMessage
        };
        if (!this.messages.some(m => m.id === selfMessage.id)) {
          this.messages.push(selfMessage);
          this.scrollToBottom();
        }
        this.newMessage = "";
        console.log('Full store state after send:', hmsStore.getState());
      }
    },
    updateParticipants(peers) {
      console.log('Updating participants with peers:', peers);
      if (peers && typeof peers === 'object' && Object.keys(peers).length > 0) {
        const peerList = Object.values(peers);
        console.log('Converted peer list:', peerList);
        this.participants = peerList;
        this.broadcasters = peerList.filter(peer => peer.roleName === 'broadcaster');
        this.members = peerList.filter(peer => peer.roleName === 'viewer-realtime');
        console.log('Broadcasters:', this.broadcasters);
        console.log('Members:', this.members);
      } else {
        console.log('Peers is invalid or empty, keeping last state:', peers);
      }
    },
    updateMessages(messagesByID) {
      if (messagesByID && Array.isArray(messagesByID)) {
        console.log('Chat messages from store.byID:', messagesByID);
        const storeMessages = messagesByID.map(msg => ({
          id: msg.id || `${msg.senderUserId}-${msg.message}`,
          senderName: msg.senderName || 'Unknown',
          text: msg.message || 'No message text'
        }));
        this.messages = [
          ...this.messages.filter(m => !storeMessages.some(sm => sm.id === m.id)),
          ...storeMessages
        ];
        this.scrollToBottom();
      } else {
        console.log('No messages in store.byID or invalid format:', messagesByID);
      }
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
      console.log('Toggling participants menu. Current state:', this.showParticipantsMenu);
      this.showParticipantsMenu = !this.showParticipantsMenu;
      console.log('New state:', this.showParticipantsMenu);
      event.stopPropagation();
    },
    closeParticipantsMenu(event) {
      if (this.showParticipantsMenu && !this.$el.querySelector('.participants-menu')?.contains(event.target) &&
        !this.$el.querySelector('.menu-button')?.contains(event.target)) {
        this.showParticipantsMenu = false;
        console.log('Menu closed via click outside');
      }
    },
  },
};
</script>

<style scoped>
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
  /* Anchor for menu positioning */
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
  /* Position above the input */
  right: 0;
  /* Align with the right edge of the menu button */
  transform: translateY(-10px);
  /* Slight offset from the button */
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

/* Responsive design */
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