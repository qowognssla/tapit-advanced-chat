<template>
	<div class="vac-card-window" :style="[{ height }, cssVars]">
		<div class="vac-chat-container">
			<rooms-list
				v-if="!singleRoomCasted"
				:current-user-id="currentUserId"
				:rooms="orderedRooms"
				:loading-rooms="loadingRoomsCasted"
				:rooms-loaded="roomsLoadedCasted"
				:room="room"
				:room-actions="roomActionsCasted"
				:custom-search-room-enabled="customSearchRoomEnabled"
				:text-messages="t"
				:show-search="showSearchCasted"
				:show-add-room="showAddRoomCasted"
				:show-rooms-list="showRoomsList && roomsListOpenedCasted"
				:text-formatting="textFormattingCasted"
				:link-options="linkOptionsCasted"
				:is-mobile="isMobile"
				:scroll-distance="scrollDistance"
				@fetch-room="fetchRoom"
				@fetch-more-rooms="fetchMoreRooms"
				@loading-more-rooms="loadingMoreRooms = $event"
				@add-room="addRoom"
				@search-room="searchRoom"
				@room-action-handler="roomActionHandler"
			>
				<template v-for="el in slots" #[el.slot]="data">
					<slot :name="el.slot" v-bind="data" />
				</template>
			</rooms-list>

				<room
				:current-user-id="currentUserId"
				:rooms="roomsCasted"
				:room-id="room.roomId || ''"
				:load-first-room="loadFirstRoomCasted"
				:messages="messagesCasted"
				:room-message="roomMessage"
				:messages-loaded="messagesLoadedCasted"
				:menu-actions="menuActionsCasted"
				:message-actions="messageActionsCasted"
				:message-selection-actions="messageSelectionActionsCasted"
				:auto-scroll="autoScrollCasted"
				:show-send-icon="showSendIconCasted"
				:show-files="showFilesCasted"
				:show-audio="showAudioCasted"
				:audio-bit-rate="audioBitRate"
				:audio-sample-rate="audioSampleRate"
				:show-emojis="showEmojisCasted"
				:show-reaction-emojis="showReactionEmojisCasted"
				:show-new-messages-divider="showNewMessagesDividerCasted"
				:show-footer="showFooterCasted"
				:show-video-call="showVideoCallCasted"
				:text-messages="t"
				:single-room="singleRoomCasted"
				:show-rooms-list="showRoomsList && roomsListOpenedCasted"
				:text-formatting="textFormattingCasted"
				:link-options="linkOptionsCasted"
				:is-mobile="isMobile"
				:loading-rooms="loadingRoomsCasted"
				:room-info-enabled="roomInfoEnabledCasted"
				:textarea-auto-focus="textareaAutoFocusCasted"
				:user-tags-enabled="userTagsEnabledCasted"
				:emojis-suggestion-enabled="emojisSuggestionEnabledCasted"
				:scroll-distance="scrollDistance"
				:accepted-files="acceptedFiles"
				:capture-files="captureFiles"
				:multiple-files="multipleFilesCasted"
				:templates-text="templatesTextCasted"
				:username-options="usernameOptionsCasted"
				:emoji-data-source="emojiDataSource"
				@toggle-rooms-list="toggleRoomsList"
				@room-info="roomInfo"
				@fetch-messages="fetchMessages"
				@send-message="sendMessage"
				@edit-message="editMessage"
				@delete-message="deleteMessage"
				@open-file="openFile"
				@open-user-tag="openUserTag"
				@open-failed-message="openFailedMessage"
				@menu-action-handler="menuActionHandler"
				@message-action-handler="messageActionHandler"
				@message-selection-action-handler="messageSelectionActionHandler"
				@send-message-reaction="sendMessageReaction"
				@typing-message="typingMessage"
				@textarea-action-handler="textareaActionHandler"
				@start-video-call="handleStartVideoCall"
			>
				<template v-for="el in slots" #[el.slot]="data">
					<slot :name="el.slot" v-bind="data" />
				</template>
			</room>
			</div>
			<call-prompt
				v-if="callPrompt && callPrompt.visible"
				v-bind="callPrompt"
				@confirm="handleCallPromptConfirm"
				@cancel="handleCallPromptCancel"
			/>
		<transition name="vac-fade-preview" appear>
			<media-preview
				v-if="showMediaPreview"
				:file="previewFile"
				@close-media-preview="showMediaPreview = false"
			>
				<template v-for="el in slots" #[el.slot]="data">
					<slot :name="el.slot" v-bind="data" />
				</template>
			</media-preview>
		</transition>

		<video-call
			v-if="showVideoCall"
			ref="videoCall"
			:visible="showVideoCall"
			:room-id="room.roomId"
			:current-user-id="currentUserId"
			:initiator-id="activeCall.initiatorId"
			:call-id="activeCall.callId"
			@close="handleVideoCallClose"
			@webrtc-offer="handleWebRTCOffer"
			@webrtc-answer="handleWebRTCAnswer"
			@webrtc-candidate="handleWebRTCCandidate"
		/>
	</div>
