<template>
	<div class="window-container" :class="{ 'window-mobile': isDevice }">
		<!-- 채팅창이 로드되지 않았을 때 표시할 로딩 상태 -->
		<div v-if="!chatReady" class="loading-container">
			<div class="loading-spinner"></div>
			<p>채팅창을 불러오는 중...</p>
		</div>

		<form v-if="addNewRoom" @submit.prevent="createRoom">
			<input v-model="addRoomUsername" type="text" placeholder="Add username" />
			<button type="submit" :disabled="disableForm || !addRoomUsername">
				Create Room
			</button>
			<button class="button-cancel" @click="addNewRoom = false">Cancel</button>
		</form>

		<form v-if="inviteRoomId" @submit.prevent="addRoomUser">
			<input v-model="invitedUsername" type="text" placeholder="Add username" />
			<button type="submit" :disabled="disableForm || !invitedUsername">
				Add User
			</button>
			<button class="button-cancel" @click="inviteRoomId = null">Cancel</button>
		</form>

		<form v-if="removeRoomId" @submit.prevent="deleteRoomUser">
			<select v-model="removeUserId">
				<option default value="">Select User</option>
				<option v-for="user in removeUsers" :key="user._id" :value="user._id">
					{{ user.username }}
				</option>
			</select>
			<button type="submit" :disabled="disableForm || !removeUserId">
				Remove User
			</button>
			<button class="button-cancel" @click="removeRoomId = null">Cancel</button>
		</form>

		<!-- 채팅창이 준비되었을 때만 표시 -->
		<vue-advanced-chat
			v-if="chatReady"
			ref="chatWindow"
			:height="screenHeight"
			:theme="theme"
			:styles="JSON.stringify(styles)"
			:current-user-id="internalCurrentUserId"
			:load-first-room="false"
			:room-id="roomId"
			:rooms="JSON.stringify(loadedRooms)"
			:loading-rooms="loadingRooms"
			:rooms-loaded="roomsLoaded"
			:messages="JSON.stringify(messages)"
			:messages-loaded="messagesLoaded"
			:room-message="roomMessage"
			:room-actions="JSON.stringify(roomActions)"
			:menu-actions="JSON.stringify(menuActions)"
			:message-selection-actions="JSON.stringify(messageSelectionActions)"
			:templates-text="JSON.stringify(templatesText)"
			:textarea-action-enabled="true"
			:show-files="true"
			:show-audio="true"
			:show-emojis="true"
			:accepted-files="'*'"
			:multiple-files="true"
			:capture-files="''"
			:audio-bit-rate="128000"
			:audio-sample-rate="44100"
			@fetch-more-rooms="fetchMoreRooms"
			@fetch-messages="fetchMessages($event.detail[0])"
			@send-message="sendMessage($event.detail[0])"
			@edit-message="editMessage($event.detail[0])"
			@delete-message="deleteMessage($event.detail[0])"
			@open-file="openFile($event.detail[0])"
			@open-user-tag="openUserTag($event.detail[0])"
			@add-room="addRoom($event.detail[0])"
			@room-action-handler="menuActionHandler($event.detail[0])"
			@menu-action-handler="menuActionHandler($event.detail[0])"
			@message-selection-action-handler="
				messageSelectionActionHandler($event.detail[0])
			"
			@send-message-reaction="sendMessageReaction($event.detail[0])"
			@typing-message="typingMessage($event.detail[0])"
			@textarea-action-handler="onTextareaAction($event.detail[0])"
			@toggle-rooms-list="$emit('show-demo-options', $event.detail[0].opened)"
			@start-video-call="startVideoCall($event.detail[0])"
			@webrtc-offer="onWebRTCOffer($event.detail[0])"
			@webrtc-answer="onWebRTCAnswer($event.detail[0])"
			@webrtc-candidate="onWebRTCCandidate($event.detail[0])"
		>
		</vue-advanced-chat>

		<!-- Video call widget -->
		<video-call
			v-if="roomId && chatReady && showVideoCall"
			ref="videoCall"
			:visible="showVideoCall"
			:room-id="roomId"
			:current-user-id="internalCurrentUserId"
			:room-users="videoCallRoomUsers"
			@close="endVideoCall"
			@webrtc-offer="onWebRTCOffer"
			@webrtc-answer="onWebRTCAnswer"
			@webrtc-candidate="onWebRTCCandidate"
		/>
	</div>
