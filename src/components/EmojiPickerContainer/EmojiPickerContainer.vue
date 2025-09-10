<template>
	<div class="vac-emoji-wrapper">
		<div
			class="vac-svg-button"
			:class="{ 'vac-emoji-reaction': emojiReaction }"
			@click="openEmoji"
		>
			<slot
				:name="
					messageId
						? 'emoji-picker-reaction-icon_' + messageId
						: 'emoji-picker-icon'
				"
			>
				<svg-icon name="emoji" :param="emojiReaction ? 'reaction' : ''" />
			</slot>
		</div>

		<template v-if="emojiOpened">
			<transition name="vac-slide-up" appear>
				<div
					class="vac-emoji-picker"
					:class="{ 'vac-picker-reaction': emojiReaction }"
					:style="{
						height: `${emojiPickerHeight}px`,
						top: positionTop ? emojiPickerHeight : `${emojiPickerTop}px`,
						right: emojiPickerRight,
						display: emojiPickerTop || !emojiReaction ? 'initial' : 'none'
					}"
				>
					<emoji-picker
						v-if="shouldRenderEmojiPicker"
						ref="emojiPicker"
						:data-source="emojiDataSource"
					/>
				</div>
			</transition>
		</template>
	</div>
</template>

<script>
import SvgIcon from '../SvgIcon/SvgIcon'
import { findParentBySelector } from '../../utils/element-selector'

export default {
	name: 'EmojiPickerContainer',
	components: {
		SvgIcon
	},

	props: {
		emojiOpened: { type: Boolean, default: false },
		emojiReaction: { type: Boolean, default: false },
		positionTop: { type: Boolean, default: false },
		positionRight: { type: Boolean, default: false },
		messageId: { type: String, default: '' },
		emojiDataSource: { type: String, default: undefined }
	},

	emits: ['add-emoji', 'open-emoji'],

	data() {
		return {
			emojiPickerHeight: 320,
			emojiPickerTop: 0,
			emojiPickerRight: ''
		}
	},

	computed: {
		isEmojiPickerReady() {
			return typeof customElements !== 'undefined' && customElements.get('emoji-picker')
		},
		shouldRenderEmojiPicker() {
			return this.emojiOpened && this.isEmojiPickerReady
		}
	},

	watch: {
		emojiOpened(val) {
			if (val && this.isEmojiPickerReady) {
				setTimeout(() => {
					try {
						// Check if emoji-picker custom element is defined
						if (!customElements.get('emoji-picker')) {
							console.warn('emoji-picker custom element not defined')
							return
						}

						if (this.$refs.emojiPicker && this.$refs.emojiPicker.shadowRoot) {
							this.addCustomStyling()

							this.$refs.emojiPicker.shadowRoot.addEventListener(
								'emoji-click',
								({ detail }) => {
									this.$emit('add-emoji', {
										unicode: detail.unicode
									})
								}
							)
						}
					} catch (error) {
						console.warn('Error setting up emoji picker:', error)
					}
				}, 0)
			}
		}
	},

	beforeUnmount() {
		// Clean up any event listeners or references
		try {
			if (this.$refs.emojiPicker && this.$refs.emojiPicker.shadowRoot) {
				// Remove any event listeners if needed
			}
		} catch (error) {
			// Ignore errors during cleanup
			console.warn('Error during emoji picker cleanup:', error)
		}
	},

	methods: {
		addCustomStyling() {
			try {
				if (!this.$refs.emojiPicker || !this.$refs.emojiPicker.shadowRoot) {
					return
				}

				const picker = `.picker {
					border: none;
				}`

				const nav = `.nav {
					overflow-x: auto;
				}`

				const searchBox = `.search-wrapper {
					padding-right: 2px;
					padding-left: 2px;
				}`

				const search = `input.search {
					height: 32px;
					font-size: 14px;
					border-radius: 10rem;
					border: var(--chat-border-style);
					padding: 5px 10px;
					outline: none;
					background: var(--chat-bg-color-input);
					color: var(--chat-color);
				}`

				const style = document.createElement('style')
				style.textContent = picker + nav + searchBox + search
				this.$refs.emojiPicker.shadowRoot.appendChild(style)
			} catch (error) {
				console.warn('Error adding custom styling to emoji picker:', error)
			}
		},
		openEmoji(ev) {
			this.$emit('open-emoji', !this.emojiOpened)
			this.setEmojiPickerPosition(
				ev.clientY,
				ev.view.innerWidth,
				ev.view.innerHeight
			)
		},
		setEmojiPickerPosition(clientY, innerWidth, innerHeight) {
			const mobileSize = innerWidth < 500 || innerHeight < 700
			const roomFooterRef = findParentBySelector(this.$el, '#room-footer')

			if (!roomFooterRef) {
				if (mobileSize) this.emojiPickerRight = '-50px'
				return
			}

			if (mobileSize) {
				this.emojiPickerRight =
					innerWidth / 2 - (this.positionTop ? 200 : 150) + 'px'
				this.emojiPickerTop = 100
				this.emojiPickerHeight = innerHeight - 200
			} else {
				const roomFooterTop = roomFooterRef.getBoundingClientRect().top
				const pickerTopPosition =
					roomFooterTop - clientY > this.emojiPickerHeight - 50

				if (pickerTopPosition) this.emojiPickerTop = clientY + 10
				else this.emojiPickerTop = clientY - this.emojiPickerHeight - 10

				this.emojiPickerRight = this.positionTop
					? '0px'
					: this.positionRight
					? '60px'
					: ''
			}
		}
	}
}
</script>
