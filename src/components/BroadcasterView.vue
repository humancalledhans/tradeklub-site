<template>
  <div class="broadcast-wrapper">
    <div v-if="!hasJoined" class="join-section">
      <input v-model="userName" placeholder="Enter your name..." @keyup.enter="joinRoom" class="name-input" />
      <button @click="joinRoom" :disabled="!userName.trim()">Join Room</button>
    </div>
    <div v-if="hasJoined" class="video-section">

      <button @click="debugHMSState" style="position: absolute; top: 10px; right: 10px; z-index: 1000;">
        Debug HMS State
      </button>
      <button @click="debugVideoElements" style="position: absolute; top: 10px; right: 120px; z-index: 1000;">
        Debug Videos
      </button>
      <button @click="compareTrackAttachment" style="position: absolute; top: 170px; right: 10px; z-index: 1000;">
        Compare Tracks
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
    this.debugHMSMethods();
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
    debugHMSState() {
      const state = hmsStore.getState();
      console.log('=== HMS STORE DEBUG ===');
      console.log('Full state:', state);
      console.log('All peers:', state.peers);
      console.log('All tracks:', state.tracks);
      
      // Find screen sharing peers
      const screenSharingPeers = Object.values(state.peers || {}).filter(peer => 
        peer.auxiliaryTracks?.length > 0
      );
      console.log('Peers with auxiliary tracks:', screenSharingPeers);
      
      // Find screen tracks
      const screenTracks = Object.values(state.tracks || {}).filter(track => 
        track.source === 'screen' || track.type === 'screen'
      );
      console.log('All screen tracks:', screenTracks);
    },
    debugHMSMethods() {
      console.log('=== HMS METHODS DEBUG ===');
      console.log('hmsActions methods:', Object.getOwnPropertyNames(hmsActions));
      console.log('hmsStore available methods:', Object.getOwnPropertyNames(hmsStore));
      
      // Check for refresh/reconnect methods
      if (hmsActions.refreshTrack) console.log('✅ hmsActions.refreshTrack exists');
      if (hmsActions.reconnect) console.log('✅ hmsActions.reconnect exists');
      if (hmsActions.getVideoElement) console.log('✅ hmsActions.getVideoElement exists');
      if (hmsActions.detachVideo) console.log('✅ hmsActions.detachVideo exists');
      
      // Check store methods
      if (hmsStore.getActions) console.log('✅ hmsStore.getActions exists');
      if (hmsStore.triggerOnSubscribe) console.log('✅ hmsStore.triggerOnSubscribe exists');
    },
    async refreshTrackInStore(trackId) {
      console.log('Attempting to refresh track in store:', trackId);
      
      // Try to trigger a track update by accessing HMS internals
      try {
        const state = hmsStore.getState();
        const track = state.tracks[trackId];
        
        if (track) {
          // Force a re-evaluation of the track
          console.log('Track exists in store, forcing refresh...');
          
          // Try to re-subscribe to track updates
          const unsubscribe = hmsStore.subscribe((tracks) => {
            console.log('Track update received');
            unsubscribe();
          }, (state) => state.tracks);
          
          // Trigger a state update
          setTimeout(unsubscribe, 100);
        }
      } catch (error) {
        console.error('Track refresh failed:', error);
      }
    },
    compareTrackAttachment() {
      console.log('=== TRACK ATTACHMENT COMPARISON ===');
      
      const hmsState = hmsStore.getState();
      
      // Get the working broadcaster video track
      const workingVideoTrack = Object.values(hmsState.tracks).find(track => 
        track.source === 'regular' && 
        track.type === 'video' && 
        track.displayEnabled === true &&
        track.enabled === true
      );
      
      // Get the screen share track
      const screenTrack = Object.values(hmsState.tracks).find(track => 
        track.source === 'screen' && 
        track.type === 'video'
      );
      
      console.log('Working video track:', workingVideoTrack);
      console.log('Screen share track:', screenTrack);
      
      // Compare their properties
      if (workingVideoTrack && screenTrack) {
        const workingProps = Object.keys(workingVideoTrack).sort();
        const screenProps = Object.keys(screenTrack).sort();
        
        console.log('Working track properties:', workingProps);
        console.log('Screen track properties:', screenProps);
        
        // Find differences
        const missingInScreen = workingProps.filter(prop => !screenProps.includes(prop));
        const extraInScreen = screenProps.filter(prop => !workingProps.includes(prop));
        
        console.log('Properties missing in screen track:', missingInScreen);
        console.log('Extra properties in screen track:', extraInScreen);
        
        // Test attachment of both
        const videoEl = this.$refs.screenShareVideo;
        if (videoEl) {
          console.log('Testing working track attachment...');
          try {
            hmsActions.attachVideo(workingVideoTrack, videoEl);
            setTimeout(() => {
              console.log('Working track attachment result:', {
                hasSrcObject: !!videoEl.srcObject,
                videoWidth: videoEl.videoWidth,
                videoHeight: videoEl.videoHeight
              });
              
              // Now try screen track
              console.log('Testing screen track attachment...');
              videoEl.srcObject = null; // Clear first
              
              hmsActions.attachVideo(screenTrack, videoEl);
              setTimeout(() => {
                console.log('Screen track attachment result:', {
                  hasSrcObject: !!videoEl.srcObject,
                  videoWidth: videoEl.videoWidth,
                  videoHeight: videoEl.videoHeight
                });
              }, 2000);
              
            }, 2000);
          } catch (error) {
            console.error('Track attachment test failed:', error);
          }
        }
      }
    },
    async directWebRTCAttachment(peerId, videoEl) {
      console.log('Attempting direct WebRTC attachment for peer:', peerId);
      
      // This is a bit of a hack, but let's see if we can access the peer connection directly
      try {
        // Check if HMS exposes any peer connection internals
        const state = hmsStore.getState();
        console.log('Checking for peer connection internals...');
        
        // Look for any internal HMS objects that might have the MediaStream
        if (window.hmsSDK || window.HMS) {
          console.log('Found HMS SDK in window, checking for streams...');
          // Try to access internal streams
        }
        
        // Alternative: Try to find the stream via WebRTC stats
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          console.log('Display media available, but cannot hijack existing stream');
        }
        
        // Last resort: Try to trigger a complete re-render
        console.log('Triggering component re-render...');
        this.screenSharePresent = false;
        await this.$nextTick();
        
        setTimeout(() => {
          this.screenSharePresent = true;
          this.$nextTick(() => {
            const freshTrack = hmsStore.getState(selectScreenShareByPeerID(peerId));
            if (freshTrack) {
              hmsActions.attachVideo(freshTrack, this.$refs.screenShareVideo);
            }
          });
        }, 1000);
        
      } catch (error) {
        console.error('Direct WebRTC attachment failed:', error);
        throw error;
      }
    },
    async handleScreenShare(presenter) {
      console.log('=== ENHANCED SCREEN SHARE HANDLER ===');
      
      if (!presenter) {
        this.screenSharePresent = false;
        return;
      }

      console.log('Presenter ID:', presenter.id);
      
      // Step 1: Wait for track to be fully ready
      const waitForTrack = async (maxAttempts = 10) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          console.log(`Track ready check - Attempt ${attempt}/${maxAttempts}`);
          
          const screenTrack = hmsStore.getState(selectScreenShareByPeerID(presenter.id));
          
          if (screenTrack) {
            console.log(`Found track on attempt ${attempt}:`, screenTrack.id);
            
            // Force a refresh of the track by re-subscribing
            try {
              // Try to refresh the track in the store
              await this.refreshTrackInStore(screenTrack.id);
              
              // Get the refreshed track
              const refreshedTrack = hmsStore.getState(selectScreenShareByPeerID(presenter.id));
              console.log('Refreshed track:', refreshedTrack);
              
              return refreshedTrack;
            } catch (error) {
              console.log(`Refresh attempt ${attempt} failed:`, error);
            }
          }
          
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return null;
      };

      const screenTrack = await waitForTrack();
      
      if (!screenTrack) {
        console.log('❌ No screen track found after all attempts');
        this.screenSharePresent = false;
        return;
      }

      console.log('Using screen track:', screenTrack.id);
      this.screenSharePresent = true;

      // Step 2: Enhanced video attachment
      this.$nextTick(async () => {
        const videoEl = this.$refs.screenShareVideo;
        if (!videoEl) {
          console.error('Video element not found');
          return;
        }

        console.log('Starting attachment attempts...');

        // Method 1: Standard HMS attachment with retry
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            console.log(`HMS attachment attempt ${attempt}/5`);
            
            // Clear any existing srcObject
            videoEl.srcObject = null;
            
            // Try HMS attachVideo
            hmsActions.attachVideo(screenTrack, videoEl);
            
            // Wait for attachment
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log(`After attempt ${attempt}:`, {
              hasSrcObject: !!videoEl.srcObject,
              videoWidth: videoEl.videoWidth,
              videoHeight: videoEl.videoHeight,
              readyState: videoEl.readyState
            });
            
            if (videoEl.srcObject && videoEl.videoWidth > 0) {
              console.log(`✅ HMS attachment succeeded on attempt ${attempt}`);
              await videoEl.play().catch(e => console.error('Play error:', e));
              return;
            }
            
          } catch (error) {
            console.error(`HMS attachment attempt ${attempt} failed:`, error);
          }
        }

        // Method 2: Direct WebRTC approach (bypass HMS)
        console.log('HMS attachment failed, trying direct WebRTC approach...');
        try {
          await this.directWebRTCAttachment(presenter.id, videoEl);
        } catch (error) {
          console.error('Direct WebRTC approach failed:', error);
          this.screenSharePresent = false;
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