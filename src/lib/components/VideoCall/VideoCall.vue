<template>
	<transition name="vac-fade-video">
		<div v-if="visible" class="vac-video-call-container">
			<div class="vac-video-call-wrapper">
				<div class="vac-video-header">
					<h3 class="vac-video-title">Video Chat</h3>
					<button class="vac-video-close" @click="closeVideoCall">
						<svg viewBox="0 0 24 24" width="20" height="20">
							<path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
						</svg>
					</button>
				</div>

				<div class="vac-video-content">
					<video
						ref="localVideo"
						class="vac-video-local"
						autoplay
						muted
						playsinline
					/>
					<video
						ref="remoteVideo"
						class="vac-video-remote"
						autoplay
						playsinline
					/>
				</div>

				<div class="vac-video-controls">
					<button
						class="vac-video-control-btn"
						:class="{ 'vac-video-muted': isMuted }"
						@click="toggleMute"
					>
						<svg v-if="!isMuted" viewBox="0 0 24 24" width="24" height="24">
							<path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
						</svg>
						<svg v-else viewBox="0 0 24 24" width="24" height="24">
							<path fill="currentColor" d="M19,11C19,12.19 18.66,13.3 18.1,14.28L16.87,13.05C17.14,12.43 17.3,11.74 17.3,11H19M15,11.16L9,5.18V5A3,3 0 0,1 12,2A3,3 0 0,1 15,5V11L15,11.16M4.27,3L21,19.73L19.73,21L15.54,16.81C14.77,17.27 13.91,17.58 13,17.72V21H11V17.72C7.72,17.23 5,14.41 5,11H6.7C6.7,14 9.24,16.1 12,16.1C12.81,16.1 13.6,15.91 14.31,15.58L12.65,13.92L12,14A3,3 0 0,1 9,11V10.28L3,4.27L4.27,3Z" />
						</svg>
					</button>

					<button
						class="vac-video-control-btn"
						:class="{ 'vac-video-disabled': !isVideoEnabled }"
						@click="toggleVideo"
					>
						<svg v-if="isVideoEnabled" viewBox="0 0 24 24" width="24" height="24">
							<path fill="currentColor" d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z" />
						</svg>
						<svg v-else viewBox="0 0 24 24" width="24" height="24">
							<path fill="currentColor" d="M3.27,2L2,3.27L4.73,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16C16.2,18 16.39,17.92 16.54,17.82L19.73,21L21,19.73M21,6.5L17,10.5V7A1,1 0 0,0 16,6H9.82L21,17.18V6.5Z" />
						</svg>
					</button>

					<button class="vac-video-control-btn vac-video-end" @click="endCall">
						<svg viewBox="0 0 24 24" width="24" height="24">
							<path fill="currentColor" d="M12,9C10.4,9 8.85,9.25 7.39,9.72L3.79,6.12C5.83,5.4 8.05,5 10.36,5C12.66,5 14.87,5.4 16.91,6.12L13.31,9.72C12.85,9.25 12.3,9 12,9M21.84,12.28C21.94,11.86 22,11.43 22,11C22,6 17.5,2 12,2C11.43,2 10.86,2.06 10.31,2.16L13.83,5.68C17.12,6.75 19.62,9.25 20.69,12.54L21.84,12.28M3.27,2L2,3.27L6.62,7.89C4.18,9.3 2.55,11.74 2.11,14.58L8.02,16.64C8.14,15.92 8.37,15.22 8.68,14.57L11.43,17.32C10.78,17.63 10.08,17.86 9.36,17.98L11.42,23.89C14.06,23.55 16.5,22.5 18.54,20.96L20.73,23.15L22,21.88L3.27,2Z" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</transition>
</template>

