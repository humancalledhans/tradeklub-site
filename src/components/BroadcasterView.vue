<template>
    <div class="broadcast-wrapper">
      <div v-if="!hasJoined" class="join-section">
        <input v-model="userName" placeholder="Enter your name..." @keyup.enter="joinRoom" class="name-input" />
        <button @click="joinRoom" :disabled="!userName.trim()">Join Room</button>
      </div>
      <div v-if="hasJoined" class="video-section">
        <video ref="broadcasterVideo" autoplay playsinline muted class="broadcaster-video"></video>
        <video ref="screenShareVideo" autoplay playsinline muted class="screen-share-video" v-if="screenSharePresent"></video>
        <div v-if="!broadcasterPresent && !screenSharePresent" class="no-stream-message">
          No broadcaster stream available yet.
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { hmsActions, hmsStore } from '../hms.js';
  import { 
    selectIsSomeoneScreenSharing, 
    selectPeerScreenSharing, 
    selectScreenShareByPeerID 
  } from '@100mslive/hms-video-store';
  
  export default {
    name: "BroadcasterView",
    data() {
      return {
        userId: null,
        userName: localStorage.getItem('userName') || '',
        hasJoined: false,
        broadcasterPresent: false,
        screenSharePresent: false,
      };
    },
    async mounted() {
      this.userId = localStorage.getItem('user_id') || (window.crypto?.randomUUID?.() || "viewer-" + Math.random().toString(36).substr(2, 9));
      localStorage.setItem('user_id', this.userId);
      if (this.userName.trim()) await this.joinRoom();
    },
    beforeUnmount() {
      if (this.hasJoined) hmsActions.leave();
    },
    methods: {
      async fetchAuthToken(userId) {
        try {
          const BACKEND_URL = process.env.VUE_APP_BACKEND_URL || "http://localhost:8000";
          const response = await fetch(BACKEND_URL + '/generate-100ms-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
          settings: { isAudioMuted: true, isVideoMuted: false },
          role: "viewer-realtime",
        };
        try {
          await hmsActions.join(config);
          this.hasJoined = true;
          localStorage.setItem('userName', this.userName);
          hmsStore.subscribe(this.handlePeers, (state) => state);
          this.handlePeers(hmsStore.getState());
        } catch (error) {
          console.error("Error joining room:", error);
        }
      },
      handlePeers(state) {
        const peers = state.peers || {};
        console.log('Peers:', JSON.stringify(peers, null, 2));
        if (!peers || Object.keys(peers).length === 0) {
          this.broadcasterPresent = false;
          this.screenSharePresent = false;
          return;
        }
  
        const broadcaster = Object.values(peers).find(peer => 
          peer.roleName === 'broadcaster' || peer.roleName === 'host' || peer.name === 'hans broadcaster'
        );
        console.log('Broadcaster:', JSON.stringify(broadcaster, null, 2));
  
        if (!broadcaster) {
          this.broadcasterPresent = false;
          this.screenSharePresent = false;
          return;
        }
  
        // Camera track (keep working logic)
        const allTracks = [
          ...(broadcaster.videoTrack ? [broadcaster.videoTrack] : []),
          ...(broadcaster.audioTrack ? [broadcaster.audioTrack] : []),
          ...(broadcaster.tracks ? Object.values(broadcaster.tracks) : []),
          ...(state.tracks ? Object.values(state.tracks).filter(t => t.peerId === broadcaster.id) : [])
        ];
        const videoTracks = allTracks.filter(t => t.kind === 'video' && t.enabled);
        const cameraTrack = videoTracks.find(t => t.source !== 'screen') || broadcaster.videoTrack;
        console.log('Camera track:', JSON.stringify(cameraTrack, null, 2));
  
        // Screen share using 100ms selectors
        const isScreenSharing = hmsStore.getState(selectIsSomeoneScreenSharing);
        console.log('Is someone screen sharing?', isScreenSharing);
        const presenter = hmsStore.getState(selectPeerScreenSharing);
        console.log('Presenter:', JSON.stringify(presenter, null, 2));
        let screenTrack = null;
        if (isScreenSharing && presenter) {
          screenTrack = hmsStore.getState(selectScreenShareByPeerID(presenter.id));
          console.log('Screen track:', JSON.stringify(screenTrack, null, 2));
          this.screenSharePresent = true;
        } else {
          console.log('No screen share active');
        }
  
        this.$nextTick(() => {
          // Attach camera track
          if (cameraTrack && this.$refs.broadcasterVideo) {
            try {
              hmsActions.attachVideo(cameraTrack, this.$refs.broadcasterVideo);
              console.log('Camera srcObject:', this.$refs.broadcasterVideo.srcObject);
              console.log('Camera tracks:', this.$refs.broadcasterVideo.srcObject?.getTracks());
              this.$refs.broadcasterVideo.play().catch(e => console.error('Camera play error:', e));
              this.broadcasterPresent = true;
            } catch (error) {
              console.error('Error attaching camera track:', error);
              this.broadcasterPresent = false;
            }
          } else {
            this.broadcasterPresent = false;
          }
  
          // Attach screen share track
          if (screenTrack && this.$refs.screenShareVideo) {
            this.screenSharePresent = true;
            this.$nextTick(() => {
              try {
                hmsActions.attachVideo(screenTrack, this.$refs.screenShareVideo);
                console.log('Screen share srcObject:', this.$refs.screenShareVideo.srcObject);
                console.log('Screen share tracks:', this.$refs.screenShareVideo.srcObject?.getTracks());
                this.$refs.screenShareVideo.play().catch(e => console.error('Screen play error:', e));
              } catch (error) {
                console.error('Error attaching screen share track:', error);
                this.screenSharePresent = false;
              }
            });
          } else {
            this.screenSharePresent = false;
            console.log('No valid screen share track or ref unavailable');
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