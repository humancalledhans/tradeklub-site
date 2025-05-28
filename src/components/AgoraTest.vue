<template>
  <div class="agora-broadcast-wrapper">
    <!-- Join Form -->
    <div v-if="!joined" class="join-section">
      <h3>Join Live Stream</h3>
      <input 
        v-model="username" 
        placeholder="Enter your name..." 
        @keyup.enter="joinChannel"
        class="name-input" 
      />
      <input 
        v-model="channelName" 
        placeholder="Channel name (e.g., trading-room)" 
        class="name-input" 
      />
      <button @click="joinChannel" :disabled="!username.trim() || !channelName.trim()">
        Join Channel
      </button>
    </div>

    <!-- Video Section -->
    <div v-if="joined" class="video-section">
      <!-- Local Video -->
      <div class="local-video-container">
        <video 
          ref="localVideo" 
          autoplay 
          playsinline 
          muted 
          class="local-video"
        ></video>
        <div class="video-controls">
          <button @click="toggleCamera" :class="{ active: cameraOn }">
            {{ cameraOn ? '📷 Camera On' : '📷 Camera Off' }}
          </button>
          <button @click="toggleMicrophone" :class="{ active: micOn }">
            {{ micOn ? '🎤 Mic On' : '🎤 Mic Off' }}
          </button>
          <button @click="toggleScreenShare" :class="{ active: isScreenSharing }">
            {{ isScreenSharing ? '🖥️ Stop Screen Share' : '🖥️ Share Screen' }}
          </button>
        </div>
      </div>

      <!-- Remote Video -->
      <div class="remote-video-container">
        <div v-if="remoteUsers.length === 0" class="no-remote-user">
          Waiting for other participants...
        </div>
        <div v-for="user in remoteUsers" :key="user.uid" class="remote-user">
          <video 
            :ref="`remoteVideo_${user.uid}`"
            autoplay 
            playsinline 
            class="remote-video"
          ></video>
          <div class="user-info">
            User: {{ user.uid }}
            <span v-if="user.hasScreen">📺 Sharing Screen</span>
          </div>
        </div>
      </div>

      <button @click="leaveChannel" class="leave-button">
        Leave Channel
      </button>

      <!-- Debug Info -->
      <div class="debug-info">
        <p>Status: {{ joined ? 'Connected' : 'Disconnected' }}</p>
        <p>Users: {{ remoteUsers.length }}</p>
        <p>Screen Sharing: {{ isScreenSharing ? 'Yes' : 'No' }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import AgoraRTC from "agora-rtc-sdk-ng";

export default {
  name: 'AgoraBroadcastView',
  data() {
    return {
      // Agora client
      client: null,
      
      // Connection state
      joined: false,
      username: localStorage.getItem('agora_username') || '',
      channelName: 'trading-room',
      
      // Local tracks
      localVideoTrack: null,
      localAudioTrack: null,
      localScreenTrack: null,
      
      // Local state
      cameraOn: false,
      micOn: false,
      isScreenSharing: false,
      
      // Remote users
      remoteUsers: [],
      
      appId: process.env.VUE_APP_AGORA_APP_ID, // Replace with your actual App ID
      token: process.env.VUE_APP_AGORA_TEMP_TOKEN // For testing, we'll use null (temp token)
    };
  },
  
  async mounted() {
    console.log("process.env.VUE_APP_AGORA_TEMP_TOKEN ", process.env.VUE_APP_AGORA_TEMP_TOKEN );
    // Initialize Agora client
    this.client = AgoraRTC.createClient({ 
      mode: "live", 
      codec: "vp8" 
    });
    
    // Set client role to broadcaster (so both can screen share)
    await this.client.setClientRole("host");
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('Agora client initialized');
  },
  
  beforeUnmount() {
    if (this.joined) {
      this.leaveChannel();
    }
  },
  
  methods: {
    setupEventListeners() {
      // When a remote user joins
      this.client.on("user-joined", (user) => {
        console.log("Remote user joined:", user.uid);
        this.addRemoteUser(user);
      });
      
      // When a remote user leaves
      this.client.on("user-left", (user) => {
        console.log("Remote user left:", user.uid);
        this.removeRemoteUser(user.uid);
      });
      
      // When remote user publishes video/screen
      this.client.on("user-published", async (user, mediaType) => {
        console.log("Remote user published:", user.uid, mediaType);
        
        // Subscribe to the remote user
        await this.client.subscribe(user, mediaType);
        
        if (mediaType === "video") {
          // Get the video track and play it
          const videoTrack = user.videoTrack;
          const remoteVideoContainer = this.$refs[`remoteVideo_${user.uid}`];
          
          if (remoteVideoContainer && Array.isArray(remoteVideoContainer)) {
            videoTrack.play(remoteVideoContainer[0]);
          } else if (remoteVideoContainer) {
            videoTrack.play(remoteVideoContainer);
          }
          
          // Check if this is screen sharing
          this.updateRemoteUserScreenStatus(user.uid, true);
        }
        
        if (mediaType === "audio") {
          // Audio will play automatically
          user.audioTrack.play();
        }
      });
      
      // When remote user unpublishes
      this.client.on("user-unpublished", (user, mediaType) => {
        console.log("Remote user unpublished:", user.uid, mediaType);
        
        if (mediaType === "video") {
          this.updateRemoteUserScreenStatus(user.uid, false);
        }
      });
    },
    
    async joinChannel() {
      if (!this.username.trim() || !this.channelName.trim()) {
        alert('Please enter username and channel name');
        return;
      }
      
      try {
        console.log('Joining Agora channel...');
        
        // Join the channel
        await this.client.join(
          this.appId, 
          this.channelName, 
          this.token, 
          this.username
        );
        
        console.log('Successfully joined channel');
        this.joined = true;
        
        // Store username
        localStorage.setItem('agora_username', this.username);

        console.log("Agora channel joined:", this.channelName);
        
        // Start with camera off but mic on
        await this.toggleMicrophone();

        console.log("Local microphone track created and published");
        
      } catch (error) {
        console.error('Failed to join channel:', error);
        alert('Failed to join channel: ' + error.message);
      }
    },
    
    async leaveChannel() {
      try {
        // Stop all local tracks
        if (this.localVideoTrack) {
          this.localVideoTrack.stop();
          this.localVideoTrack.close();
        }
        if (this.localAudioTrack) {
          this.localAudioTrack.stop();
          this.localAudioTrack.close();
        }
        if (this.localScreenTrack) {
          this.localScreenTrack.stop();
          this.localScreenTrack.close();
        }
        
        // Leave the channel
        await this.client.leave();
        
        // Reset state
        this.joined = false;
        this.cameraOn = false;
        this.micOn = false;
        this.isScreenSharing = false;
        this.remoteUsers = [];
        
        console.log('Left channel successfully');
      } catch (error) {
        console.error('Failed to leave channel:', error);
      }
    },
    
    async toggleCamera() {
      try {
        if (!this.cameraOn) {
          // Turn camera on
          this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
          this.localVideoTrack.play(this.$refs.localVideo);
          
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
          this.localScreenTrack.play(this.$refs.localVideo);
          
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
        alert('Screen share failed: ' + error.message);
      }
    },
    
    addRemoteUser(user) {
      const existingUser = this.remoteUsers.find(u => u.uid === user.uid);
      if (!existingUser) {
        this.remoteUsers.push({
          uid: user.uid,
          hasScreen: false
        });
      }
    },
    
    removeRemoteUser(uid) {
      this.remoteUsers = this.remoteUsers.filter(user => user.uid !== uid);
    },
    
    updateRemoteUserScreenStatus(uid, hasScreen) {
      const user = this.remoteUsers.find(u => u.uid === uid);
      if (user) {
        user.hasScreen = hasScreen;
      }
    }
  }
};
</script>

<style scoped>
.agora-broadcast-wrapper {
  width: 100%;
  height: 100%;
  background: #1e2a44;
  color: white;
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

.name-input {
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
}

.join-section button:hover {
  background: #5a7fb5;
}

.join-section button:disabled {
  background: #3b4a6b;
  cursor: not-allowed;
}

.video-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
}

.local-video-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.local-video {
  width: 100%;
  height: 300px;
  background: #000;
  border-radius: 8px;
  object-fit: contain;
}

.video-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.video-controls button {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  background: #3b4a6b;
  color: white;
  cursor: pointer;
  transition: background 0.3s;
}

.video-controls button:hover {
  background: #4a6fa5;
}

.video-controls button.active {
  background: #28a745;
}

.remote-video-container {
  flex: 1;
  background: #2c3e5a;
  border-radius: 8px;
  padding: 15px;
  min-height: 200px;
}

.no-remote-user {
  text-align: center;
  padding: 50px;
  color: #8a9ba8;
  font-style: italic;
}

.remote-user {
  margin-bottom: 15px;
}

.remote-video {
  width: 100%;
  height: 200px;
  background: #000;
  border-radius: 4px;
  object-fit: contain;
}

.user-info {
  padding: 8px;
  background: #1e2a44;
  border-radius: 0 0 4px 4px;
  font-size: 14px;
}

.leave-button {
  padding: 12px 24px;
  background: #dc3545;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  align-self: center;
}

.leave-button:hover {
  background: #c82333;
}

.debug-info {
  background: #2c3e5a;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 10px;
}

.debug-info p {
  margin: 2px 0;
}
</style>