<script>
export default {
	name: 'VideoCall',

	props: {
		visible: { type: Boolean, default: false },
		roomId: { type: [String, Number], default: null },
		currentUserId: { type: [String, Number], default: null },
		initiatorId: { type: [String, Number], default: null },
		callId: { type: String, default: null },
		iceServers: {
			type: Array,
			default: () => [
				{ urls: 'stun:stun.l.google.com:19302' },
				{ urls: 'stun:stun1.l.google.com:19302' }
			]
		}
	},

	emits: ['close', 'webrtc-offer', 'webrtc-answer', 'webrtc-candidate'],

	expose: [
		'startCall',
		'handleRemoteOffer',
		'handleRemoteAnswer',
		'handleRemoteCandidate',
		'stopCall',
		'cleanup'
	],

	data() {
		return {
			peerConnection: null,
			localStream: null,
			remoteStream: null,
			isMuted: false,
			isVideoEnabled: true,
			callContext: {
				callId: null,
				roomId: null,
				initiatorId: null
			},
			connectionState: 'idle',
			setupInProgress: false
		}
	},

	watch: {
		visible(val) {
			if (!val) {
				this.cleanup()
			} else {
				if (this.localStream) this.setVideoStream('localVideo', this.localStream)
				if (this.remoteStream) this.setVideoStream('remoteVideo', this.remoteStream)
			}
		}
	},

	beforeUnmount() {
		this.cleanup()
	},

	methods: {
		setVideoStream(refName, stream) {
			const element = this.$refs[refName]
			if (!element) return

			if (element.srcObject !== stream) {
				element.srcObject = stream
			}

			if (typeof element.play === 'function') {
				const playPromise = element.play()
				if (playPromise && typeof playPromise.catch === 'function') {
					playPromise.catch(() => {
						// Autoplay might be blocked until user interaction.
					})
				}
			}
		},
		async ensureLocalStream() {
			if (this.localStream) return this.localStream

			if (typeof window === 'undefined' || !window.navigator || !window.navigator.mediaDevices) {
				throw new Error('Media devices API is not available in the current environment.')
			}

			this.setupInProgress = true
			try {
				this.localStream = await window.navigator.mediaDevices.getUserMedia({
					video: true,
					audio: true
				})

				this.setVideoStream('localVideo', this.localStream)

				return this.localStream
			} catch (error) {
				console.error('Failed to access media devices:', error)
				throw error
			} finally {
				this.setupInProgress = false
			}
		},
		createPeerConnection() {
			if (this.peerConnection) return this.peerConnection

			if (typeof RTCPeerConnection === 'undefined') {
				throw new Error('WebRTC is not supported in this environment.')
			}

			const pc = new RTCPeerConnection({ iceServers: this.iceServers })

			pc.ontrack = event => {
				if (event.streams && event.streams[0]) {
					this.remoteStream = event.streams[0]
					this.setVideoStream('remoteVideo', this.remoteStream)
				}
			}

			pc.onicecandidate = event => {
				if (!event.candidate) return
				this.$emit('webrtc-candidate', {
					roomId: this.callContext.roomId || this.roomId,
					callId: this.callContext.callId || this.callId,
					candidate: event.candidate,
					fromUserId: this.currentUserId || null
				})
			}

			pc.onconnectionstatechange = () => {
				this.connectionState = pc.connectionState
				if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
					this.closeVideoCall()
				}
			}

			this.peerConnection = pc

			if (this.localStream) {
				this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream))
			}

			return pc
		},
		async startCall(context = {}) {
			const callId = context.callId || this.callId
			const roomId = context.roomId || this.roomId
			const initiatorId = context.initiatorId ?? this.initiatorId ?? this.currentUserId

			this.callContext = { callId, roomId, initiatorId }

			await this.ensureLocalStream()
			this.setVideoStream('localVideo', this.localStream)
			const pc = this.createPeerConnection()

			if (this.localStream && !pc.getSenders().length) {
				this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream))
			}

			const isInitiator = initiatorId == null || initiatorId === this.currentUserId

			if (isInitiator) {
				try {
					const offer = await pc.createOffer()
					await pc.setLocalDescription(offer)
					this.$emit('webrtc-offer', {
						roomId,
						callId,
						sdp: offer.sdp,
						fromUserId: this.currentUserId || null
					})
				} catch (error) {
					console.error('Error creating offer:', error)
				}
			}
		},
		async handleRemoteOffer({ sdp, roomId, callId }) {
			await this.ensureLocalStream()
			const pc = this.createPeerConnection()
			try {
				await pc.setRemoteDescription({ type: 'offer', sdp })
				const answer = await pc.createAnswer()
				await pc.setLocalDescription(answer)
				this.$emit('webrtc-answer', {
					roomId: roomId || this.callContext.roomId,
					callId: callId || this.callContext.callId,
					sdp: answer.sdp,
					fromUserId: this.currentUserId || null
				})
			} catch (error) {
				console.error('Failed to handle remote offer:', error)
			}
		},
		async handleRemoteAnswer({ sdp }) {
			if (!this.peerConnection) return
			try {
				await this.peerConnection.setRemoteDescription({ type: 'answer', sdp })
			} catch (error) {
				console.error('Failed to handle remote answer:', error)
			}
		},
		async handleRemoteCandidate({ candidate }) {
			if (!candidate) return
			if (!this.peerConnection) {
				this.createPeerConnection()
			}
			try {
				await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
			} catch (error) {
				console.warn('Failed to add ICE candidate:', error)
			}
		},
		stopCall() {
			this.closeVideoCall()
		},
		toggleMute() {
			if (!this.localStream) return
			const audioTrack = this.localStream.getAudioTracks()[0]
			if (audioTrack) {
				audioTrack.enabled = !audioTrack.enabled
				this.isMuted = !audioTrack.enabled
			}
		},
		toggleVideo() {
			if (!this.localStream) return
			const videoTrack = this.localStream.getVideoTracks()[0]
			if (videoTrack) {
				videoTrack.enabled = !videoTrack.enabled
				this.isVideoEnabled = videoTrack.enabled
			}
		},
		endCall() {
			this.closeVideoCall()
		},
		closeVideoCall() {
			this.cleanup()
			this.$emit('close')
		},
		cleanup() {
			try {
				if (this.localStream) {
					this.localStream.getTracks().forEach(track => track.stop())
					this.localStream = null
				}

				if (this.remoteStream) {
					this.remoteStream.getTracks().forEach(track => track.stop())
					this.remoteStream = null
				}

				if (this.peerConnection) {
					this.peerConnection.close()
					this.peerConnection = null
				}

				if (this.$refs.localVideo) {
					this.$refs.localVideo.srcObject = null
				}
				if (this.$refs.remoteVideo) {
					this.$refs.remoteVideo.srcObject = null
				}
			} catch (error) {
				console.warn('Error during VideoCall cleanup:', error)
			}

			this.isMuted = false
			this.isVideoEnabled = true
			this.connectionState = 'idle'
			this.callContext = { callId: null, roomId: null, initiatorId: null }
		}
	}
}
</script>

