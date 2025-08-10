<template>
	<div>
		<div
			class="app-container"
			:class="{ 'app-mobile': isDevice, 'app-mobile-dark': theme === 'dark' }"
		>
			<div v-if="!isLoggedIn" class="login-container">
				<h2>Welcome to Chat Demo</h2>
				<form @submit.prevent="login">
					<input
						v-model="loginUsername"
						type="text"
						placeholder="Enter your username"
						required
					/>
					<button type="submit">Login</button>
				</form>
				<div class="demo-users">
					<p>Quick login as:</p>
					<button @click="quickLogin('Luke')">Luke</button>
					<button @click="quickLogin('Leia')">Leia</button>
					<button @click="quickLogin('Yoda')">Yoda</button>
				</div>
			</div>

			<template v-else>
				<span
					v-if="showOptions"
					class="user-logged"
					:class="{ 'user-logged-dark': theme === 'dark' }"
				>
					Logged as {{ currentUsername }}
				</span>
				<button v-if="showOptions" class="logout-button" @click="logout">
					Logout
				</button>

				<div v-if="showOptions" class="button-theme">
					<button class="button-light" @click="theme = 'light'">
						Light
					</button>
					<button class="button-dark" @click="theme = 'dark'">
						Dark
					</button>
					<button class="button-github">
						<a href="https://github.com/advanced-chat/vue-advanced-chat">
							<img src="@/assets/github.svg" />
						</a>
					</button>
				</div>

				<chat-container
					v-if="showChat"
					:current-user-id="currentUsername"
					:theme="theme"
					:is-device="isDevice"
					@show-demo-options="showDemoOptions = $event"
				/>
			</template>
		</div>
	</div>
</template>

<script>
import ChatContainer from './ChatContainer'

export default {
	components: {
		ChatContainer
	},

	data() {
		return {
			theme: 'light',
			showChat: false,
			currentUsername: '',
			loginUsername: '',
			isLoggedIn: false,
			isDevice: false,
			showDemoOptions: true
		}
	},

	computed: {
		showOptions() {
			return !this.isDevice || this.showDemoOptions
		}
	},

	watch: {
		currentUsername() {
			if (this.isLoggedIn) {
				this.showChat = false
				setTimeout(() => (this.showChat = true), 150)
			}
		}
	},

	mounted() {
		this.isDevice = window.innerWidth < 500
		window.addEventListener('resize', ev => {
			if (ev.isTrusted) this.isDevice = window.innerWidth < 500
		})

		// Check if user was previously logged in
		const savedUsername = localStorage.getItem('chatUsername')
		if (savedUsername) {
			this.currentUsername = savedUsername
			this.isLoggedIn = true
			this.showChat = true
		}
	},

	methods: {
		login() {
			if (this.loginUsername.trim()) {
				this.currentUsername = this.loginUsername.trim()
				localStorage.setItem('chatUsername', this.currentUsername)
				this.isLoggedIn = true
				this.showChat = true
				this.loginUsername = ''
			}
		},

		quickLogin(username) {
			this.loginUsername = username
			this.login()
		},

		logout() {
			localStorage.removeItem('chatUsername')
			localStorage.removeItem('authToken')
			this.isLoggedIn = false
			this.showChat = false
			this.currentUsername = ''
		}
	}
}
</script>

<style lang="scss">
body {
	background: #fafafa;
	margin: 0;
}

input {
	-webkit-appearance: none;
}

.app-container {
	font-family: 'Quicksand', sans-serif;
	padding: 20px 30px 30px;
	min-height: 100vh;
}

.app-mobile {
	padding: 0;

	&.app-mobile-dark {
		background: #131415;
	}

	.user-logged {
		margin: 10px 5px 0 10px;
	}

	select {
		margin: 10px 0;
	}

	.button-theme {
		margin: 10px 10px 0 0;

		.button-github {
			height: 23px;

			img {
				height: 23px;
			}
		}
	}
}

.login-container {
	max-width: 400px;
	margin: 100px auto;
	padding: 40px;
	background: white;
	border-radius: 8px;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	text-align: center;

	h2 {
		margin-bottom: 30px;
		color: #333;
	}

	form {
		margin-bottom: 30px;
	}

	input {
		width: 100%;
		padding: 12px;
		margin-bottom: 15px;
		border: 1px solid #e0e2e4;
		border-radius: 4px;
		font-size: 16px;
		box-sizing: border-box;

		&:focus {
			outline: none;
			border-color: #1976d2;
		}
	}

	button {
		width: 100%;
		padding: 12px;
		background: #1976d2;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 16px;
		cursor: pointer;
		transition: background 0.3s;

		&:hover {
			background: #1565c0;
		}
	}

	.demo-users {
		p {
			margin-bottom: 15px;
			color: #666;
		}

		button {
			width: 30%;
			margin: 0 1.5%;
			padding: 8px;
			background: #f5f5f5;
			color: #333;
			border: 1px solid #e0e2e4;

			&:hover {
				background: #e0e2e4;
			}
		}
	}
}

.user-logged {
	font-size: 14px;
	margin-right: 10px;
	margin-top: 10px;
	display: inline-block;

	&.user-logged-dark {
		color: #fff;
	}
}

.logout-button {
	padding: 5px 10px;
	background: #f44336;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 12px;
	margin-right: 10px;

	&:hover {
		background: #d32f2f;
	}
}

select {
	height: 20px;
	outline: none;
	border: 1px solid #e0e2e4;
	border-radius: 4px;
	background: #fff;
	margin-bottom: 20px;
}

.button-theme {
	float: right;
	display: flex;
	align-items: center;

	.button-light {
		background: #fff;
		border: 1px solid #46484e;
		color: #46484e;
	}

	.button-dark {
		background: #1c1d21;
		border: 1px solid #1c1d21;
	}

	button {
		color: #fff;
		outline: none;
		cursor: pointer;
		border-radius: 4px;
		padding: 6px 12px;
		margin-left: 10px;
		border: none;
		font-size: 14px;
		transition: 0.3s;
		vertical-align: middle;

		&.button-github {
			height: 30px;
			background: none;
			padding: 0;
			margin-left: 20px;

			img {
				height: 30px;
			}
		}

		&:hover {
			opacity: 0.8;
		}

		&:active {
			opacity: 0.6;
		}

		@media only screen and (max-width: 768px) {
			padding: 3px 6px;
			font-size: 13px;
		}
	}
}

.version-container {
	padding-top: 20px;
	text-align: right;
	font-size: 14px;
	color: grey;
}
</style>