</template>

<script>
import RoomsList from './RoomsList/RoomsList'
import Room from './Room/Room'
import MediaPreview from './MediaPreview/MediaPreview'
import VideoCall from './components/VideoCall/VideoCall'
import CallPrompt from './components/VideoCall/CallPrompt'

import locales from '../locales'
import { defaultThemeStyles, cssThemeVars } from '../themes'
import {
	roomsValidation,
	partcipantsValidation
} from '../utils/data-validation'

export default {
	name: 'ChatContainer',
	components: {
		RoomsList,
		Room,
		MediaPreview,
		VideoCall,
		CallPrompt
	},

	props: {
		height: { type: String, default: '600px' },
		theme: { type: String, default: 'light' },
		styles: { type: [Object, String], default: () => ({}) },
		responsiveBreakpoint: { type: Number, default: 900 },
		singleRoom: { type: [Boolean, String], default: false },
		roomsListOpened: { type: [Boolean, String], default: true },
		textMessages: { type: [Object, String], default: () => ({}) },
		currentUserId: { type: String, default: '' },
		rooms: { type: [Array, String], default: () => [] },
		roomsOrder: { type: String, default: 'desc' },
		loadingRooms: { type: [Boolean, String], default: false },
		roomsLoaded: { type: [Boolean, String], default: false },
		roomId: { type: String, default: null },
		loadFirstRoom: { type: [Boolean, String], default: true },
		messages: { type: [Array, String], default: () => [] },
		messagesLoaded: { type: [Boolean, String], default: false },
		roomActions: { type: [Array, String], default: () => [] },
		menuActions: { type: [Array, String], default: () => [] },
		messageActions: {
			type: [Array, String],
			default: () => [
				{ name: 'replyMessage', title: 'Reply' },
				{ name: 'editMessage', title: 'Edit Message', onlyMe: true },
				{ name: 'deleteMessage', title: 'Delete Message', onlyMe: true },
				{ name: 'selectMessages', title: 'Select' }
			]
		},
		messageSelectionActions: { type: [Array, String], default: () => [] },
		autoScroll: {
			type: [Object, String],
			default: () => {
				return {
					send: {
						new: true,
						newAfterScrollUp: true
					},
					receive: {
						new: true,
						newAfterScrollUp: false
					}
				}
			}
		},
		customSearchRoomEnabled: { type: [Boolean, String], default: false },
		showSearch: { type: [Boolean, String], default: true },
		showAddRoom: { type: [Boolean, String], default: true },
		showSendIcon: { type: [Boolean, String], default: true },
		showFiles: { type: [Boolean, String], default: true },
		showAudio: { type: [Boolean, String], default: true },
		audioBitRate: { type: Number, default: 128 },
		audioSampleRate: { type: Number, default: new (window.AudioContext || window.webkitAudioContext)().sampleRate },
		showEmojis: { type: [Boolean, String], default: true },
		showReactionEmojis: { type: [Boolean, String], default: true },
		showNewMessagesDivider: { type: [Boolean, String], default: true },
		showFooter: { type: [Boolean, String], default: true },
		showVideoCall: { type: [Boolean, String], default: true },
		textFormatting: {
			type: [Object, String],
			default: () => ({
				disabled: false
			})
		},
		linkOptions: {
			type: [Object, String],
			default: () => ({ disabled: false, target: '_blank', rel: null })
		},
		roomInfoEnabled: { type: [Boolean, String], default: false },
		textareaAutoFocus: { type: [Boolean, String], default: true },
		userTagsEnabled: { type: [Boolean, String], default: true },
		emojisSuggestionEnabled: { type: [Boolean, String], default: true },
		roomMessage: { type: String, default: '' },
		scrollDistance: { type: Number, default: 60 },
		acceptedFiles: { type: String, default: '*' },
		captureFiles: { type: String, default: '' },
		multipleFiles: { type: [Boolean, String], default: true },
		templatesText: { type: [Array, String], default: () => [] },
		mediaPreviewEnabled: { type: [Boolean, String], default: true },
		usernameOptions: {
			type: [Object, String],
			default: () => ({ minUsers: 3, currentUser: false })
		},
		emojiDataSource: { type: String, default: undefined }
	},

	emits: [
		'toggle-rooms-list',
		'room-info',
		'fetch-messages',
		'send-message',
		'edit-message',
		'delete-message',
		'open-file',
		'open-user-tag',
		'open-failed-message',
		'menu-action-handler',
		'message-action-handler',
		'send-message-reaction',
		'typing-message',
		'textarea-action-handler',
		'fetch-more-rooms',
		'add-room',
		'webrtc-offer',
		'webrtc-answer',
		'webrtc-candidate',
		'search-room',
		'room-action-handler',
		'message-selection-action-handler',
		'start-video-call',
		'end-video-call'
	],

	expose: [
		'handleStartVideoCall',
		'handleVideoCallClose',
		'receiveRemoteOffer',
		'receiveRemoteAnswer',
		'receiveRemoteCandidate',
		'acceptIncomingCall',
		'declineIncomingCall'
	],

	data() {
		return {
			slots: [],
			room: {},
			loadingMoreRooms: false,
			showRoomsList: true,
			isMobile: false,
			showMediaPreview: false,
			previewFile: {},
			showVideoCall: false,
			activeCall: {
				callId: null,
				initiatorId: null,
				roomId: null
			},
			incomingCall: null,
			pendingCallRequest: null,
			callPrompt: null
		}
	},

	computed: {
		t() {
			return {
				...locales,
				...this.textMessagesCasted
			}
		},
		cssVars() {
			const defaultStyles = defaultThemeStyles[this.theme]
			const customStyles = {}

			Object.keys(defaultStyles).map(key => {
				customStyles[key] = {
					...defaultStyles[key],
					...(this.stylesCasted[key] || {})
				}
			})

			return cssThemeVars(customStyles)
		},
		orderedRooms() {
			return this.roomsCasted.slice().sort((a, b) => {
				const aVal = a.index || 0
				const bVal = b.index || 0

				if (this.roomsOrder === 'asc') {
					return aVal < bVal ? -1 : bVal < aVal ? 1 : 0
				}

				return aVal > bVal ? -1 : bVal > aVal ? 1 : 0
			})
		},
		singleRoomCasted() {
			return this.castBoolean(this.singleRoom)
		},
		roomsListOpenedCasted() {
			return this.castBoolean(this.roomsListOpened)
		},
		loadingRoomsCasted() {
			return this.castBoolean(this.loadingRooms)
		},
		roomsLoadedCasted() {
			return this.castBoolean(this.roomsLoaded)
		},
		loadFirstRoomCasted() {
			return this.castBoolean(this.loadFirstRoom)
		},
		messagesLoadedCasted() {
			return this.castBoolean(this.messagesLoaded)
		},
		multipleFilesCasted() {
			return this.castBoolean(this.multipleFiles)
		},
		showSearchCasted() {
			return this.castBoolean(this.showSearch)
		},
		showAddRoomCasted() {
			return this.castBoolean(this.showAddRoom)
		},
		showSendIconCasted() {
			return this.castBoolean(this.showSendIcon)
		},
		showFilesCasted() {
			return this.castBoolean(this.showFiles)
		},
		showAudioCasted() {
			return this.castBoolean(this.showAudio)
		},
		showEmojisCasted() {
			return this.castBoolean(this.showEmojis)
		},
		showReactionEmojisCasted() {
			return this.castBoolean(this.showReactionEmojis)
		},
		showNewMessagesDividerCasted() {
			return this.castBoolean(this.showNewMessagesDivider)
		},
		showFooterCasted() {
			return this.castBoolean(this.showFooter)
		},
		showVideoCallCasted() {
			return this.castBoolean(this.showVideoCall)
		},
		roomInfoEnabledCasted() {
			return this.castBoolean(this.roomInfoEnabled)
		},
		textareaAutoFocusCasted() {
			return this.castBoolean(this.textareaAutoFocus)
		},
		userTagsEnabledCasted() {
			return this.castBoolean(this.userTagsEnabled)
		},
		emojisSuggestionEnabledCasted() {
			return this.castBoolean(this.emojisSuggestionEnabled)
		},
		mediaPreviewEnabledCasted() {
			return this.castBoolean(this.mediaPreviewEnabled)
		},
		roomsCasted() {
			return this.castArray(this.rooms)
		},
		messagesCasted() {
			return this.castArray(this.messages)
		},
		roomActionsCasted() {
			return this.castArray(this.roomActions)
		},
		menuActionsCasted() {
			return this.castArray(this.menuActions)
		},
		messageActionsCasted() {
			return this.castArray(this.messageActions)
		},
		messageSelectionActionsCasted() {
			return this.castArray(this.messageSelectionActions)
		},
		templatesTextCasted() {
			return this.castArray(this.templatesText)
		},
		stylesCasted() {
			return this.castObject(this.styles)
		},
		textMessagesCasted() {
			return this.castObject(this.textMessages)
		},
		autoScrollCasted() {
			return this.castObject(this.autoScroll)
		},
		textFormattingCasted() {
			return this.castObject(this.textFormatting)
		},
		linkOptionsCasted() {
			return this.castObject(this.linkOptions)
		},
		usernameOptionsCasted() {
			return this.castObject(this.usernameOptions)
		}
	},

	watch: {
		roomsCasted: {
			immediate: true,
			deep: true,
			handler(newVal, oldVal) {
				if (
					!newVal[0] ||
					!newVal.find(room => room.roomId === this.room.roomId)
				) {
					this.showRoomsList = true
				}

				if (
					!this.loadingMoreRooms &&
					this.loadFirstRoomCasted &&
					newVal[0] &&
					(!oldVal || newVal.length !== oldVal.length)
				) {
					if (this.roomId) {
						const room = newVal.find(r => r.roomId === this.roomId) || {}
						this.fetchRoom({ room })
					} else if (!this.isMobile || this.singleRoomCasted) {
						this.fetchRoom({ room: this.orderedRooms[0] })
					} else {
						this.showRoomsList = true
					}
				}
			}
		},

		loadingRoomsCasted(val) {
			if (val) this.room = {}
		},

		roomId: {
			immediate: true,
			handler(newVal, oldVal) {
				if (newVal && !this.loadingRoomsCasted && this.roomsCasted.length) {
					const room = this.roomsCasted.find(r => r.roomId === newVal)
					this.fetchRoom({ room })
				} else if (oldVal && !newVal) {
					this.room = {}
				}
			}
		},

		room(val) {
			if (!val || Object.entries(val).length === 0) return

			roomsValidation(val)

			val.users.forEach(user => {
				partcipantsValidation(user)
			})
		},

		roomsListOpenedCasted: {
			immediate: true,
			handler(val) {
				this.showRoomsList = val
			}
		}
	},

	created() {
		this.updateResponsive()
		window.addEventListener('resize', ev => {
			if (ev.isTrusted) this.updateResponsive()
		})
	},

	updated() {
		const slots = document.querySelectorAll('[slot]')
		if (this.slots.length !== slots.length) {
			this.slots = slots
		}
	},

	methods: {
		castBoolean(val) {
			return val === 'true' || val === true
		},
		castArray(val) {
			return !val ? [] : Array.isArray(val) ? val : JSON.parse(val)
		},
		castObject(val) {
			return !val ? {} : typeof val === 'object' ? val : JSON.parse(val)
		},
		updateResponsive() {
			this.isMobile = window.innerWidth < Number(this.responsiveBreakpoint)
		},
		toggleRoomsList() {
			this.showRoomsList = !this.showRoomsList
			if (this.isMobile) this.room = {}
			this.$emit('toggle-rooms-list', { opened: this.showRoomsList })
		},
		fetchRoom({ room }) {
			this.room = room
			this.fetchMessages({ reset: true })
			if (this.isMobile) this.showRoomsList = false
		},
		fetchMoreRooms() {
			this.$emit('fetch-more-rooms')
		},
		roomInfo() {
			this.$emit('room-info', this.room)
		},
		addRoom() {
			this.$emit('add-room')
		},
		searchRoom(val) {
			this.$emit('search-room', { value: val, roomId: this.room.roomId })
		},
		fetchMessages(options) {
			this.$emit('fetch-messages', { room: this.room, options })
		},
		sendMessage(message) {
			this.$emit('send-message', { ...message, roomId: this.room.roomId })
		},
		editMessage(message) {
			this.$emit('edit-message', { ...message, roomId: this.room.roomId })
		},
		deleteMessage(message) {
			this.$emit('delete-message', { message, roomId: this.room.roomId })
		},
		openFile({ message, file }) {
			if (this.mediaPreviewEnabledCasted && file.action === 'preview') {
				this.previewFile = file.file
				this.showMediaPreview = true
			} else {
				this.$emit('open-file', { message, file })
			}
		},
		openUserTag({ user }) {
			this.$emit('open-user-tag', { user })
		},
		openFailedMessage({ message }) {
			this.$emit('open-failed-message', {
				message,
				roomId: this.room.roomId
			})
		},
		menuActionHandler(ev) {
			this.$emit('menu-action-handler', {
				action: ev,
				roomId: this.room.roomId
			})
		},
		roomActionHandler({ action, roomId }) {
			this.$emit('room-action-handler', {
				action,
				roomId
			})
		},
		messageActionHandler(ev) {
			this.$emit('message-action-handler', {
				...ev,
				roomId: this.room.roomId
			})
		},
		messageSelectionActionHandler(ev) {
			this.$emit('message-selection-action-handler', {
				...ev,
				roomId: this.room.roomId
			})
		},
		sendMessageReaction(messageReaction) {
			this.$emit('send-message-reaction', {
				...messageReaction,
				roomId: this.room.roomId
			})
		},
		typingMessage(message) {
			this.$emit('typing-message', {
				message,
				roomId: this.room.roomId
			})
		},
		textareaActionHandler(message) {
			this.$emit('textarea-action-handler', {
				message,
				roomId: this.room.roomId
			})
		},
		handleStartVideoCall(payload = {}) {
			const { suppressEmit = false, confirmed = false, ...rest } = payload
			const roomId = rest.roomId || this.room.roomId
			if (!roomId) return

			const action = rest.action || 'request'
			const initiatorId = rest.initiatorId || this.currentUserId || null

			if (action === 'request' && !confirmed) {
				this.pendingCallRequest = {
					roomId,
					initiatorId,
					timestamp: rest.timestamp || new Date().toISOString()
				}

				this.callPrompt = {
					visible: true,
					mode: 'outgoing',
					title: this.t.VIDEO_CALL_TITLE_OUTGOING || 'Start a video call?',
					message: this.t.VIDEO_CALL_START_CONFIRM || 'Start a video call?',
					username: this.room?.roomName || '',
					roomName: this.room?.users?.length > 1 ? (this.room.roomName || '') : '',
					avatar: this.lookupUserAvatar(initiatorId) || '',
					confirmText: this.t.VIDEO_CALL_START || 'Start Call',
					cancelText: this.t.CANCEL_SELECT_MESSAGE || 'Cancel'
				}
				return
			}

			const callId = rest.callId || `call_${Date.now()}_${Math.random()
				.toString(36)
				.slice(2, 10)}`

			this.activeCall = {
				callId,
				initiatorId,
				roomId
			}
			this.pendingCallRequest = null

			this.showVideoCall = true

			this.$nextTick(() => {
				if (this.$refs.videoCall && this.$refs.videoCall.startCall) {
					this.$refs.videoCall.startCall({
						callId,
						roomId,
						initiatorId
					})
				}
			})

			if (!suppressEmit) {
				const eventPayload = {
					...rest,
					callId,
					initiatorId,
					roomId,
					action
				}

				if (!eventPayload.notification) {
					eventPayload.notification = {
						type: action === 'accept' ? 'video-call-accept' : 'video-call-request',
						callId,
						message:
							action === 'accept'
								? this.t.VIDEO_CALL_ACCEPTED || '비디오 통화를 수락했습니다.'
								: this.t.VIDEO_CALL_REQUEST || 'Video call request'
					}
				}

				this.$emit('start-video-call', eventPayload)
			}
		},
		lookupUserName(userId) {
			if (!userId || !this.room?.users) return ''
			const user = this.room.users.find(u => String(u._id) === String(userId))
			return user?.username || ''
		},
		lookupUserAvatar(userId) {
			if (!userId || !this.room?.users) return ''
			const user = this.room.users.find(u => String(u._id) === String(userId))
			return user?.avatar || ''
		},
		confirmOutgoingCall() {
			if (!this.pendingCallRequest) return

			const payload = {
				...this.pendingCallRequest,
				action: 'request',
				confirmed: true
			}

			this.pendingCallRequest = null
			this.handleStartVideoCall(payload)
		},
		handleCallPromptConfirm() {
			if (!this.callPrompt) return
			const mode = this.callPrompt.mode
			this.callPrompt = null

			if (mode === 'outgoing') {
				this.confirmOutgoingCall()
			} else if (mode === 'incoming') {
				this.acceptIncomingCall()
			}
		},
		handleCallPromptCancel() {
			if (!this.callPrompt) return
			const mode = this.callPrompt.mode
			this.callPrompt = null

			if (mode === 'outgoing') {
				this.pendingCallRequest = null
			} else if (mode === 'incoming') {
				this.declineIncomingCall()
			}
		},
		handleVideoCallClose(reason = 'ended') {
			const payload = {
				roomId: this.activeCall.roomId || this.room.roomId,
				callId: this.activeCall.callId,
				initiatorId: this.activeCall.initiatorId,
				reason
			}

			if (this.$refs.videoCall && this.$refs.videoCall.cleanup) {
				this.$refs.videoCall.cleanup()
			}

			this.showVideoCall = false
			this.activeCall = { callId: null, initiatorId: null, roomId: null }
			this.incomingCall = null
			this.pendingCallRequest = null
			this.callPrompt = null

			this.$emit('end-video-call', payload)
		},
		receiveRemoteOffer(data = {}) {
			if (!data) return

			this.incomingCall = {
				...data,
				receivedAt: Date.now(),
				queuedCandidates: []
			}

			if (data.autoAccept) {
				this.acceptIncomingCall()
				return
			}

			const callerName =
				data.fromUserName ||
				data.username ||
				this.lookupUserName(data.fromUserId)
			const callerAvatar = data.avatar || this.lookupUserAvatar(data.fromUserId)

			this.callPrompt = {
				visible: true,
				mode: 'incoming',
				title: this.t.VIDEO_CALL_TITLE_INCOMING || 'Incoming video call',
				message: this.t.VIDEO_CALL_REQUEST || 'Incoming video call',
				username: callerName || '',
				roomName: this.room?.roomName || '',
				avatar: callerAvatar || '',
				confirmText: this.t.VIDEO_CALL_ACCEPT || 'Accept',
				cancelText: this.t.VIDEO_CALL_DECLINE || 'Decline'
			}
		},
		receiveRemoteAnswer(data = {}) {
			if (this.$refs.videoCall && this.$refs.videoCall.handleRemoteAnswer) {
				this.$refs.videoCall.handleRemoteAnswer(data)
			}
		},
		receiveRemoteCandidate(data = {}) {
			if (this.showVideoCall && this.$refs.videoCall && this.$refs.videoCall.handleRemoteCandidate) {
				this.$refs.videoCall.handleRemoteCandidate(data)
				return
			}

			if (
				this.incomingCall &&
				this.incomingCall.callId &&
				data.callId === this.incomingCall.callId
			) {
				this.incomingCall.queuedCandidates = this.incomingCall.queuedCandidates || []
				this.incomingCall.queuedCandidates.push(data)
			}
		},
		acceptIncomingCall() {
			if (!this.incomingCall) return

			const offerData = { ...this.incomingCall }
			this.incomingCall = null
			this.callPrompt = null

			const notification = {
				type: 'video-call-accept',
				callId: offerData.callId,
				message: this.t.VIDEO_CALL_ACCEPTED || '비디오 통화를 수락했습니다.'
			}

			this.handleStartVideoCall({
				roomId: offerData.roomId,
				callId: offerData.callId,
				initiatorId: offerData.fromUserId,
				action: 'accept',
				notification
			})

			this.$nextTick(() => {
				if (this.$refs.videoCall && this.$refs.videoCall.handleRemoteOffer) {
					this.$refs.videoCall.handleRemoteOffer(offerData)
					if (offerData.queuedCandidates && offerData.queuedCandidates.length) {
						offerData.queuedCandidates.forEach(candidate => {
							this.$refs.videoCall.handleRemoteCandidate(candidate)
						})
					}
				}
			})
		},
		declineIncomingCall() {
			if (!this.incomingCall) return

			const declineData = { ...this.incomingCall }
			this.incomingCall = null
			this.callPrompt = null

			this.$emit('end-video-call', {
				roomId: declineData.roomId,
				callId: declineData.callId,
				initiatorId: declineData.fromUserId,
				reason: 'declined',
				notification: {
					type: 'video-call-decline',
					callId: declineData.callId,
					message: this.t.VIDEO_CALL_DECLINED || '비디오 통화를 거절했습니다.'
				}
			})
		},
		handleWebRTCOffer(data) {
			this.$emit('webrtc-offer', data)
		},
		handleWebRTCAnswer(data) {
			this.$emit('webrtc-answer', data)
		},
		handleWebRTCCandidate(data) {
			this.$emit('webrtc-candidate', data)
		}
	}
}
</script>

<style lang="scss">
@import '../styles/index.scss';
</style>
