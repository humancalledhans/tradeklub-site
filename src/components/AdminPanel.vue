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
    
    <div v-else class="admin-panel">
      <h2>Admin Live Stream Panel</h2>
      
      <!-- Join Controls -->
      <div v-if="!joined" class="join-section">
        <h3>Ready to Start Live Stream?</h3>
        <div class="stream-preview">
          <p><strong>📺 Channel:</strong> trading-room</p>
          <p><strong>👨‍🏫 Host:</strong> Dion (Admin)</p>
          <p><strong>🎯 Mode:</strong> Screen sharing & camera</p>
        </div>
        <button @click="startLiveStream" class="start-stream-btn">
          🚀 Start Live Stream
        </button>
      </div>

      <!-- Live Stream Controls -->
      <div v-if="joined" class="stream-section">
        <!-- Video Display -->
        <div class="video-container">
          <video 
            ref="adminVideo" 
            autoplay 
            playsinline 
            muted 
            class="admin-video"
          ></video>
          
          <!-- Stream Status -->
          <div class="stream-status">
            <span v-if="isScreenSharing" class="status-active">🖥️ Screen Sharing Active</span>
            <span v-else-if="cameraOn" class="status-active">📹 Camera Active</span>
            <span v-else class="status-inactive">📹 Stream Offline</span>
            
            <div class="viewer-count">
              👥 Viewers: {{ remoteViewers.length }}
            </div>
          </div>
        </div>

        <!-- Admin Controls -->
        <div class="admin-controls">
          <button @click="toggleCamera" :class="{ active: cameraOn, disabled: isScreenSharing }">
            {{ cameraOn ? '📷 Camera On' : '📷 Camera Off' }}
          </button>
          
          <button @click="toggleMicrophone" :class="{ active: micOn }">
            {{ micOn ? '🎤 Mic On' : '🎤 Mic Off' }}
          </button>
          
          <button @click="toggleScreenShare" :class="{ active: isScreenSharing }">
            {{ isScreenSharing ? '🖥️ Stop Screen Share' : '🖥️ Share Screen' }}
          </button>
          
          <button @click="endLiveStream" class="danger-button">
            End Live Stream
          </button>
        </div>

        <!-- Stream Info -->
        <div class="stream-info">
          <div class="info-card">
            <h4>Stream Details</h4>
            <p><strong>Channel:</strong> {{ channelName }}</p>
            <p><strong>Status:</strong> {{ streamStatus }}</p>
            <p><strong>Duration:</strong> {{ streamDuration }}</p>
            <p><strong>Viewers:</strong> {{ remoteViewers.length }}</p>
          </div>
          
          <!-- ⭐ NEW: Live Chat Display -->
          <div class="info-card chat-card">
            <h4>Live Chat</h4>
            <div class="chat-messages-admin" ref="adminChatMessages">
              <div v-if="chatMessages.length === 0" class="no-messages">
                No chat messages yet...
              </div>
              <div v-for="(message, index) in chatMessages" :key="index" class="chat-message-admin">
                <div class="message-header">
                  <span class="message-sender">{{ message.senderName }}</span>
                  <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                </div>
                <div class="message-text">{{ message.text }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AgoraRTC from "agora-rtc-sdk-ng";

export default {
  name: 'AgoraAdminView',
  data() {
    return {
      // Admin login
      username: "",
      password: "",
      isAdmin: false,
      
      // Agora client
      client: null,
      
      // Stream state
      joined: false,
      adminName: 'Dion (Admin)', // Fixed admin name
      channelName: 'trading-room', // Fixed channel name
      
      // Local tracks
      localVideoTrack: null,
      localAudioTrack: null,
      localScreenTrack: null,
      
      // Local state
      cameraOn: false,
      micOn: false,
      isScreenSharing: false,
      
      // Remote viewers
      remoteViewers: [],
      
      // ⭐ NEW: Chat messages for admin
      chatMessages: [],
      
      // Stream info
      streamStartTime: null,
      streamDuration: '00:00:00',
      
      // Agora credentials
      appId: process.env.VUE_APP_AGORA_APP_ID,
      token: null
    };
  },
  
  computed: {
    streamStatus() {
      if (!this.joined) return 'Offline';
      if (this.isScreenSharing) return 'Screen Sharing';
      if (this.cameraOn) return 'Camera Active';
      return 'Audio Only';
    }
  },
  
  async mounted() {
    // Check admin login status
    const adminStatus = sessionStorage.getItem("isAdmin");
    if (adminStatus === "true") {
      this.isAdmin = true;
    }
    
    // ⭐ NEW: Load chat messages from sessionStorage
    this.loadChatFromSession();
    
    // Initialize Agora client
    try {
      this.client = AgoraRTC.createClient({ 
        mode: "rtc", 
        codec: "vp8" 
      });
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize Agora client:', error);
    }

    console.log("remoteViewers", this.remoteViewers);
  },
  
  beforeUnmount() {
    if (this.joined) {
      this.endLiveStream();
    }
    this.stopStreamTimer();
  },
  
  methods: {
    saveChatToSession() {
      try {
        sessionStorage.setItem('admin_chat_messages', JSON.stringify(this.chatMessages));
      } catch (error) {
        console.error('Failed to save chat to session:', error);
      }
    },

    // ⭐ NEW: Load chat messages from sessionStorage
    loadChatFromSession() {
      try {
        const savedMessages = sessionStorage.getItem('admin_chat_messages');
        if (savedMessages) {
          this.chatMessages = JSON.parse(savedMessages);
          console.log('Loaded chat messages from session:', this.chatMessages.length);
          // Scroll to bottom after loading
          this.$nextTick(() => {
            this.scrollChatToBottom();
          });
        }
      } catch (error) {
        console.error('Failed to load chat from session:', error);
        this.chatMessages = [];
      }
    },

    // ⭐ NEW: Clear chat from sessionStorage
    clearChatSession() {
      sessionStorage.removeItem('admin_chat_messages');
    },
    login() {
      if (
        this.username === process.env.VUE_APP_ADMIN_USERNAME &&
        this.password === process.env.VUE_APP_ADMIN_PASSWORD
      ) {
        this.isAdmin = true;
        sessionStorage.setItem("isAdmin", "true");
      } else {
        alert("Invalid credentials");
      }
    },
    
    setupEventListeners() {
      // When a viewer joins
      this.client.on("user-joined", (user) => {
        console.log("Viewer joined:", user.uid);
        this.addViewer(user);
      });
      
      // When a viewer leaves
      this.client.on("user-left", (user) => {
        console.log("Viewer left:", user.uid);
        this.removeViewer(user.uid);
      });
      
      // When viewer publishes (they shouldn't, but just in case)
      this.client.on("user-published", async (user, mediaType) => {
        console.log("Viewer published (unexpected):", user.uid, mediaType);
      });

      // ⭐ NEW: Listen for stream messages (chat messages)
      this.client.on("stream-message", (uid, stream) => {
        try {
          // Convert stream data back to string
          const messageText = new TextDecoder().decode(stream);
          const messageData = JSON.parse(messageText);
          
          console.log('Admin received stream message:', messageData);
          
          if (messageData.type === 'chat_message') {
            const newMessage = {
              id: messageData.id || `${uid}-${Date.now()}`,
              senderName: messageData.userName || uid,
              text: messageData.message,
              timestamp: messageData.timestamp || Date.now()
            };
            
            // Avoid duplicate messages
            if (!this.chatMessages.some(m => m.id === newMessage.id)) {
              this.chatMessages.push(newMessage);
              this.saveChatToSession();
              this.scrollChatToBottom();
            }
          }
        } catch (error) {
          console.error('Error parsing stream message in admin:', error);
        }
      });
    },
    
    async startLiveStream() {
      try {
        console.log('Getting Agora token...');
        
        // Get token from backend
        const tokenResponse = await fetch(`${process.env.VUE_APP_BACKEND_URL || 'http://localhost:8000'}/generate-agora-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel_name: this.channelName,
            uid: this.adminName,
            role: 'host'
          })
        });
        
        if (!tokenResponse.ok) {
          throw new Error(`Failed to get token: ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        console.log('Token received successfully', tokenData);
        
        // ⭐ FIX: Use the UID returned from the backend instead of 0
        const uidToUse = parseInt(tokenData.uid); // Backend returns string, convert to number
        
        // Join with token using the correct UID that matches the token
        await this.client.join(
          tokenData.app_id, 
          this.channelName, 
          tokenData.token,
          uidToUse // Use the UID that the token was generated for
        );
        
        console.log(`Successfully joined as admin with UID: ${uidToUse}`);
        this.joined = true;
        this.streamStartTime = Date.now();
        this.startStreamTimer();
        
        // Start with mic on
        await this.toggleMicrophone();
        
      } catch (error) {
        console.error('Failed to start live stream:', error);
        alert('Failed to start live stream: ' + error.message);
      }
    },
    
    async endLiveStream() {
      try {
        // Stop all local tracks
        if (this.localVideoTrack) {
          await this.client.unpublish(this.localVideoTrack);
          this.localVideoTrack.stop();
          this.localVideoTrack.close();
          this.localVideoTrack = null;
        }
        
        if (this.localAudioTrack) {
          await this.client.unpublish(this.localAudioTrack);
          this.localAudioTrack.stop();
          this.localAudioTrack.close();
          this.localAudioTrack = null;
        }
        
        if (this.localScreenTrack) {
          await this.client.unpublish(this.localScreenTrack);
          this.localScreenTrack.stop();
          this.localScreenTrack.close();
          this.localScreenTrack = null;
        }
        
        // Leave the channel
        await this.client.leave();
        
        // Reset state
        this.joined = false;
        this.cameraOn = false;
        this.micOn = false;
        this.isScreenSharing = false;
        this.remoteViewers = [];
        this.chatMessages = []; // Clear chat messages from component
        this.clearChatSession(); // ⭐ NEW: Clear chat from sessionStorage
        this.stopStreamTimer();
        
        console.log('Live stream ended');
        
      } catch (error) {
        console.error('Failed to end live stream:', error);
      }
    },
    
    async toggleCamera() {
      if (this.isScreenSharing) {
        alert('Cannot use camera while screen sharing. Stop screen share first.');
        return;
      }
      
      try {
        if (!this.cameraOn) {
          // Turn camera on
          this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
          this.localVideoTrack.play(this.$refs.adminVideo);
          
          await this.client.publish(this.localVideoTrack);
          this.cameraOn = true;
          console.log('Camera turned on');
        } else {
          // Turn camera off
          await this.client.unpublish(this.localVideoTrack);
          this.localVideoTrack.stop();
          this.localVideoTrack.close();
          this.localVideoTrack = null;
          this.cameraOn = false;
          console.log('Camera turned off');
        }
      } catch (error) {
        console.error('Failed to toggle camera:', error);
        alert('Camera error: ' + error.message);
      }
    },
    
    async toggleMicrophone() {
      try {
        if (!this.micOn) {
          // Turn mic on
          this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          await this.client.publish(this.localAudioTrack);
          this.micOn = true;
          console.log('Microphone turned on');
        } else {
          // Turn mic off
          await this.client.unpublish(this.localAudioTrack);
          this.localAudioTrack.stop();
          this.localAudioTrack.close();
          this.localAudioTrack = null;
          this.micOn = false;
          console.log('Microphone turned off');
        }
      } catch (error) {
        console.error('Failed to toggle microphone:', error);
        alert('Microphone error: ' + error.message);
      }
    },
    
    async toggleScreenShare() {
      try {
        if (!this.isScreenSharing) {
          // Start screen sharing
          console.log('Starting screen share...');
          
          // Stop camera first if it's on
          if (this.cameraOn) {
            await this.client.unpublish(this.localVideoTrack);
            this.localVideoTrack.stop();
            this.localVideoTrack.close();
            this.localVideoTrack = null;
            this.cameraOn = false;
          }
          
          // Create screen share track
          this.localScreenTrack = await AgoraRTC.createScreenVideoTrack();
          this.localScreenTrack.play(this.$refs.adminVideo);
          
          await this.client.publish(this.localScreenTrack);
          this.isScreenSharing = true;
          console.log('Screen sharing started');
          
        } else {
          // Stop screen sharing
          console.log('Stopping screen share...');
          
          await this.client.unpublish(this.localScreenTrack);
          this.localScreenTrack.stop();
          this.localScreenTrack.close();
          this.localScreenTrack = null;
          this.isScreenSharing = false;
          console.log('Screen sharing stopped');
        }
      } catch (error) {
        console.error('Failed to toggle screen share:', error);
        alert('Screen share error: ' + error.message);
      }
    },
    
    addViewer(user) {
      const existingViewer = this.remoteViewers.find(v => v.uid === user.uid);
      if (!existingViewer) {
        this.remoteViewers.push({
          uid: user.uid,
          joinTime: Date.now()
        });
      }
    },
    
    removeViewer(uid) {
      this.remoteViewers = this.remoteViewers.filter(viewer => viewer.uid !== uid);
    },

    // ⭐ NEW: Format timestamp for display
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    },

    // ⭐ NEW: Scroll chat to bottom
    scrollChatToBottom() {
      this.$nextTick(() => {
        const chatContainer = this.$refs.adminChatMessages;
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      });
    },
    
    startStreamTimer() {
      this.streamTimer = setInterval(() => {
        if (this.streamStartTime) {
          const elapsed = Date.now() - this.streamStartTime;
          const hours = Math.floor(elapsed / 3600000);
          const minutes = Math.floor((elapsed % 3600000) / 60000);
          const seconds = Math.floor((elapsed % 60000) / 1000);
          
          this.streamDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    },
    
    stopStreamTimer() {
      if (this.streamTimer) {
        clearInterval(this.streamTimer);
        this.streamTimer = null;
      }
    }
  }
};
</script>

<style scoped>
.admin-login-wrapper {
  width: 100%;
  height: 100%;
  background: #1e2a44;
  color: white;
}

.admin-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f8f8f8;
  color: #333;
  padding: 40px;
}

.admin-login input {
  width: 300px;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.admin-login button {
  width: 300px;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.admin-login button:hover {
  background-color: #45a049;
}

.admin-panel {
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.join-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 15px;
}

.stream-preview {
  background: #2c3e5a;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: left;
}

.stream-preview p {
  margin: 10px 0;
  color: #d1d9e6;
  font-size: 16px;
}

.start-stream-btn {
  padding: 15px 30px;
  background: linear-gradient(135deg, #28a745, #20c997);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: transform 0.2s, box-shadow 0.2s;
}

.start-stream-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
}

.join-section button {
  padding: 12px 24px;
  background: #4a6fa5;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 16px;
}

.stream-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.video-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.admin-video {
  width: 100%;
  height: 400px;
  object-fit: contain;
  background: #000;
}

.stream-status {
  position: absolute;
  top: 15px;
  left: 15px;
  right: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-active {
  background: rgba(40, 167, 69, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: bold;
}

.status-inactive {
  background: rgba(108, 117, 125, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
}

.viewer-count {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
}

.admin-controls {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.admin-controls button {
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  background: #3b4a6b;
  color: white;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.admin-controls button:hover {
  background: #4a6fa5;
}

.admin-controls button.active {
  background: #28a745;
}

.admin-controls button.disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.danger-button {
  background: #dc3545 !important;
}

.danger-button:hover {
  background: #c82333 !important;
}

.stream-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.info-card {
  background: #2c3e5a;
  padding: 20px;
  border-radius: 8px;
}

.info-card h4 {
  margin: 0 0 15px 0;
  color: #ffffff;
  border-bottom: 1px solid #3b4a6b;
  padding-bottom: 10px;
}

.info-card p {
  margin: 8px 0;
  color: #d1d9e6;
}

/* ⭐ NEW: Chat card specific styling */
.chat-card {
  display: flex;
  flex-direction: column;
  height: 300px; /* Fixed height for chat */
}

.chat-card h4 {
  margin: 0 0 15px 0;
  color: #ffffff;
  border-bottom: 1px solid #3b4a6b;
  padding-bottom: 10px;
  flex-shrink: 0;
}

/* Chat messages container */
.chat-messages-admin {
  flex: 1;
  overflow-y: auto;
  background: #1e2a44;
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0; /* Allow flexbox to shrink */
}

/* Individual chat message */
.chat-message-admin {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border-left: 3px solid #4a6fa5;
  transition: background-color 0.2s ease;
}

.chat-message-admin:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Message header with name and time */
.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.message-sender {
  font-size: 13px;
  color: #4a6fa5;
  font-weight: 600;
  flex: 1;
  min-width: 0; /* Allows text truncation if needed */
}

.message-time {
  font-size: 11px;
  color: #8a9ba8;
  font-weight: normal;
  flex-shrink: 0; /* Prevent time from being compressed */
  margin-left: 8px;
}

/* Message text */
.message-text {
  font-size: 14px;
  color: #d1d9e6;
  line-height: 1.4;
  word-wrap: break-word;
  margin: 0;
}

.no-messages {
  color: #8a9ba8;
  font-style: italic;
  text-align: center;
  padding: 20px;
  font-size: 14px;
}

/* Custom scrollbar for chat */
.chat-messages-admin::-webkit-scrollbar {
  width: 6px;
}

.chat-messages-admin::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.chat-messages-admin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.chat-messages-admin::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.no-viewers {
  color: #8a9ba8;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.viewer-item {
  background: #1e2a44;
  padding: 8px 12px;
  border-radius: 4px;
  margin: 5px 0;
  color: #d1d9e6;
}

/* Mobile responsiveness for chat */
@media (max-width: 768px) {
  .stream-info {
    grid-template-columns: 1fr;
  }
  
  .admin-controls {
    flex-direction: column;
  }
  
  .admin-controls button {
    width: 100%;
  }

  .chat-card {
    height: 250px; /* Smaller height on mobile */
  }
  
  .chat-message-admin {
    padding: 6px 8px;
  }
  
  .message-text {
    font-size: 13px;
  }

  .message-sender {
    font-size: 12px;
  }

  .message-time {
    font-size: 10px;
  }
}
</style>