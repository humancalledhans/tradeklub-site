<template>
  <div class="viewer-wrapper">
    <!-- Authentication Check -->
    <div v-if="!isUserLoggedIn" class="auth-section">
      <div class="auth-content">
        <h3>Authentication Required</h3>
        <p>Please log in to access the live streaming session</p>
        <button @click="triggerParentLogin" class="login-button">
          Login
        </button>
      </div>
    </div>

    <!-- Original Join Section (only show if user is logged in) -->
    <div v-else-if="!joined" class="join-section">
      <input 
        v-model="viewerName" 
        placeholder="Enter your name..." 
        @keyup.enter="joinAsViewer"
        class="viewer-input" 
      />
      <button @click="joinAsViewer" :disabled="!viewerName.trim()">
        Join Session
      </button>
      
      <div class="join-info">
        <p>🔇 Your camera and microphone will stay off</p>
      </div>
    </div>

    <!-- Viewer Section (only show if user is logged in and joined) -->
    <div v-if="isUserLoggedIn && joined" class="viewer-section">
      <!-- Stream Display -->
      <div class="stream-container">
        <div v-if="!hostStreaming" class="waiting-message">
          <div class="waiting-content">
            <div class="spinner"></div>
            <h3>Waiting for instructor...</h3>
            <p>The live session will begin shortly</p>
          </div>
        </div>
        
        <video 
          v-show="hostStreaming"
          ref="hostVideo" 
          autoplay 
          playsinline 
          class="host-video"
        ></video>
        
        <!-- Stream Info Overlay -->
        <div v-if="hostStreaming" class="stream-overlay">
          <div class="stream-info">
            <span v-if="hostScreenSharing" class="stream-type">🖥️ Screen Share</span>
            <span v-else class="stream-type">📹 Camera</span>
            
            <div class="instructor-info">
              👨‍🏫 {{ hostName || 'Instructor' }}
            </div>
          </div>
          
          <div class="viewer-controls">
            <button @click="toggleAudio" :class="{ muted: audioMuted }">
              {{ audioMuted ? '🔇 Unmute' : '🔊 Mute' }}
            </button>
            
            <button @click="toggleFullscreen" class="fullscreen-btn">
              {{ isFullscreen ? '🔲 Exit Fullscreen' : '⛶ Fullscreen' }}
            </button>
            
            <button @click="leaveSession" class="leave-button">
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AgoraRTC from "agora-rtc-sdk-ng";