<style lang="scss">
.vac-video-call-container {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.8);
	z-index: 10000;
	display: flex;
	align-items: center;
	justify-content: center;
}

.vac-video-call-wrapper {
	background: var(--chat-bg-color-input);
	border-radius: 8px;
	width: 90%;
	max-width: 800px;
	height: 90%;
	max-height: 600px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.vac-video-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px;
	border-bottom: 1px solid var(--chat-border-color-input);
}

.vac-video-title {
	margin: 0;
	color: var(--chat-color);
	font-size: 18px;
}

.vac-video-close {
	background: none;
	border: none;
	cursor: pointer;
	padding: 4px;
	color: var(--chat-color);
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		opacity: 0.7;
	}
}

.vac-video-content {
	flex: 1;
	position: relative;
	background: #000;
	display: flex;
	align-items: center;
	justify-content: center;
}

.vac-video-local {
	position: absolute;
	top: 16px;
	right: 16px;
	width: 200px;
	height: 150px;
	background: #333;
	border-radius: 8px;
	object-fit: cover;
	z-index: 2;
}

.vac-video-remote {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.vac-video-controls {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16px;
	padding: 16px;
	border-top: 1px solid var(--chat-border-color-input);
}

.vac-video-control-btn {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--chat-bg-color-message-current-user);
	color: white;
	transition: all 0.2s;

	&:hover {
		opacity: 0.8;
	}

	&.vac-video-muted,
	&.vac-video-disabled {
		background: #666;
	}

	&.vac-video-end {
		background: #dc3545;
	}
}

.vac-fade-video-enter-active,
.vac-fade-video-leave-active {
	transition: opacity 0.3s;
}

.vac-fade-video-enter-from,
.vac-fade-video-leave-to {
	opacity: 0;
}
</style>
