<template>
  <div v-if="visible" class="video-call-container">
    <!-- Main video area -->
    <div class="video-grid" :class="gridClass">
      <!-- Remote participants -->
      <div
        v-for="participant in remoteParticipants"
        :key="participant.id"
        class="video-wrapper"
        :class="{ 'video-wrapper-pinned': participant.id === pinnedParticipantId }"
      >
        <video
          :ref="`remoteVideo-${participant.id}`"
          class="video-element"
          autoplay
          playsinline
        />
        <div class="participant-info">
          <div class="participant-name">{{ participant.username }}</div>
          <div v-if="participant.isMuted" class="mic-indicator muted">
            <svg-icon name="microphone-off" />
          </div>
        </div>
      </div>

      <!-- Local video -->
      <div class="video-wrapper video-local" :class="{ 'video-wrapper-minimal': remoteParticipants.length > 0 }">
        <video
          ref="localVideo"
          class="video-element"
          autoplay
          playsinline
          muted
        />
        <div class="participant-info">
          <div class="participant-name">You</div>
          <div v-if="isMuted" class="mic-indicator muted">
            <svg-icon name="microphone-off" />
          </div>
        </div>
      </div>
    </div>

    <!-- Control bar -->
    <div class="control-bar">
      <div class="control-group">
        <!-- Microphone toggle -->
        <button 
          class="control-button"
          :class="{ 'control-button-disabled': isMuted }"
          @click="toggleMute"
          title="Toggle microphone"
        >
          <svg-icon :name="isMuted ? 'microphone-off' : 'microphone'" />
        </button>

        <!-- Camera toggle -->
        <button 
          class="control-button"
          :class="{ 'control-button-disabled': !isVideoEnabled }"
          @click="toggleVideo"
          title="Toggle camera"
        >
          <svg-icon :name="isVideoEnabled ? 'video-camera' : 'video-camera-off'" />
        </button>

        <!-- Screen share -->
        <button 
          class="control-button"
          :class="{ 'control-button-active': isScreenSharing }"
          @click="toggleScreenShare"
          title="Share screen"
        >
          <svg-icon name="screen-share" />
        </button>

        <!-- Leave call -->
        <button 
          class="control-button control-button-leave"
          @click="leaveCall"
          title="Leave call"
        >
          <svg-icon name="phone-hangup" />
        </button>
      </div>

      <!-- Call info -->
      <div class="call-info">
        <div class="call-duration">{{ formattedDuration }}</div>
        <div class="participant-count">
          {{ remoteParticipants.length + 1 }} participant{{ remoteParticipants.length > 0 ? 's' : '' }}
        </div>
      </div>
    </div>

    <!-- Sidebar (optional - for chat/participants) -->
    <div v-if="showSidebar" class="sidebar">
      <div class="sidebar-tabs">
        <button 
          class="sidebar-tab"
          :class="{ active: activeTab === 'participants' }"
          @click="activeTab = 'participants'"
        >
          Participants
        </button>
        <button 
          class="sidebar-tab"
          :class="{ active: activeTab === 'chat' }"
          @click="activeTab = 'chat'"
        >
          Chat
        </button>
      </div>
      
      <div class="sidebar-content">
        <!-- Participants tab -->
        <div v-if="activeTab === 'participants'" class="participants-list">
          <div class="participant-item">
            <div class="participant-avatar">You</div>
            <div class="participant-details">
              <div class="participant-name">You</div>
              <div class="participant-status">
                <span v-if="isMuted" class="status-icon">🔇</span>
                <span v-if="!isVideoEnabled" class="status-icon">📷</span>
              </div>
            </div>
          </div>
          
          <div
            v-for="participant in remoteParticipants"
            :key="participant.id"
            class="participant-item"
          >
            <div class="participant-avatar">{{ participant.username.charAt(0).toUpperCase() }}</div>
            <div class="participant-details">
              <div class="participant-name">{{ participant.username }}</div>
              <div class="participant-status">
                <span v-if="participant.isMuted" class="status-icon">🔇</span>
                <span v-if="!participant.isVideoEnabled" class="status-icon">📷</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat tab -->
        <div v-if="activeTab === 'chat'" class="chat-panel">
          <div class="chat-messages">
            <div v-for="msg in chatMessages" :key="msg.id" class="chat-message">
              <div class="chat-sender">{{ msg.sender }}</div>
              <div class="chat-text">{{ msg.text }}</div>
              <div class="chat-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>
          <input
            v-model="chatInput"
            class="chat-input"
            placeholder="Type a message..."
            @keyup.enter="sendChatMessage"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SvgIcon from '../../../../src/components/SvgIcon/SvgIcon.vue'

