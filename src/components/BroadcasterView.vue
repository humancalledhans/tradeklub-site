<template>
  <div class="broadcast-wrapper">
    <div v-if="!hasJoined" class="join-section">
      <input v-model="userName" placeholder="Enter your name..." @keyup.enter="joinRoom" class="name-input" />
      <button @click="joinRoom" :disabled="!userName.trim()">Join Room</button>
    </div>
    <div v-if="hasJoined" class="video-section">

      <button @click="debugVideoElements" style="position: absolute; top: 10px; right: 10px; z-index: 1000;">
        Debug Videos
      </button>
      
      <video ref="broadcasterVideo" autoplay playsinline muted class="broadcaster-video"></video>
      <video
        v-if="screenSharePresent"
        ref="screenShareVideo"
        autoplay
        playsinline
        muted
        class="screen-share-video"
      ></video>
      <div v-if="!broadcasterPresent && !screenSharePresent" class="no-stream-message">
        No broadcaster stream available yet.
      </div>
    </div>
  </div>
</template>

<script>
import { hmsActions, hmsStore } from '../hms.js';
import {
  selectPeers,
  selectPeersScreenSharing,
  selectScreenShareByPeerID,
} from '@100mslive/hms-video-store';

export default {
  name: 'ViewerView',
  data() {
    return {
      userId: null,
      userName: localStorage.getItem('userName') || '',
      hasJoined: false,
      broadcasterPresent: false,
      screenSharePresent: false,
      unsubscribeFunctions: [],
    };
  },
  watch: {
    screenSharePresent(newVal, oldVal) {
      console.log('screenSharePresent changed:', oldVal, '->', newVal);
      if (newVal) {
        // Debug when screen share becomes present
        setTimeout(() => {
          this.debugVideoElements();
        }, 2000);
      }
    }
  },
  async mounted() {
    this.userId = localStorage.getItem('user_id') || (window.crypto?.randomUUID?.() || 'viewer-' + Math.random().toString(36).substr(2, 9));
    localStorage.setItem('user_id', this.userId);
    if (this.userName.trim()) await this.joinRoom();
  },
  beforeUnmount() {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    if (this.hasJoined) hmsActions.leave();
  },
  methods: {
    debugVideoElements() {
      console.log('=== VIDEO DEBUGGING ===');
      const videos = document.querySelectorAll('video');
      console.log('Total video elements found:', videos.length);

      videos.forEach((video, index) => {
        console.log(`Video ${index}:`, {
          src: video.src,
          srcObject: video.srcObject,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
          paused: video.paused,
          muted: video.muted,
          style: video.style.cssText,
          classList: Array.from(video.classList),
          tracks: video.srcObject ? video.srcObject.getTracks().map(track => ({
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
          })) : 'No srcObject'
        });
      });

      // Also check your specific video refs
      console.log('Broadcaster video ref:', this.$refs.broadcasterVideo);
      console.log('Screen share video ref:', this.$refs.screenShareVideo);
      console.log('Screen share present flag:', this.screenSharePresent);
    },
    async fetchAuthToken(userId) {
      try {
        const BACKEND_URL = process.env.VUE_APP_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(BACKEND_URL + '/generate-100ms-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, role: 'viewer-realtime' }),
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
        console.error('User name is required to join the room');
        return;
      }
      const authData = await this.fetchAuthToken(this.userId);
      if (!authData) {
        console.error('Failed to fetch auth token, cannot join room');
        return;
      }
      const config = {
        userName: this.userName,
        authToken: authData.token,
        settings: { isAudioMuted: true, isVideoMuted: true },
        role: 'viewer-realtime',
      };
      try {
        console.log('Joining room with config:', config);
        await hmsActions.join(config);
        this.hasJoined = true;
        localStorage.setItem('userName', this.userName);
        console.log('Joined room successfully');

        const peerHandler = (peers) => {
          const broadcaster = Object.values(peers || {}).find(peer =>
            peer.roleName === 'broadcaster' || peer.roleName === 'host' || peer.name === 'hans broadcaster'
          );
          this.handleBroadcaster(broadcaster);
        };
        this.unsubscribeFunctions.push(hmsStore.subscribe(peerHandler, selectPeers));

        const screenShareHandler = (screensharingPeers) => {
          const presenter = screensharingPeers.find(peer =>
            peer.roleName === 'broadcaster' || peer.roleName === 'host' || peer.name === 'hans broadcaster'
          );
          this.handleScreenShare(presenter);
        };
        this.unsubscribeFunctions.push(hmsStore.subscribe(screenShareHandler, selectPeersScreenSharing));

        const initialState = hmsStore.getState();
        peerHandler(initialState.peers);
        screenShareHandler(initialState.peers ? selectPeersScreenSharing(initialState) : []);
      } catch (error) {
        console.error('Error joining room:', error);
      }
    },
    handleBroadcaster(broadcaster) {
      if (!broadcaster || !broadcaster.videoTrack) {
        console.log('No broadcaster or video track available');
        this.broadcasterPresent = false;
        if (this.$refs.broadcasterVideo) hmsActions.detachVideo(broadcaster?.videoTrack, this.$refs.broadcasterVideo);
        return;
      }
      this.$nextTick(() => {
        const videoEl = this.$refs.broadcasterVideo;
        if (videoEl) {
          try {
            hmsActions.attachVideo(broadcaster.videoTrack, videoEl);
            this.broadcasterPresent = true;
          } catch (error) {
            console.error('Error attaching broadcaster video:', error);
            this.broadcasterPresent = false;
          }
        }
      });
    },
    handleScreenShare(presenter) {
      console.log('=== HANDLE SCREEN SHARE DEBUG ===');
      console.log('Presenter:', presenter);
      
      if (!presenter) {
        console.log('No presenter found for screen share');
        this.screenSharePresent = false;
        if (this.$refs.screenShareVideo) hmsActions.detachVideo(null, this.$refs.screenShareVideo);
        return;
      }

      let screenTrack = hmsStore.getState(selectScreenShareByPeerID(presenter.id));
      console.log('Screen track from selector:', screenTrack);
      
      if (!screenTrack && presenter.auxiliaryTracks?.length) {
        const auxiliaryTrackId = presenter.auxiliaryTracks[0];
        const allTracks = hmsStore.getState().tracks || {};
        screenTrack = Object.values(allTracks).find(t => t.id === auxiliaryTrackId);
        console.log('Screen track from auxiliary tracks:', screenTrack);
      }

      if (!screenTrack) {
        console.log('No screen track found');
        this.screenSharePresent = false;
        if (this.$refs.screenShareVideo) hmsActions.detachVideo(null, this.$refs.screenShareVideo);
        return;
      }

      console.log('Screen track details:', {
        id: screenTrack.id,
        kind: screenTrack.kind,
        enabled: screenTrack.enabled,
        readyState: screenTrack.readyState,
        source: screenTrack.source,
        type: screenTrack.type
      });

      this.screenSharePresent = true;
      this.$nextTick(() => {
        const videoEl = this.$refs.screenShareVideo;
        console.log('Video element for screen share:', videoEl);
        
        if (videoEl) {
          try {
            hmsActions.attachVideo(screenTrack, videoEl);
            console.log('Screen share attached, srcObject:', videoEl.srcObject);
            
            // Additional debugging after attachment
            setTimeout(() => {
              console.log('Video element state after attachment:', {
                srcObject: videoEl.srcObject,
                videoWidth: videoEl.videoWidth,
                videoHeight: videoEl.videoHeight,
                readyState: videoEl.readyState,
                paused: videoEl.paused,
                currentTime: videoEl.currentTime
              });
              
              // Try to debug the video element specifically
              this.debugVideoElements();
            }, 1000);
            
            videoEl.play().catch(error => console.error('Play error:', error));
            console.log('Screen share attached successfully');
          } catch (error) {
            console.error('Error attaching screen share:', error);
            this.screenSharePresent = false;
          }
        } else {
          console.error('Screen share video element still not found after $nextTick');
        }
      });
    },
  },
};
</script>
  
  <style scoped>
  .broadcast-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #1e2a44;
  }
  
  .join-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #1e2a44;
    color: #ffffff;
    width: 100%;
    height: 100%;
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
  
  .video-section {
    position: relative;
    flex: 1;
    background: #000;
    overflow: hidden;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .broadcaster-video {
    flex: 1;
    width: 100%;
    height: 50%;
    object-fit: cover;
    /* border: 1px solid red; */
  }
  
  .screen-share-video {
    flex: 1;
    width: 100%;
    height: 50%;
    object-fit: contain;
    /* border: 1px solid blue; */
  }
  
  .no-stream-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #d1d9e6;
    font-size: 18px;
    text-align: center;
  }
  </style>