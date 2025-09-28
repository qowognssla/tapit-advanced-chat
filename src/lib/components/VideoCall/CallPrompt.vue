<template>
	<transition name="vac-fade-call-prompt">
		<div v-if="visible" class="vac-call-overlay">
			<div class="vac-call-dialog" :class="`vac-call-dialog--${mode}`">
				<div class="vac-call-dialog__icon">
					<svg viewBox="0 0 24 24" width="48" height="48">
						<path
							fill="currentColor"
							d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011-.24 11.36 11.36 0 003.55.57 1 1 0 011 1V21a1 1 0 01-1 1A17.62 17.62 0 012 4a1 1 0 011-1h4.5a1 1 0 011 1 11.36 11.36 0 00.57 3.55 1 1 0 01-.25 1z"
						/>
					</svg>
				</div>

				<div class="vac-call-dialog__content">
					<div class="vac-call-dialog__title">{{ title }}</div>
					<div class="vac-call-dialog__message">{{ message }}</div>

					<div v-if="username || roomName" class="vac-call-dialog__meta">
						<div v-if="avatar" class="vac-call-dialog__avatar" :style="{ backgroundImage: `url('${avatar}')` }" />
						<div>
							<div v-if="username" class="vac-call-dialog__username">{{ username }}</div>
							<div v-if="roomName" class="vac-call-dialog__room">{{ roomName }}</div>
						</div>
					</div>
				</div>

				<div class="vac-call-dialog__actions">
					<button
						type="button"
						class="vac-call-dialog__button vac-call-dialog__button--decline"
						@click="$emit('cancel')"
					>
						{{ cancelText }}
					</button>
					<button
						type="button"
						class="vac-call-dialog__button vac-call-dialog__button--accept"
						@click="$emit('confirm')"
					>
						{{ confirmText }}
					</button>
				</div>
			</div>
		</div>
	</transition>
</template>

<script>
export default {
	name: 'VideoCallPrompt',

	props: {
		visible: { type: Boolean, default: false },
		mode: { type: String, default: 'incoming' },
		title: { type: String, default: '' },
		message: { type: String, default: '' },
		username: { type: String, default: '' },
		roomName: { type: String, default: '' },
		avatar: { type: String, default: '' },
		confirmText: { type: String, default: 'Confirm' },
		cancelText: { type: String, default: 'Cancel' }
	}
}
</script>

<style lang="scss" scoped>
.vac-fade-call-prompt-enter-active,
.vac-fade-call-prompt-leave-active {
	opacity: 1;
	transition: opacity 0.25s ease;
}

.vac-fade-call-prompt-enter-from,
.vac-fade-call-prompt-leave-to {
	opacity: 0;
}

.vac-call-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 11000;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(15, 23, 42, 0.55);
	backdrop-filter: blur(4px);
	padding: 16px;
}

.vac-call-dialog {
	background: linear-gradient(130deg, rgba(59, 130, 246, 0.92), rgba(14, 116, 144, 0.92));
	border-radius: 20px;
	box-shadow: 0 18px 45px rgba(15, 23, 42, 0.4);
	padding: 32px 28px;
	max-width: 360px;
	width: 100%;
	color: #fff;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	position: relative;
	overflow: hidden;
}

.vac-call-dialog--outgoing {
	background: linear-gradient(130deg, rgba(168, 85, 247, 0.95), rgba(79, 70, 229, 0.95));
}

.vac-call-dialog__icon {
	background: rgba(255, 255, 255, 0.18);
	width: 88px;
	height: 88px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 20px;
}

.vac-call-dialog__content {
	width: 100%;
}

.vac-call-dialog__title {
	font-size: 20px;
	font-weight: 700;
	margin-bottom: 8px;
}

.vac-call-dialog__message {
	opacity: 0.8;
	font-size: 14px;
	line-height: 1.5;
}

.vac-call-dialog__meta {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-top: 18px;
}

.vac-call-dialog__avatar {
	width: 48px;
	height: 48px;
	border-radius: 16px;
	background-size: cover;
	background-position: center;
}

.vac-call-dialog__username {
	font-weight: 600;
}

.vac-call-dialog__room {
	font-size: 13px;
	opacity: 0.75;
}

.vac-call-dialog__actions {
	display: flex;
	justify-content: center;
	gap: 12px;
	margin-top: 28px;
	width: 100%;
}

.vac-call-dialog__button {
	flex: 1;
	font-weight: 600;
	border-radius: 12px;
	padding: 12px 0;
	border: none;
	cursor: pointer;
	transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.vac-call-dialog__button:hover {
	transform: translateY(-1px);
	box-shadow: 0 12px 20px rgba(15, 23, 42, 0.18);
}

.vac-call-dialog__button--accept {
	background: #22c55e;
	color: #fff;
}

.vac-call-dialog__button--decline {
	background: rgba(255, 255, 255, 0.18);
	color: #fff;
}

@media (max-width: 420px) {
	.vac-call-dialog {
		padding: 24px;
		border-radius: 16px;
	}

	.vac-call-dialog__actions {
		flex-direction: column;
	}

	.vac-call-dialog__button {
		width: 100%;
	}
}
</style>