export default {
  name: 'AgoraViewerView',
  data() {
    return {
      // Agora client
      client: null,
      
      // Connection state
      joined: false,
      viewerName: localStorage.getItem('viewer_name') || '',
      channelName: 'trading-room', // Fixed to match admin
      
      // Host state
      hostStreaming: false,
      hostScreenSharing: false,
      hostName: '',
      hostUser: null,
      
      // Viewer controls
      audioMuted: false,
      isFullscreen: false,
      
      // Session info
      sessionStartTime: null,
      sessionDuration: '00:00:00',
      
      // Agora credentials
      appId: process.env.VUE_APP_AGORA_APP_ID,
      token: null,

      // Authentication state
      isUserLoggedIn: false
    };
  },
  
  async mounted() {
    // Check authentication status
    this.checkAuthStatus();
    
    // Initialize Agora client only if user is logged in
    if (this.isUserLoggedIn) {
      try {
        this.client = AgoraRTC.createClient({ 
          mode: "rtc", 
          codec: "vp8" 
        });
        this.setupEventListeners();
      } catch (error) {
        console.error('Failed to initialize Agora client:', error);
      }
    }
    
    // Setup fullscreen detection
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);

    // Listen for storage changes to update auth status
    window.addEventListener('storage', this.handleStorageChange);
  },
  
  beforeUnmount() {
    if (this.joined) {
      this.leaveSession();
    }
    this.stopSessionTimer();
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    window.removeEventListener('storage', this.handleStorageChange);
  },
  
  methods: {
    checkAuthStatus() {
      const user = sessionStorage.getItem('user');
      this.isUserLoggedIn = !!user;
      
      // If user just logged in and we haven't initialized Agora yet, do it now
      if (this.isUserLoggedIn && !this.client) {
        this.initializeAgoraClient();
      }
    },

    async initializeAgoraClient() {
      try {
        this.client = AgoraRTC.createClient({ 
          mode: "rtc", 
          codec: "vp8" 
        });
        this.setupEventListeners();
      } catch (error) {
        console.error('Failed to initialize Agora client:', error);
      }
    },

    handleStorageChange() {
      // React to sessionStorage changes (e.g., when user logs in/out)
      this.checkAuthStatus();
    },

    triggerParentLogin() {
      // Emit an event to the parent component to trigger login
      this.$emit('request-login');
    },

    setupEventListeners() {
      // When host joins
      this.client.on("user-joined", (user) => {
        console.log("User joined:", user.uid);
        this.hostUser = user;
        this.hostName = user.uid;
      });
      
      // When host leaves
      this.client.on("user-left", (user) => {
        console.log("User left:", user.uid);
        this.hostStreaming = false;
        this.hostScreenSharing = false;
        this.hostUser = null;
      });
      
      // When host starts streaming
      this.client.on("user-published", async (user, mediaType) => {
        console.log("Host published:", user.uid, mediaType);
        
        try {
          // ⭐ FIX: Get the remote user from client's remote users list
          const remoteUser = this.client.remoteUsers.find(u => u.uid === user.uid);
          
          if (!remoteUser) {
            console.error("Remote user not found in client.remoteUsers");
            return;
          }
          
          // Subscribe to the host's stream using the remote user object
          await this.client.subscribe(remoteUser, mediaType);
          console.log(`Successfully subscribed to ${mediaType} from ${user.uid}`);
          
          if (mediaType === "video") {
            // Play the host's video
            const videoTrack = remoteUser.videoTrack;
            if (videoTrack && this.$refs.hostVideo) {
              videoTrack.play(this.$refs.hostVideo);
              
              this.hostStreaming = true;
              this.hostUser = remoteUser; // Use the remote user object
              this.hostName = remoteUser.uid;
              
              // Detect if it's screen sharing (heuristic)
              this.detectScreenShare();
              
              // Start session timer if not already started
              if (!this.sessionStartTime) {
                this.sessionStartTime = Date.now();
                this.startSessionTimer();
              }
            }
          }
          
          if (mediaType === "audio") {
            // Audio will play automatically
            const audioTrack = remoteUser.audioTrack;
            if (audioTrack) {
              audioTrack.play();
            }
          }
          
        } catch (error) {
          console.error('Failed to subscribe to host:', error);
        }
      });
      
      // When host stops streaming
      this.client.on("user-unpublished", (user, mediaType) => {
        console.log("Host unpublished:", user.uid, mediaType);
        
        if (mediaType === "video") {
          this.hostStreaming = false;
          this.hostScreenSharing = false;
        }
      });
      
      // Network quality monitoring
      this.client.on("network-quality", (stats) => {
        // Could show network quality indicator here
        console.log("Network quality:", stats);
      });
      
      // ⭐ ADD: Additional error handling
      this.client.on("exception", (event) => {
        console.error("Agora exception:", event);
      });
    },
    
    async joinAsViewer() {
      if (!this.isUserLoggedIn) {
        alert('Please log in first');
        return;
      }

      if (!this.viewerName.trim()) {
        alert('Please enter your name');
        return;
      }
      
      try {
        console.log('Getting viewer token...');
        
        // Get token from backend
        const tokenResponse = await fetch(`${process.env.VUE_APP_BACKEND_URL || 'http://localhost:8000'}/generate-agora-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel_name: this.channelName,
            uid: this.viewerName,
            role: 'audience'
          })
        });
        
        if (!tokenResponse.ok) {
          throw new Error(`Failed to get token: ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        console.log('Viewer token received', tokenData);
        
        // Use the UID returned from the backend
        const uidToUse = parseInt(tokenData.uid);
        
        console.log(`Joining channel: ${this.channelName} with UID: ${uidToUse}`);
        
        await this.client.join(
          tokenData.app_id, 
          this.channelName, 
          tokenData.token,
          uidToUse
        );
        
        console.log(`Successfully joined as viewer with UID: ${uidToUse}`);
        console.log('Remote users currently in channel:', this.client.remoteUsers.map(u => u.uid));
        
        this.joined = true;
        
        // Store viewer name
        localStorage.setItem('viewer_name', this.viewerName);
        
        // ⭐ ADD: Check if host is already streaming
        setTimeout(() => {
          console.log('Checking for existing remote users after join...');
          console.log('Remote users:', this.client.remoteUsers);
          
          // Try to subscribe to any existing streams
          this.client.remoteUsers.forEach(async (user) => {
            console.log(`Found existing user: ${user.uid}`);
            
            if (user.hasVideo && user.videoTrack) {
              console.log(`Subscribing to existing video from ${user.uid}`);
              try {
                await this.client.subscribe(user, 'video');
                user.videoTrack.play(this.$refs.hostVideo);
                this.hostStreaming = true;
                this.hostUser = user;
                this.hostName = user.uid;
              } catch (error) {
                console.error('Failed to subscribe to existing video:', error);
              }
            }
            
            if (user.hasAudio && user.audioTrack) {
              console.log(`Subscribing to existing audio from ${user.uid}`);
              try {
                await this.client.subscribe(user, 'audio');
                user.audioTrack.play();
              } catch (error) {
                console.error('Failed to subscribe to existing audio:', error);
              }
            }
          });
        }, 1000); // Give a second for the channel state to settle
        
      } catch (error) {
        console.error('Failed to join session:', error);
        alert('Failed to join session: ' + error.message);
      }
    },
    
    async leaveSession() {
      try {
        // Leave the channel
        await this.client.leave();
        
        // Reset state
        this.joined = false;
        this.hostStreaming = false;
        this.hostScreenSharing = false;
        this.hostUser = null;
        this.stopSessionTimer();
        
        console.log('Left session');
        
      } catch (error) {
        console.error('Failed to leave session:', error);
      }
    },
    
    toggleAudio() {
      // Find the host user in remote users
      const hostUser = this.client.remoteUsers.find(user => user.audioTrack);
      
      if (hostUser && hostUser.audioTrack) {
        if (this.audioMuted) {
          hostUser.audioTrack.play();
          this.audioMuted = false;
          console.log("Audio unmuted");
        } else {
          hostUser.audioTrack.stop();
          this.audioMuted = true;
          console.log("Audio muted");
        }
      } else {
        console.log("No audio track available from host");
      }
    },
    
    toggleFullscreen() {
      const videoContainer = this.$refs.hostVideo?.parentElement;
      
      if (!this.isFullscreen) {
        if (videoContainer?.requestFullscreen) {
          videoContainer.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    },
    
    handleFullscreenChange() {
      this.isFullscreen = !!document.fullscreenElement;
    },
    
    detectScreenShare() {
      // This is a heuristic - screen shares often have different characteristics
      // You could also use track metadata if available
      setTimeout(() => {
        const video = this.$refs.hostVideo;
        if (video) {
          // Screen shares typically have desktop-like aspect ratios
          const aspectRatio = video.videoWidth / video.videoHeight;
          
          // Desktop screens are usually wider (16:9, 16:10, etc.)
          // Webcams are usually more square-ish (4:3, 16:9 but smaller)
          if (aspectRatio > 1.5 && video.videoWidth > 1280) {
            this.hostScreenSharing = true;
          } else {
            this.hostScreenSharing = false;
          }
          
          console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight, 'Aspect ratio:', aspectRatio);
        }
      }, 1000);
    },
    
    startSessionTimer() {
      this.sessionTimer = setInterval(() => {
        if (this.sessionStartTime) {
          const elapsed = Date.now() - this.sessionStartTime;
          const hours = Math.floor(elapsed / 3600000);
          const minutes = Math.floor((elapsed % 3600000) / 60000);
          const seconds = Math.floor((elapsed % 60000) / 1000);
          
          this.sessionDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    },
    
    stopSessionTimer() {
      if (this.sessionTimer) {
        clearInterval(this.sessionTimer);
        this.sessionTimer = null;
      }
    }
  }
};
</script>

<style scoped>
.viewer-wrapper {
  width: 100%;
  height: 100%;
  background: #1e2a44;
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.auth-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  flex: 1;
  overflow: hidden;
}

.auth-content {
  text-align: center;
  background: #2c3e5a;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
}

.auth-content h3 {
  margin-bottom: 16px;
  color: #d1d9e6;
  font-size: 24px;
}

.auth-content p {
  margin-bottom: 24px;
  color: #a1b1c6;
  font-size: 16px;
}

.login-button {
  padding: 12px 24px;
  background: #4a6fa5;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
  min-width: 120px;
}

.login-button:hover {
  background: #5a7fb5;
}

.join-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
  padding: 40px;
}

.viewer-input {
  padding: 12px;
  font-size: 16px;
  width: 300px;
  border: 1px solid #3b4a6b;
  border-radius: 4px;
  background: #2c3e5a;
  color: white;
}

.join-section button {
  padding: 12px 24px;
  background: #4a6fa5;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.join-section button:hover {
  background: #5a7fb5;
}

.join-section button:disabled {
  background: #3b4a6b;
  cursor: not-allowed;
}

.join-info {
  text-align: center;
  color: #d1d9e6;
  font-size: 14px;
}

.viewer-section {
  width: 100%;
  height: 100%;
  display: flex;
}

.stream-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

.waiting-message {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e2a44 0%, #2c3e5a 100%);
}

.waiting-content {
  text-align: center;
  color: #d1d9e6;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #3b4a6b;
  border-top: 4px solid #4a6fa5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.host-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.stream-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  box-sizing: border-box;
  z-index: 10;
}

.stream-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.stream-type {
  background: rgba(40, 167, 69, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.instructor-info {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.viewer-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
}

.viewer-controls button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: rgba(59, 74, 107, 0.9);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.viewer-controls button:hover {
  background: rgba(74, 111, 165, 0.95);
  transform: translateY(-1px);
}

.viewer-controls button.muted {
  background: rgba(220, 53, 69, 0.9);
}

.viewer-controls button.muted:hover {
  background: rgba(220, 53, 69, 0.95);
}

.leave-button {
  background: rgba(220, 53, 69, 0.9) !important;
}

.leave-button:hover {
  background: rgba(220, 53, 69, 0.95) !important;
}

@media (max-width: 768px) {
  .auth-section {
    padding: 20px;
  }
  
  .stream-overlay {
    padding: 15px;
  }
  
  .stream-info {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .stream-type,
  .instructor-info {
    font-size: 12px;
    padding: 6px 10px;
  }
  
  .viewer-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .viewer-controls button {
    font-size: 12px;
    padding: 8px 12px;
  }
}
</style>