<template>
	<div class="window-container" :class="{ 'window-mobile': isDevice }">
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

		<vue-advanced-chat
			ref="chatWindow"
			:height="screenHeight"
			:theme="theme"
			:styles="JSON.stringify(styles)"
			:current-user-id="currentUserId"
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
			@toggle-rooms-list="$emit('show-demo-options', $event.detail[0].opened)"
		>
		</vue-advanced-chat>
	</div>
</template>

<script>
import chatService from '@/services/chatService'
import { parseTimestamp, formatTimestamp } from '@/utils/dates'

import { register } from 'vue-advanced-chat'
register()

export default {
	props: {
		currentUserId: { type: String, required: true },
		theme: { type: String, required: true },
		isDevice: { type: Boolean, required: true }
	},

	emits: ['show-demo-options'],

	data() {
		return {
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
			typingUsers: {}
		}
	},

	computed: {
		loadedRooms() {
			const loadedRaw = this.rooms.slice(0, this.roomsLoadedCount)
			// Map server rooms (using _id/id) to component rooms (using roomId)
			const mapped = loadedRaw.map(r => ({
				roomId: r._id || r.id,
				roomName: r.roomName,
				avatar: r.avatar,
				users: (r.users || []).map(u => ({
					_id: u._id || u.id,
					username: u.username,
					avatar: u.avatar,
					status: u.status
				})),
				unreadCount: r.unreadCount || 0,
				typingUsers: r.typingUsers || [],
				index: r.index ?? r.lastUpdated ?? r.lastMessage?.timestamp ?? 0,
				lastMessage: r.lastMessage ? { ...r.lastMessage } : null
			}))
			console.log('Loaded rooms for vue-advanced-chat (mapped):', mapped)
			return mapped
		},
		screenHeight() {
			return this.isDevice ? window.innerHeight + 'px' : 'calc(100vh - 80px)'
		}
	},

	async mounted() {
		console.log('ChatContainer mounted')
		console.log('ChatWindow ref:', this.$refs.chatWindow)
		
		await this.initializeChat()
		this.setupSocketListeners()
		this.fetchRooms()
		this.fetchAllUsers()
		
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
				const user = await chatService.initialize(this.currentUserId)
				console.log('Chat initialized with user:', user)
			} catch (error) {
				console.error('Failed to initialize chat:', error)
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
				onMessageReactionRemoved: this.handleMessageReactionRemoved.bind(this)
			})
		},

		// Socket event handlers
		handleMessageAdded({ roomId, message }) {
			if (roomId === this.roomId) {
				this.messages.push(message)
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
			this.resetRooms()
			
			try {
				const rooms = await chatService.getRooms(this.roomsPerPage)
				console.log('Fetched rooms:', rooms)
				
				this.rooms = rooms
				this.roomsLoadedCount = rooms.length
				this.loadingRooms = false
				
				// Force roomsLoaded to true even if no rooms
				this.roomsLoaded = true
				
				if (this.rooms.length > 0) {
					this.roomId = this.rooms[0]._id || this.rooms[0].id || this.rooms[0].roomId
					this.fetchMessages({ room: this.rooms[0], options: {} })
				}
			} catch (error) {
				console.error('Error fetching rooms:', error)
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
				this.roomId = (room && (room._id || room.id || room.roomId)) || this.roomId
			}

			this.selectedRoom = room
			this.messagesLoaded = false

			try {
				const selectedRoomId = (room && (room._id || room.id || room.roomId)) || this.roomId
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
			const formattedMessage = {
				...message,
				date: parseTimestamp(message.timestamp, message.date)
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
				const message = await chatService.sendMessage(roomId, {
					content,
					files,
					replyMessage
				})

				if (files && files.length) {
					message.files = []
					
					for (let index = 0; index < files.length; index++) {
						const file = files[index]
						await this.uploadFile({ file, messageId: message._id, roomId })
					}
				}
			} catch (error) {
				console.error('Error sending message:', error)
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

		async uploadFile({ file, messageId, roomId }) {
			try {
				const uploadedFile = await chatService.uploadFile(file)
				
				const message = this.messages.find(m => m._id === messageId)
				if (message) {
					if (!message.files) message.files = []
					message.files.push({
						name: file.name,
						size: file.size,
						type: file.type,
						extension: file.extension || file.type,
						url: `http://localhost:3001${uploadedFile.url}`,
						preview: `http://localhost:3001${uploadedFile.url}`,
						progress: 100
					})
				}
			} catch (error) {
				console.error('Error uploading file:', error)
			}
		},

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