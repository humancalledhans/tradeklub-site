<template>
  <div class="broadcast-wrapper">
    <div v-if="!hasJoined" class="join-section">
      <input v-model="userName" placeholder="Enter your name..." @keyup.enter="joinRoom" class="name-input" />
      <button @click="joinRoom" :disabled="!userName.trim()">Join Room</button>
    </div>
    
    <div v-if="hasJoined" class="video-section">
      <!-- Single video element that shows either broadcaster OR screen share -->
      <video 
        ref="mainVideo" 
        autoplay 
        playsinline 
        muted 
        :class="screenSharePresent ? 'screen-share-video' : 'broadcaster-video'"
      ></video>
      
      <!-- Show what's currently being displayed -->
      <div class="video-status">
        <span v-if="screenSharePresent">📺 Screen Share</span>
        <span v-else-if="broadcasterPresent">📹 Camera</span>
        <span v-else>⏳ Waiting for stream...</span>
      </div>
      
      <div v-if="!broadcasterPresent && !screenSharePresent" class="no-stream-message">
        No broadcaster stream available yet.
      </div>

      <!-- Debug buttons -->
      <button @click="debugHMSState" style="position: absolute; top: 50px; right: 10px; z-index: 1000;">
        Debug HMS State
      </button>
      <button @click="debugVideoElements" style="position: absolute; top: 50px; right: 150px; z-index: 1000;">
        Debug Videos
      </button>
      <button @click="testMainVideoAttachment" style="position: absolute; top: 90px; right: 10px; z-index: 1000;">
        Test Main Video
      </button>
      <button @click="tryDirectTrackExtraction" style="position: absolute; top: 130px; right: 10px; z-index: 1000;">
        Try Direct Track
      </button>
      <button @click="testScreenShareOnly" style="position: absolute; top: 210px; right: 10px; z-index: 1000;">
        Test Screen Only
      </button>
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
    testScreenShareOnly() {
      console.log('=== SCREEN SHARE ONLY TEST ===');
      
      const hmsState = hmsStore.getState();
      
      // Find screen share track
      const screenTrack = Object.values(hmsState.tracks).find(track => 
        track.source === 'screen' && track.type === 'video'
      );
      
      console.log('Screen track found:', !!screenTrack);
      
      if (screenTrack) {
        console.log('Screen track details:', {
          id: screenTrack.id,
          enabled: screenTrack.enabled,
          displayEnabled: screenTrack.displayEnabled,
          peerId: screenTrack.peerId
        });
        
        const mainVideo = this.$refs.mainVideo;
        console.log('Main video element ready:', !!mainVideo);
        
        if (mainVideo) {
          // Clear any existing content
          mainVideo.srcObject = null;
          
          console.log('Attempting screen track attachment...');
          
          try {
            hmsActions.attachVideo(screenTrack, mainVideo);
            console.log('attachVideo call completed');
            
            // Check multiple times with delays
            const checkTimes = [500, 1000, 2000, 3000, 5000];
            
            checkTimes.forEach(delay => {
              setTimeout(() => {
                console.log(`After ${delay}ms:`, {
                  hasSrcObject: !!mainVideo.srcObject,
                  videoWidth: mainVideo.videoWidth,
                  videoHeight: mainVideo.videoHeight,
                  readyState: mainVideo.readyState,
                  paused: mainVideo.paused
                });
                
                if (mainVideo.srcObject && delay === 2000) {
                  console.log('✅ Attachment successful, trying to play...');
                  mainVideo.play().catch(e => console.error('Play error:', e));
                }
              }, delay);
            });
            
          } catch (error) {
            console.error('Screen track attachment error:', error);
          }
          
          // Also try a completely fresh approach
          setTimeout(() => {
            if (!mainVideo.srcObject) {
              console.log('Trying alternative approach - re-render component...');
              this.forceComponentRefresh();
            }
          }, 3000);
        }
      } else {
        console.log('❌ No screen track found');
      }
    },

    forceComponentRefresh() {
      console.log('=== FORCE COMPONENT REFRESH ===');
      
      // Temporarily hide and show the video element
      this.screenSharePresent = false;
      
      this.$nextTick(() => {
        setTimeout(() => {
          this.screenSharePresent = true;
          
          this.$nextTick(() => {
            setTimeout(() => {
              // Try attachment on fresh element
              const hmsState = hmsStore.getState();
              const screenTrack = Object.values(hmsState.tracks).find(track => 
                track.source === 'screen' && track.type === 'video'
              );
              const mainVideo = this.$refs.mainVideo;
              
              if (screenTrack && mainVideo) {
                console.log('Attaching to refreshed element...');
                hmsActions.attachVideo(screenTrack, mainVideo);
                
                setTimeout(() => {
                  console.log('After refresh attachment:', {
                    hasSrcObject: !!mainVideo.srcObject,
                    videoWidth: mainVideo.videoWidth,
                    videoHeight: mainVideo.videoHeight
                  });
                }, 2000);
              }
            }, 500);
          });
        }, 100);
      });
    },
    testMainVideoAttachment() {
      console.log('=== TESTING MAIN VIDEO ELEMENT ===');
      
      const mainVideo = this.$refs.mainVideo;
      console.log('Main video element:', mainVideo);
      
      if (mainVideo) {
        console.log('Main video current state:', {
          hasSrcObject: !!mainVideo.srcObject,
          videoWidth: mainVideo.videoWidth,
          videoHeight: mainVideo.videoHeight,
          readyState: mainVideo.readyState,
          className: mainVideo.className
        });
        
        // Get current tracks and try manual attachment
        const hmsState = hmsStore.getState();
        
        // If screen share is present, try attaching screen track
        if (this.screenSharePresent) {
          const screenTrack = Object.values(hmsState.tracks).find(track => 
            track.source === 'screen' && track.type === 'video'
          );
          
          if (screenTrack) {
            console.log('Trying to attach screen track to main video...');
            try {
              hmsActions.attachVideo(screenTrack, mainVideo);
              
              setTimeout(() => {
                console.log('After screen track attachment:', {
                  hasSrcObject: !!mainVideo.srcObject,
                  videoWidth: mainVideo.videoWidth,
                  videoHeight: mainVideo.videoHeight
                });
              }, 2000);
            } catch (error) {
              console.error('Screen track attachment failed:', error);
            }
          }
        }
        
        // If broadcaster is present, try attaching broadcaster track
        else if (this.broadcasterPresent) {
          const broadcasterTrack = Object.values(hmsState.tracks).find(track => 
            track.source === 'regular' && 
            track.type === 'video' && 
            track.enabled === true &&
            track.displayEnabled === true
          );
          
          if (broadcasterTrack) {
            console.log('Trying to attach broadcaster track to main video...');
            try {
              hmsActions.attachVideo(broadcasterTrack, mainVideo);
              
              setTimeout(() => {
                console.log('After broadcaster track attachment:', {
                  hasSrcObject: !!mainVideo.srcObject,
                  videoWidth: mainVideo.videoWidth,
                  videoHeight: mainVideo.videoHeight
                });
              }, 2000);
            } catch (error) {
              console.error('Broadcaster track attachment failed:', error);
            }
          }
        }
      }
    },
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

      // Check the main video ref specifically
      console.log('Main video ref:', this.$refs.mainVideo);
      console.log('Screen share present flag:', this.screenSharePresent);
      console.log('Broadcaster present flag:', this.broadcasterPresent);
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
        return;
      }
      
      // Only attach if screen share is NOT present (screen share takes priority)
      if (!this.screenSharePresent) {
        this.$nextTick(() => {
          const videoEl = this.$refs.mainVideo;
          if (videoEl) {
            try {
              hmsActions.attachVideo(broadcaster.videoTrack, videoEl);
              this.broadcasterPresent = true;
              console.log('✅ Broadcaster video attached');
            } catch (error) {
              console.error('Error attaching broadcaster video:', error);
              this.broadcasterPresent = false;
            }
          }
        });
      } else {
        // Just mark as present, but don't attach (screen share has priority)
        this.broadcasterPresent = true;
      }
    },
    testVideoElementRules() {
      console.log('=== VIDEO ELEMENT RULES TEST ===');
      
      const broadcasterVideo = this.$refs.broadcasterVideo;
      const screenShareVideo = this.$refs.screenShareVideo;
      
      console.log('Broadcaster video element:', {
        hasSrcObject: !!broadcasterVideo?.srcObject,
        readyState: broadcasterVideo?.readyState,
        videoWidth: broadcasterVideo?.videoWidth,
        className: broadcasterVideo?.className
      });
      
      console.log('Screen share video element:', {
        hasSrcObject: !!screenShareVideo?.srcObject,
        readyState: screenShareVideo?.readyState,
        videoWidth: screenShareVideo?.videoWidth,
        className: screenShareVideo?.className
      });
      
      // Test 1: Try to attach screen track to broadcaster video element
      const hmsState = hmsStore.getState();
      const screenTrack = Object.values(hmsState.tracks).find(track => 
        track.source === 'screen' && track.type === 'video'
      );
      
      if (screenTrack && broadcasterVideo) {
        console.log('TEST 1: Attaching screen track to broadcaster video element...');
        
        try {
          hmsActions.attachVideo(screenTrack, broadcasterVideo);
          
          setTimeout(() => {
            console.log('Result of attaching screen track to broadcaster video:', {
              hasSrcObject: !!broadcasterVideo.srcObject,
              videoWidth: broadcasterVideo.videoWidth,
              videoHeight: broadcasterVideo.videoHeight
            });
            
            // Test 2: Try creating a completely new video element
            console.log('TEST 2: Creating fresh video element...');
            const freshVideo = document.createElement('video');
            freshVideo.autoplay = true;
            freshVideo.playsinline = true;
            freshVideo.muted = true;
            freshVideo.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border: 2px solid red;';
            
            // Add it to the screen share container temporarily
            const container = screenShareVideo.parentElement;
            container.appendChild(freshVideo);
            
            // Try attaching screen track to fresh element
            hmsActions.attachVideo(screenTrack, freshVideo);
            
            setTimeout(() => {
              console.log('Result of attaching screen track to fresh video element:', {
                hasSrcObject: !!freshVideo.srcObject,
                videoWidth: freshVideo.videoWidth,
                videoHeight: freshVideo.videoHeight
              });
              
              if (freshVideo.srcObject) {
                console.log('✅ SUCCESS! Fresh video element worked!');
                freshVideo.play().catch(e => console.error('Play error:', e));
              } else {
                console.log('❌ Even fresh video element failed');
                // Clean up
                container.removeChild(freshVideo);
              }
            }, 2000);
            
          }, 2000);
          
        } catch (error) {
          console.error('TEST 1 failed:', error);
        }
      }
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
          const unsubscribe = hmsStore.subscribe(() => {
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
    async directWebRTCAttachment(peerId) {
      console.log('Attempting direct WebRTC attachment for peer:', peerId);
      
      // This is a bit of a hack, but let's see if we can access the peer connection directly
      try {
        // Check if HMS exposes any peer connection internals
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
    forceScreenAttachment() {
      console.log('=== FORCE SCREEN ATTACHMENT ===');
      
      const hmsState = hmsStore.getState();
      const screenTrack = Object.values(hmsState.tracks).find(track => 
        track.source === 'screen' && track.type === 'video'
      );
      
      if (!screenTrack) {
        console.log('No screen track found');
        return;
      }
      
      console.log('Found screen track:', screenTrack.id);
      
      const videoEl = this.$refs.screenShareVideo;
      if (!videoEl) {
        console.log('No video element found');
        return;
      }
      
      // Method 1: Multiple attachment attempts with delays
      const attemptAttachment = async (attempt = 1, maxAttempts = 5) => {
        console.log(`Attachment attempt ${attempt}/${maxAttempts}`);
        
        try {
          // Clear any existing srcObject
          videoEl.srcObject = null;
          
          // Wait a bit
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try attachment
          hmsActions.attachVideo(screenTrack, videoEl);
          
          // Wait for attachment to take effect
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log(`After attempt ${attempt}:`, {
            hasSrcObject: !!videoEl.srcObject,
            videoWidth: videoEl.videoWidth,
            videoHeight: videoEl.videoHeight,
            readyState: videoEl.readyState
          });
          
          if (videoEl.srcObject && videoEl.readyState >= 2) {
            console.log(`✅ Success on attempt ${attempt}!`);
            videoEl.play().catch(e => console.error('Play error:', e));
            return true;
          }
          
          if (attempt < maxAttempts) {
            return attemptAttachment(attempt + 1, maxAttempts);
          }
          
        } catch (error) {
          console.error(`Attempt ${attempt} error:`, error);
        }
        
        return false;
      };
      
      attemptAttachment().then(success => {
        if (!success) {
          console.log('❌ All attachment attempts failed');
          console.log('Trying alternative approach...');
          this.tryAlternativeAttachment(screenTrack, videoEl);
        }
      });
    },
    tryDirectTrackExtraction() {
      console.log('=== DIRECT TRACK EXTRACTION ===');
      
      // Step 1: Get the working MediaStream from broadcaster video
      const workingVideos = document.querySelectorAll('video');
      let workingStream = null;
      
      workingVideos.forEach((video, index) => {
        if (video.srcObject && video.videoWidth > 0) {
          console.log(`Found working video ${index}:`, {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            className: video.className
          });
          
          workingStream = video.srcObject;
          console.log('Working stream tracks:', workingStream.getTracks());
        }
      });
      
      if (!workingStream) {
        console.log('❌ No working stream found');
        return;
      }
      
      // Step 2: Look for screen share track in the working stream
      const tracks = workingStream.getTracks();
      const screenTrack = tracks.find(track => 
        track.label && (
          track.label.includes('screen') || 
          track.label.includes('Screen') ||
          track.label.includes('display')
        )
      );
      
      console.log('All tracks in working stream:', tracks.map(t => ({
        kind: t.kind,
        label: t.label,
        id: t.id
      })));
      
      if (screenTrack) {
        console.log('✅ Found screen track:', screenTrack.label);
        
        // Step 3: Create new MediaStream with screen track
        const screenStream = new MediaStream([screenTrack]);
        const mainVideo = this.$refs.mainVideo;
        
        if (mainVideo) {
          console.log('Attempting direct stream assignment...');
          mainVideo.srcObject = screenStream;
          
          setTimeout(() => {
            console.log('After direct assignment:', {
              hasSrcObject: !!mainVideo.srcObject,
              videoWidth: mainVideo.videoWidth,
              videoHeight: mainVideo.videoHeight,
              readyState: mainVideo.readyState
            });
            
            if (mainVideo.readyState >= 2) {
              console.log('✅ Direct assignment worked!');
              mainVideo.play().catch(e => console.error('Play error:', e));
            }
          }, 2000);
        }
      } else {
        console.log('❌ No screen track found in working stream');
        console.log('This might mean screen sharing is in a separate stream');
        
        // Step 4: Try to find screen sharing peer connection directly
        this.tryPeerConnectionAccess();
      }
    },

    // Add this method to try accessing peer connections
    tryPeerConnectionAccess() {
      console.log('=== PEER CONNECTION ACCESS ===');
      
      // Check if we can access WebRTC peer connections
      if (window.RTCPeerConnection) {
        console.log('RTCPeerConnection available');
        
        // Try to find active peer connections (this is a bit hacky)
        // Modern browsers might have restrictions, but let's try
        
        // Check if HMS exposes any internal peer connection objects
        const hmsState = hmsStore.getState();
        console.log('HMS State room info:', hmsState.room);
        
        // Look for any WebRTC-related objects in the global scope
        Object.keys(window).forEach(key => {
          if (key.toLowerCase().includes('webrtc') || 
              key.toLowerCase().includes('peer') ||
              key.toLowerCase().includes('rtc')) {
            console.log(`Found potential WebRTC object: ${key}`, window[key]);
          }
        });
      }
      
      // Alternative: Try to trigger HMS to refresh its track management
      console.log('Attempting HMS track refresh...');
      try {
        // Force HMS to re-evaluate tracks
        const screenTrack = Object.values(hmsStore.getState().tracks).find(track => 
          track.source === 'screen' && track.type === 'video'
        );
        
        if (screenTrack) {
          // Try detaching from all elements first
          const allVideos = document.querySelectorAll('video');
          allVideos.forEach(video => {
            if (video.srcObject) {
              console.log('Detaching from video:', video.className);
              hmsActions.detachVideo(screenTrack, video);
            }
          });
          
          // Wait and try fresh attachment
          setTimeout(() => {
            const mainVideo = this.$refs.mainVideo;
            if (mainVideo) {
              console.log('Trying fresh attachment after detach...');
              hmsActions.attachVideo(screenTrack, mainVideo);
              
              setTimeout(() => {
                console.log('After fresh attachment:', {
                  hasSrcObject: !!mainVideo.srcObject,
                  videoWidth: mainVideo.videoWidth,
                  videoHeight: mainVideo.videoHeight
                });
              }, 2000);
            }
          }, 1000);
        }
        
      } catch (error) {
        console.error('HMS refresh attempt failed:', error);
      }
    },
    // Add this alternative attachment method
    tryAlternativeAttachment(screenTrack, videoEl) {
      console.log('=== ALTERNATIVE ATTACHMENT ===');
      
      // Method 1: Try detaching and reattaching
      try {
        console.log('Method 1: Detach and reattach');
        hmsActions.detachVideo(screenTrack, videoEl);
        
        setTimeout(() => {
          hmsActions.attachVideo(screenTrack, videoEl);
          
          setTimeout(() => {
            console.log('After detach/reattach:', {
              hasSrcObject: !!videoEl.srcObject,
              readyState: videoEl.readyState
            });
          }, 2000);
        }, 1000);
        
      } catch (error) {
        console.error('Detach/reattach failed:', error);
      }
      
      // Method 2: Try forcing a different video element
      setTimeout(() => {
        console.log('Method 2: Force re-render component');
        this.screenSharePresent = false;
        
        this.$nextTick(() => {
          this.screenSharePresent = true;
          
          this.$nextTick(() => {
            setTimeout(() => {
              const freshVideoEl = this.$refs.screenShareVideo;
              if (freshVideoEl) {
                hmsActions.attachVideo(screenTrack, freshVideoEl);
                
                setTimeout(() => {
                  console.log('After re-render attachment:', {
                    hasSrcObject: !!freshVideoEl.srcObject,
                    readyState: freshVideoEl.readyState
                  });
                }, 2000);
              }
            }, 500);
          });
        });
      }, 5000);
    },
    handleScreenShare(presenter) {
      console.log('=== HANDLE SCREEN SHARE (FIXED) ===');
      
      if (!presenter) {
        console.log('No presenter found for screen share');
        this.screenSharePresent = false;
        
        // Switch back to broadcaster video if available
        if (this.broadcasterPresent) {
          const peers = hmsStore.getState().peers;
          const broadcaster = Object.values(peers).find(peer =>
            peer.roleName === 'broadcaster' || peer.roleName === 'host' || peer.name === 'hans broadcaster'
          );
          if (broadcaster) {
            this.handleBroadcaster(broadcaster);
          }
        }
        return;
      }

      let screenTrack = hmsStore.getState(selectScreenShareByPeerID(presenter.id));
      
      if (!screenTrack) {
        console.log('No screen track found');
        this.screenSharePresent = false;
        return;
      }

      console.log('Found screen track:', screenTrack.id);
      this.screenSharePresent = true;
      
      this.$nextTick(() => {
        const videoEl = this.$refs.mainVideo;
        if (videoEl) {
          try {
            console.log('Attaching screen track to main video element...');
            hmsActions.attachVideo(screenTrack, videoEl);
            
            setTimeout(() => {
              console.log('Screen share attachment result:', {
                hasSrcObject: !!videoEl.srcObject,
                videoWidth: videoEl.videoWidth,
                videoHeight: videoEl.videoHeight
              });
              
              if (videoEl.srcObject) {
                console.log('✅ Screen share attached successfully!');
                videoEl.play().catch(e => console.error('Play error:', e));
              }
            }, 1000);
            
          } catch (error) {
            console.error('Error attaching screen share:', error);
            this.screenSharePresent = false;
          }
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

  .video-status {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 100;
  }
  </style>