</template>

<script>
import chatService from '@/services/chatService'
import { parseTimestamp, formatTimestamp } from '@/utils/dates'

import VideoCall from './components/VideoCall/VideoCall.vue'
import { register } from 'vue-advanced-chat'
register()

export default {
	components: { VideoCall },
	props: {
		currentUserId: { type: String, required: true },
		theme: { type: String, required: true },
		isDevice: { type: Boolean, required: true }
	},

	emits: ['show-demo-options'],

	data() {
		return {
			loggedInUserId: '',
			roomsPerPage: 15,
			rooms: [],
			roomId: '',
			startRooms: null,
			endRooms: null,
			roomsLoaded: false,
			loadingRooms: true,
			allUsers: [],
			loadingLastMessageByRoom: 0,
			roomsLoadedCount: 0,
			selectedRoom: null,
			messagesPerPage: 20,
			messages: [],
			messagesLoaded: false,
			roomMessage: '',
			lastLoadedMessage: null,
			previousLastLoadedMessage: null,
			roomsListeners: [],
			listeners: [],
			typingMessageCache: '',
			disableForm: false,
			addNewRoom: null,
			addRoomUsername: '',
			inviteRoomId: null,
			invitedUsername: '',
			removeRoomId: null,
			removeUserId: '',
			removeUsers: [],
			roomActions: [
				{ name: 'inviteUser', title: 'Invite User' },
				{ name: 'removeUser', title: 'Remove User' },
				{ name: 'deleteRoom', title: 'Delete Room' }
			],
			menuActions: [],
			messageSelectionActions: [{ name: 'deleteMessages', title: 'Delete' }],
			styles: { container: { borderRadius: '4px' } },
			templatesText: [
				{
					tag: 'help',
					text: 'This is the help'
				},
				{
					tag: 'action',
					text: 'This is the action'
				},
				{
					tag: 'action 2',
					text: 'This is the second action'
				}
			],
			typingUsers: {},
			showVideoCall: false,
			chatReady: false
		}
	},

  computed: {
		internalCurrentUserId() {
			return this.loggedInUserId || this.currentUserId
		},
		loadedRooms() {
			const loadedRaw = this.rooms.slice(0, this.roomsLoadedCount)
			console.log('🔍 Raw rooms before mapping:', loadedRaw)
			
			// Map server rooms (using _id/id) to component rooms (using roomId)
			const mapped = loadedRaw.map(r => {
				console.log('🔍 Mapping room:', r)
				
				// Ensure room has valid structure
				if (!r._id && !r.id) {
					console.error('❌ Room missing ID:', r)
					return null
				}
				
				const roomId = r._id || r.id
				const roomName = r.roomName || 'Unnamed Room'
				const users = Array.isArray(r.users) ? r.users : []
				
				const mappedRoom = {
					roomId: roomId,
					roomName: roomName,
					avatar: r.avatar || null,
					users: users.map(u => ({
						_id: u._id || u.id,
						username: u.username || 'Unknown',
						avatar: u.avatar || null,
						status: u.status || { state: 'offline' }
					})),
					unreadCount: r.unreadCount || 0,
					typingUsers: r.typingUsers || [],
					index: r.index ?? r.lastUpdated ?? r.lastMessage?.timestamp ?? 0,
					lastMessage: r.lastMessage ? { ...r.lastMessage } : null
				}
				console.log('🔍 Mapped room:', mappedRoom)
				return mappedRoom
			}).filter(r => r !== null) // Remove any invalid rooms
			
			console.log('Loaded rooms for vue-advanced-chat (mapped):', mapped)
			return mapped
		},
		screenHeight() {
			return this.isDevice ? window.innerHeight + 'px' : 'calc(100vh - 80px)'
		},
		videoCallRoomUsers() {
			// Get users from the current room for video call
			const room = this.rooms.find(r => r._id === this.roomId || r.id === this.roomId)
			return room ? room.users : []
		}
	},

	async mounted() {
		console.log('🚀 ChatContainer mounted')
		
		try {
			await this.initializeChat()
		} catch (e) {
			console.error('❌ Initialization failed, continuing without socket:', e)
		}
		this.setupSocketListeners()
		// fetchRooms is now called in initializeChat, so remove duplicate call
		this.fetchAllUsers()
		
		// Don't set chatReady here - wait for rooms to be loaded
		
		// Wait for next tick to ensure DOM is updated
		await this.$nextTick()
		console.log('🔍 ChatWindow ref after ready:', this.$refs.chatWindow)
		
		// Add styles to the component
		this.$nextTick(async () => {
			if (this.$refs.chatWindow && this.$refs.chatWindow.shadowRoot) {
				try {
					// Load all necessary styles
					const styles = `
						@import url('https://fonts.googleapis.com/css?family=Quicksand:300,400,500,700');
						${await this.loadComponentStyles()}
					`;
					const style = document.createElement('style');
					style.textContent = styles;
					this.$refs.chatWindow.shadowRoot.appendChild(style);
				} catch (error) {
					console.error('Failed to load styles:', error);
				}
			}
		})
	},

	beforeUnmount() {
		chatService.removeSocketListeners()
	},

	methods: {
			onTextareaAction() {
				// Video call is handled by the core library now
				console.log('Video call initiated from core library')
			},
		async loadComponentStyles() {
			try {
				// For now, just return empty string
				// In production, you would load the actual styles
				return '';
			} catch (error) {
				console.error('Error loading styles:', error);
				return '';
			}
		},


		async initializeChat() {
			try {
				console.log('🚀 Starting chat initialization...')
				console.log('👤 Current user ID:', this.currentUserId)
				
				const user = await chatService.initialize(this.currentUserId)
				console.log('✅ Chat initialized with user:', user)
				
				this.loggedInUserId = user?._id || user?.id || ''
				console.log('🆔 Logged in user ID set to:', this.loggedInUserId)
				
				// Fetch rooms after initialization
				console.log('📥 Fetching rooms after initialization...')
				await this.fetchRooms()
				
				// Load messages for the first room if available
				if (this.rooms && this.rooms.length > 0) {
					console.log('📨 Loading messages for first room...')
					this.roomId = this.rooms[0]._id || this.rooms[0].id
					await this.fetchMessages({ room: this.rooms[0], options: {} })
				}
				
				// Set chatReady after rooms and messages are loaded
				// But only if we have valid rooms
				if (this.rooms && this.rooms.length > 0 && this.loadedRooms.length > 0) {
					this.chatReady = true
					console.log('✅ Chat is ready!')
				} else {
					console.warn('⚠️ No valid rooms loaded, chat not ready')
					// Set chatReady anyway to show empty state
					this.chatReady = true
				}
				
			} catch (error) {
				console.error('❌ Failed to initialize chat:', error)
			}
		},



		setupSocketListeners() {
			chatService.setupSocketListeners({
				onMessageAdded: this.handleMessageAdded.bind(this),
				onMessageEdited: this.handleMessageEdited.bind(this),
				onMessageDeleted: this.handleMessageDeleted.bind(this),
				onRoomAdded: this.handleRoomAdded.bind(this),
				onRoomUpdated: this.handleRoomUpdated.bind(this),
				onRoomRemoved: this.handleRoomRemoved.bind(this),
				onUserStatusChanged: this.handleUserStatusChanged.bind(this),
				onUserStartedTyping: this.handleUserStartedTyping.bind(this),
				onUserStoppedTyping: this.handleUserStoppedTyping.bind(this),
				onMessageReactionAdded: this.handleMessageReactionAdded.bind(this),
				onMessageReactionRemoved: this.handleMessageReactionRemoved.bind(this),
				onWebRTCOffer: this.onWebRTCOffer.bind(this),
				onWebRTCAnswer: this.onWebRTCAnswer.bind(this),
				onWebRTCCandidate: this.onWebRTCCandidate.bind(this),
				onUserStartedVideoCall: this.handleUserStartedVideoCall.bind(this),
				onUserEndedVideoCall: this.handleUserEndedVideoCall.bind(this)
			})
		},

		// Socket event handlers
		handleMessageAdded({ roomId, message }) {
			console.log('📨 Received message from socket:', {
				_id: message._id,
				timestamp: message.timestamp,
				timestamp_type: typeof message.timestamp,
				date: message.date,
				date_type: typeof message.date
			})
			
			if (roomId === this.roomId) {
				const formattedMessage = this.formatMessage(this.selectedRoom, message)
				this.messages.push(formattedMessage)
			}
		},

		handleMessageEdited({ roomId, messageId, newContent }) {
			if (roomId === this.roomId) {
				const message = this.messages.find(m => m._id === messageId)
				if (message) {
					message.content = newContent
					message.edited = true
				}
			}
		},

		handleMessageDeleted({ roomId, messageId }) {
			if (roomId === this.roomId) {
				const index = this.messages.findIndex(m => m._id === messageId)
				if (index !== -1) {
					this.messages.splice(index, 1)
				}
			}
		},

		handleRoomAdded(room) {
			this.rooms.push(room)
			this.roomsLoadedCount++
		},

		handleRoomUpdated({ roomId, lastMessage }) {
			const room = this.rooms.find(r => r._id === roomId)
			if (room) {
				room.lastMessage = lastMessage
				room.index = lastMessage.timestamp
				// Re-sort rooms by last message
				this.rooms.sort((a, b) => (b.index || 0) - (a.index || 0))
			}
		},

		handleRoomRemoved({ roomId }) {
			const index = this.rooms.findIndex(r => r._id === roomId)
			if (index !== -1) {
				this.rooms.splice(index, 1)
				this.roomsLoadedCount--
			}
		},

		handleUserStatusChanged({ userId, status }) {
			this.rooms.forEach(room => {
				const user = room.users.find(u => u._id === userId)
				if (user) {
					user.status = {
						state: status,
						lastChanged: new Date().toISOString()
					}
				}
			})
		},

		handleUserStartedTyping({ roomId, userId }) {
			if (!this.typingUsers[roomId]) {
				this.typingUsers[roomId] = []
			}
			if (!this.typingUsers[roomId].includes(userId)) {
				this.typingUsers[roomId].push(userId)
			}
			this.updateRoomTypingUsers(roomId)
		},

		handleUserStoppedTyping({ roomId, userId }) {
			if (this.typingUsers[roomId]) {
				const index = this.typingUsers[roomId].indexOf(userId)
				if (index !== -1) {
					this.typingUsers[roomId].splice(index, 1)
				}
			}
			this.updateRoomTypingUsers(roomId)
		},

		// --- WebRTC signaling handlers ---
		onWebRTCOffer({ roomId, sdp, fromUserId }) {
			if (roomId !== this.roomId || fromUserId === this.loggedInUserId) return
			// Forward to socket service
			chatService.sendWebRTCAnswer(roomId, sdp, this.loggedInUserId)
		},
		onWebRTCAnswer({ roomId, sdp, fromUserId }) {
			if (roomId !== this.roomId || fromUserId === this.loggedInUserId) return
			// Forward to socket service
			chatService.sendWebRTCAnswer(roomId, sdp, this.loggedInUserId)
		},
		onWebRTCCandidate({ roomId, candidate, fromUserId }) {
			if (roomId !== this.roomId || fromUserId === this.loggedInUserId) return
			// Forward to socket service
			chatService.sendWebRTCCandidate(roomId, candidate, this.loggedInUserId)
		},

		updateRoomTypingUsers(roomId) {
			const room = this.rooms.find(r => r._id === roomId)
			if (room) {
				room.typingUsers = this.typingUsers[roomId] || []
			}
		},

		handleMessageReactionAdded({ roomId, messageId, userId, reaction }) {
			if (roomId === this.roomId) {
				const message = this.messages.find(m => m._id === messageId)
				if (message) {
					if (!message.reactions) message.reactions = {}
					if (!message.reactions[reaction.emoji]) {
						message.reactions[reaction.emoji] = {
							users: [userId],
							reaction: reaction.emoji,
							unicode: reaction.unicode
						}
					} else if (!message.reactions[reaction.emoji].users.includes(userId)) {
						message.reactions[reaction.emoji].users.push(userId)
					}
				}
			}
		},

		handleMessageReactionRemoved({ roomId, messageId, userId, reaction }) {
			if (roomId === this.roomId) {
				const message = this.messages.find(m => m._id === messageId)
				if (message && message.reactions && message.reactions[reaction.emoji]) {
					const index = message.reactions[reaction.emoji].users.indexOf(userId)
					if (index !== -1) {
						message.reactions[reaction.emoji].users.splice(index, 1)
						if (message.reactions[reaction.emoji].users.length === 0) {
							delete message.reactions[reaction.emoji]
						}
					}
				}
			}
		},

		resetRooms() {
			this.loadingRooms = true
			this.loadingLastMessageByRoom = 0
			this.roomsLoadedCount = 0
			this.rooms = []
			this.roomsLoaded = true
			this.startRooms = null
			this.endRooms = null
			this.roomsListeners.forEach(listener => listener())
			this.roomsListeners = []
			this.resetMessages()
		},

		resetMessages() {
			this.messages = []
			this.messagesLoaded = false
			this.lastLoadedMessage = null
			this.previousLastLoadedMessage = null
			this.listeners.forEach(listener => listener())
			this.listeners = []
		},

		async fetchRooms() {
			console.log('🔍 Starting to fetch rooms...')
			this.resetRooms()
			
			try {
				const rooms = await chatService.getRooms(this.roomsPerPage)
				console.log('✅ Fetched rooms successfully:', rooms)
				console.log('📊 Rooms count:', rooms.length)
				
				// Store rooms as-is, loadedRooms computed property will handle mapping
				this.rooms = rooms
				this.roomsLoadedCount = rooms.length
				this.loadingRooms = false
				
				// Force roomsLoaded to true even if no rooms
				this.roomsLoaded = true
				
				console.log('🎯 Rooms state updated:', {
					rooms: this.rooms,
					roomsLoaded: this.roomsLoaded,
					loadingRooms: this.loadingRooms,
					roomsLoadedCount: this.roomsLoadedCount
				})
				
				if (this.rooms.length > 0) {
					this.roomId = this.rooms[0]._id || this.rooms[0].id
					console.log('🏠 First room selected:', this.roomId)
					this.fetchMessages({ room: this.rooms[0], options: {} })
				} else {
					console.log('⚠️ No rooms found')
				}
			} catch (error) {
				console.error('❌ Error fetching rooms:', error)
				this.loadingRooms = false
				this.roomsLoaded = true
			}
		},

		async fetchMoreRooms() {
			if (this.endRooms) return

			try {
				const rooms = await chatService.getRooms(
					this.roomsPerPage,
					this.roomsLoadedCount
				)
				
				if (!rooms.length) {
					this.endRooms = true
					return
				}

				this.rooms.push(...rooms)
				this.roomsLoadedCount += rooms.length
				
				if (rooms.length < this.roomsPerPage) {
					this.endRooms = true
				}
			} catch (error) {
				console.error('Error fetching more rooms:', error)
			}
		},

		async fetchMessages({ room, options = {} }) {
			this.$emit('show-demo-options', false)

			if (options.reset) {
				this.resetMessages()
				this.roomId = (room && (room._id || room.id)) || this.roomId
			}

			this.selectedRoom = room
			this.messagesLoaded = false

			try {
				const selectedRoomId = (room && (room._id || room.id)) || this.roomId
				const messages = await chatService.getMessages(selectedRoomId, {
					limit: this.messagesPerPage,
					lastLoadedMessage: this.lastLoadedMessage
				})

				if (!messages.length) {
					setTimeout(() => {
						this.messagesLoaded = true
					}, 0)
					return
				}

				messages.forEach(message => {
					const formattedMessage = this.formatMessage(room, message)
					this.messages.unshift(formattedMessage)
				})

				if (messages.length < this.messagesPerPage) {
					this.messagesLoaded = true
				}

				this.lastLoadedMessage = messages[messages.length - 1]
			} catch (error) {
				console.error('Error fetching messages:', error)
				this.messagesLoaded = true
			}
		},

		formatMessage(room, message) {
			// Convert timestamp to Date object for parsing
			const messageDate = new Date(message.timestamp)
			
			// Debug logging
			console.log('📝 Formatting message:', {
				original_timestamp: message.timestamp,
				original_date: message.date,
				messageDate: messageDate,
				formatted_date: parseTimestamp(messageDate, 'DD MMMM YYYY'),
				formatted_timestamp: parseTimestamp(messageDate, 'HH:mm')
			})
			
			const formattedMessage = {
				...message,
				date: parseTimestamp(messageDate, 'DD MMMM YYYY'),
				timestamp: parseTimestamp(messageDate, 'HH:mm')
			}

			if (!message.system) {
				formattedMessage.files = this.formatMessageFiles(message.files)
			}

			if (message.reactions) {
				formattedMessage.reactions = message.reactions
			}

			// Ensure message has an id for keys
			if (!formattedMessage._id) {
				formattedMessage._id = message.id || `msg_${message.timestamp || Date.now()}`
			}
			// Ensure sender id shape
			if (!formattedMessage.senderId && message.sender_id) {
				formattedMessage.senderId = message.sender_id
			}
			
			return formattedMessage
		},

		formatMessageFiles(files) {
			if (!files) return []
			
			const toArray = Array.isArray(files) ? files : [{ url: files }]
			return toArray.map(file => {
				const rawUrl = file.url || file.preview || ''
				const absoluteUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : (rawUrl ? `http://localhost:3001${rawUrl}` : '')
				return {
					name: file.name || 'Unknown',
					size: file.size || 0,
					type: file.type || '',
					extension: file.extension || '',
					url: absoluteUrl,
					preview: file.preview ? (file.preview.startsWith('http') ? file.preview : `http://localhost:3001${file.preview}`) : absoluteUrl,
					progress: file.progress || 100,
					audio: file.audio || false
				}
			})
		},

		async sendMessage({ content, roomId, files, replyMessage }) {
			try {
				console.log('📤 Sending message:', { content, roomId, files: files?.length, replyMessage })
				
				// Upload files first if any
				let uploadedFiles = []
				if (files && files.length) {
					console.log('📁 Uploading files before sending message:', files.length)
					
					for (let index = 0; index < files.length; index++) {
						const file = files[index]
						console.log(`📎 Uploading file ${index + 1}/${files.length}:`, file.name)
						
						try {
							const uploadedFile = await chatService.uploadFile(file)
							console.log('✅ File uploaded successfully:', uploadedFile)
							
							uploadedFiles.push({
								name: file.name,
								size: file.size,
								type: file.type,
								extension: file.extension || file.type,
								url: `http://localhost:3001${uploadedFile.url}`,
								preview: `http://localhost:3001${uploadedFile.url}`,
								progress: 100,
								audio: file.audio || false
							})
						} catch (uploadError) {
							console.error(`❌ Error uploading file ${file.name}:`, uploadError)
						}
					}
				}
				
				// Now send message with uploaded files
				const message = await chatService.sendMessage(roomId, {
					content,
					files: uploadedFiles,
					replyMessage
				})
				console.log('✅ Message sent with files:', message)
				
			} catch (error) {
				console.error('❌ Error sending message:', error)
			}
		},

		async editMessage({ messageId, newContent, roomId, files }) {
			try {
				await chatService.editMessage(roomId, messageId, newContent)
			} catch (error) {
				console.error('Error editing message:', error)
			}
		},

		async deleteMessage({ message, roomId }) {
			try {
				await chatService.deleteMessage(roomId, message._id)
			} catch (error) {
				console.error('Error deleting message:', error)
			}
		},

		// Upload file method is no longer needed as files are uploaded before sending message

		openFile({ file }) {
			const targetUrl = file?.file?.url || file?.url
			if (targetUrl) window.open(targetUrl, '_blank')
		},

		openUserTag({ user }) {
			console.log('Open user tag:', user)
		},

		async sendMessageReaction({ messageId, reaction, remove, roomId }) {
			try {
				if (remove) {
					await chatService.removeMessageReaction(roomId, messageId, reaction)
				} else {
					await chatService.addMessageReaction(roomId, messageId, reaction)
				}
			} catch (error) {
				console.error('Error handling message reaction:', error)
			}
		},

		typingMessage({ message, roomId }) {
			chatService.sendTypingIndicator(roomId, message)
		},

		async addRoom(userId) {
			this.disableForm = false
			this.addNewRoom = true
			this.addRoomUsername = ''
			this.inviteRoomId = null
		},

		async createRoom() {
			this.disableForm = true

			try {
				const user = await chatService.getUserByUsername(this.addRoomUsername)
				// Don't pass username as room name - let server generate it from participants
				const room = await chatService.createRoom([user._id])
				
				this.addNewRoom = false
				this.addRoomUsername = ''
				this.disableForm = false
				this.fetchRooms()
			} catch (error) {
				console.error('Error creating room:', error)
				alert('User not found or error creating room')
				this.disableForm = false
			}
		},

		async inviteUser(roomId) {
			this.inviteRoomId = roomId
			this.invitedUsername = ''
			this.addNewRoom = false
		},

		async addRoomUser() {
			this.disableForm = true

			try {
				await chatService.addUserToRoom(this.inviteRoomId, this.invitedUsername)
				this.inviteRoomId = null
				this.invitedUsername = ''
				this.fetchRooms()
			} catch (error) {
				console.error('Error adding user to room:', error)
			}

			this.disableForm = false
		},

		async removeUser(roomId) {
			this.removeRoomId = roomId
			this.removeUserId = ''
			this.removeUsers = this.rooms.find(room => room._id === roomId).users
		},

		async deleteRoomUser() {
			this.disableForm = true

			try {
				await chatService.removeUserFromRoom(this.removeRoomId, this.removeUserId)
				this.removeRoomId = null
				this.removeUserId = ''
				this.fetchRooms()
			} catch (error) {
				console.error('Error removing user from room:', error)
			}

			this.disableForm = false
		},

		async deleteRoom(roomId) {
			try {
				await chatService.deleteRoom(roomId)
				this.fetchRooms()
			} catch (error) {
				console.error('Error deleting room:', error)
			}
		},

		async menuActionHandler({ action, roomId }) {
			switch (action.name) {
				case 'inviteUser':
					return this.inviteUser(roomId)
				case 'removeUser':
					return this.removeUser(roomId)
				case 'deleteRoom':
					return this.deleteRoom(roomId)
			}
		},

		async messageSelectionActionHandler({ action, messages, roomId }) {
			switch (action.name) {
				case 'deleteMessages':
					for (const message of messages) {
						await this.deleteMessage({ message, roomId })
					}
			}
		},

		async fetchAllUsers() {
			try {
				const users = await chatService.getAllUsers()
				this.allUsers = users
			} catch (error) {
				console.error('Error fetching users:', error)
			}
		},

		// --- WebRTC signaling handlers ---
		onWebRTCOffer(data) {
			console.log('WebRTC Offer received:', data)
			// Forward to socket service
			chatService.sendWebRTCOffer(data.roomId, data.sdp, this.loggedInUserId)
		},

		onWebRTCAnswer(data) {
			console.log('WebRTC Answer received:', data)
			// Forward to socket service
			chatService.sendWebRTCAnswer(data.roomId, data.sdp, this.loggedInUserId)
		},

		onWebRTCCandidate(data) {
			console.log('WebRTC Candidate received:', data)
			// Forward to socket service
			chatService.sendWebRTCCandidate(data.roomId, data.candidate, this.loggedInUserId)
		},

		// Video call methods
		startVideoCall(event) {
			console.log('Starting video call for room:', event.roomId)
			this.showVideoCall = true
			
			// Notify other participants in the room
			chatService.emit('start-video-call', { 
				roomId: event.roomId,
				userId: this.internalCurrentUserId
			})
		},

		endVideoCall() {
			console.log('Ending video call')
			this.showVideoCall = false
			
			// Notify other participants
			if (this.roomId) {
				chatService.emit('end-video-call', {
					roomId: this.roomId,
					userId: this.internalCurrentUserId
				})
			}
		},

		handleUserStartedVideoCall({ roomId, userId }) {
			if (roomId === this.roomId && userId !== this.internalCurrentUserId) {
				console.log(`User ${userId} started video call`)
				// You can show a notification or auto-join the call
				// For now, we'll just log it
			}
		},

		handleUserEndedVideoCall({ roomId, userId }) {
			if (roomId === this.roomId && userId !== this.internalCurrentUserId) {
				console.log(`User ${userId} ended video call`)
				// Handle user leaving the call
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.window-container {
	width: 100%;
}

.window-mobile {
	form {
		padding: 0 20px 20px;
	}
}

form {
	display: flex;
	align-items: center;
	justify-content: center;
	padding-bottom: 20px;

	input {
		padding: 5px 10px;
		margin-right: 5px;
		border: 1px solid #e0e2e4;
		border-radius: 4px;
		outline: 0;
	}

	button {
		background: #1976d2;
		color: white;
		border-radius: 4px;
		padding: 5px 10px;
		cursor: pointer;
		border: none;
		outline: 0;
		font-weight: 500;

		&:hover {
			opacity: 0.8;
		}

		&:active {
			opacity: 0.6;
		}

		&:disabled {
			cursor: initial;
			background: #c6c9cc;
			opacity: 0.6;
		}
	}

	.button-cancel {
		margin-left: 5px;
		background: #e0e2e4;
		color: #696a6c;
	}
}
</style>