export default {
  name: 'VideoCall',
  
  components: {
    SvgIcon
  },

  props: {
    visible: { type: Boolean, default: false },
    roomId: { type: String, required: true },
    currentUserId: { type: String, required: true },
    roomUsers: { type: Array, default: () => [] }
  },

  emits: ['close', 'webrtc-offer', 'webrtc-answer', 'webrtc-candidate'],

  data() {
    return {
      localStream: null,
      remoteStreams: new Map(),
      peerConnections: new Map(),
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false,
      remoteParticipants: [],
      pinnedParticipantId: null,
      showSidebar: false,
      activeTab: 'participants',
      chatMessages: [],
      chatInput: '',
      callStartTime: null,
      callDuration: 0,
      durationInterval: null
    }
  },

  computed: {
    gridClass() {
      const count = this.remoteParticipants.length + 1
      if (count === 1) return 'grid-1'
      if (count === 2) return 'grid-2'
      if (count <= 4) return 'grid-4'
      if (count <= 6) return 'grid-6'
      if (count <= 9) return 'grid-9'
      return 'grid-many'
    },
    
    formattedDuration() {
      const hours = Math.floor(this.callDuration / 3600)
      const minutes = Math.floor((this.callDuration % 3600) / 60)
      const seconds = this.callDuration % 60
      
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      }
      return `${minutes}:${String(seconds).padStart(2, '0')}`
    }
  },

  watch: {
    async visible(newVal) {
      if (newVal) {
        await this.initializeCall()
      } else {
        this.cleanupCall()
      }
    }
  },

  methods: {
    async initializeCall() {
      try {
        // Get user media
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        
        // Display local video
        if (this.$refs.localVideo) {
          this.$refs.localVideo.srcObject = this.localStream
        }
        
        // Start call duration timer
        this.callStartTime = Date.now()
        this.durationInterval = setInterval(() => {
          this.callDuration = Math.floor((Date.now() - this.callStartTime) / 1000)
        }, 1000)
        
        // Initialize peer connections for existing room users
        this.roomUsers.forEach(user => {
          if (user._id !== this.currentUserId) {
            this.createPeerConnection(user._id, user.username)
          }
        })
      } catch (error) {
        console.error('Error accessing media devices:', error)
        alert('Unable to access camera/microphone. Please check your permissions.')
      }
    },

    createPeerConnection(userId, username) {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
      
      const pc = new RTCPeerConnection(configuration)
      
      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream)
        })
      }
      
      // Handle incoming tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        this.remoteStreams.set(userId, remoteStream)
        
        // Update participants list
        const existingParticipant = this.remoteParticipants.find(p => p.id === userId)
        if (!existingParticipant) {
          this.remoteParticipants.push({
            id: userId,
            username: username,
            isMuted: false,
            isVideoEnabled: true
          })
        }
        
        // Set video source
        this.$nextTick(() => {
          const videoElement = this.$refs[`remoteVideo-${userId}`]?.[0]
          if (videoElement) {
            videoElement.srcObject = remoteStream
          }
        })
      }
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.$emit('webrtc-candidate', {
            roomId: this.roomId,
            candidate: event.candidate,
            targetUserId: userId
          })
        }
      }
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Peer connection state (${userId}):`, pc.connectionState)
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          this.removePeerConnection(userId)
        }
      }
      
      this.peerConnections.set(userId, pc)
      return pc
    },

    removePeerConnection(userId) {
      const pc = this.peerConnections.get(userId)
      if (pc) {
        pc.close()
        this.peerConnections.delete(userId)
      }
      
      this.remoteStreams.delete(userId)
      this.remoteParticipants = this.remoteParticipants.filter(p => p.id !== userId)
    },

    cleanupCall() {
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop())
        this.localStream = null
      }
      
      // Close all peer connections
      this.peerConnections.forEach(pc => pc.close())
      this.peerConnections.clear()
      this.remoteStreams.clear()
      
      // Clear participants
      this.remoteParticipants = []
      
      // Stop duration timer
      if (this.durationInterval) {
        clearInterval(this.durationInterval)
        this.durationInterval = null
      }
      
      // Reset state
      this.isMuted = false
      this.isVideoEnabled = true
      this.isScreenSharing = false
      this.callDuration = 0
    },

    toggleMute() {
      this.isMuted = !this.isMuted
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = !this.isMuted
        })
      }
    },

    toggleVideo() {
      this.isVideoEnabled = !this.isVideoEnabled
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => {
          track.enabled = this.isVideoEnabled
        })
      }
    },

    async toggleScreenShare() {
      if (!this.isScreenSharing) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
          })
          
          // Replace video track in all peer connections
          const videoTrack = screenStream.getVideoTracks()[0]
          this.peerConnections.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video')
            if (sender) {
              sender.replaceTrack(videoTrack)
            }
          })
          
          // Update local video
          if (this.$refs.localVideo) {
            this.$refs.localVideo.srcObject = screenStream
          }
          
          // Handle screen share ending
          videoTrack.onended = () => {
            this.stopScreenShare()
          }
          
          this.isScreenSharing = true
        } catch (error) {
          console.error('Error sharing screen:', error)
        }
      } else {
        this.stopScreenShare()
      }
    },

    stopScreenShare() {
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0]
        
        // Replace screen share with camera in all peer connections
        this.peerConnections.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack)
          }
        })
        
        // Update local video
        if (this.$refs.localVideo) {
          this.$refs.localVideo.srcObject = this.localStream
        }
      }
      
      this.isScreenSharing = false
    },

    leaveCall() {
      this.cleanupCall()
      this.$emit('close')
    },

    sendChatMessage() {
      if (this.chatInput.trim()) {
        const message = {
          id: Date.now(),
          sender: 'You',
          text: this.chatInput,
          timestamp: new Date()
        }
        this.chatMessages.push(message)
        this.chatInput = ''
        
        // TODO: Send message via socket to other participants
      }
    },

    formatTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },

    // WebRTC signaling handlers
    async handleOffer(offer, fromUserId, fromUsername) {
      let pc = this.peerConnections.get(fromUserId)
      if (!pc) {
        pc = this.createPeerConnection(fromUserId, fromUsername)
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      this.$emit('webrtc-answer', {
        roomId: this.roomId,
        answer: answer,
        targetUserId: fromUserId
      })
    },

    async handleAnswer(answer, fromUserId) {
      const pc = this.peerConnections.get(fromUserId)
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      }
    },

    async handleCandidate(candidate, fromUserId) {
      const pc = this.peerConnections.get(fromUserId)
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    }
  }
}
</script>

<style scoped>
.video-call-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #202124;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

/* Video grid layouts */
.video-grid {
  flex: 1;
  display: grid;
  gap: 8px;
  padding: 8px;
  background: #202124;
  overflow: hidden;
}

.grid-1 {
  grid-template-columns: 1fr;
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.grid-6 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.grid-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.grid-many {
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(180px, 1fr);
}

/* Video wrapper */
.video-wrapper {
  position: relative;
  background: #3c4043;
  border-radius: 8px;
  overflow: hidden;
}

.video-wrapper-pinned {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
}

.video-wrapper-minimal {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Participant info */
.participant-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  color: white;
  font-size: 14px;
}

.participant-name {
  font-weight: 500;
}

.mic-indicator {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mic-indicator.muted {
  color: #ea4335;
}

/* Control bar */
.control-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(to top, rgba(32, 33, 36, 0.9), transparent);
}

.control-group {
  display: flex;
  gap: 12px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.control-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: #3c4043;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.control-button:hover {
  background: #5f6368;
}

.control-button-disabled {
  background: #ea4335;
}

.control-button-disabled:hover {
  background: #d33b2c;
}

.control-button-active {
  background: #1a73e8;
}

.control-button-active:hover {
  background: #1765cc;
}

.control-button-leave {
  background: #ea4335;
}

.control-button-leave:hover {
  background: #d33b2c;
}

/* Call info */
.call-info {
  position: absolute;
  left: 20px;
  color: white;
  font-size: 14px;
}

.call-duration {
  font-weight: 500;
  margin-bottom: 4px;
}

.participant-count {
  opacity: 0.8;
}

/* Sidebar */
.sidebar {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 320px;
  background: #2d2e30;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #3c4043;
}

.sidebar-tab {
  flex: 1;
  padding: 16px;
  background: none;
  border: none;
  color: #8ab4f8;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-tab:hover {
  background: rgba(138, 180, 248, 0.1);
}

.sidebar-tab.active {
  color: white;
  border-bottom: 2px solid #8ab4f8;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

/* Participants list */
.participants-list {
  padding: 16px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: #3c4043;
  border-radius: 8px;
}

.participant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #8ab4f8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: #202124;
}

.participant-details {
  flex: 1;
}

.participant-status {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.status-icon {
  font-size: 16px;
}

/* Chat panel */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.chat-message {
  margin-bottom: 16px;
  padding: 12px;
  background: #3c4043;
  border-radius: 8px;
}

.chat-sender {
  font-weight: 500;
  color: #8ab4f8;
  margin-bottom: 4px;
}

.chat-text {
  color: white;
  margin-bottom: 4px;
}

.chat-time {
  font-size: 12px;
  opacity: 0.6;
  color: white;
}

.chat-input {
  padding: 12px 16px;
  background: #3c4043;
  border: none;
  color: white;
  font-size: 14px;
  outline: none;
}

.chat-input::placeholder {
  color: #8ab4f8;
  opacity: 0.6;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .video-wrapper-minimal {
    width: 120px;
    height: 90px;
    bottom: 80px;
    right: 10px;
  }

  .control-bar {
    padding: 12px;
  }

  .control-button {
    width: 48px;
    height: 48px;
  }

  .sidebar {
    width: 100%;
  }
}
</style>
