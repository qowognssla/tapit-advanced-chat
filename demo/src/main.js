import { createApp, h } from 'vue'
import App from './App.vue'
import './chat-styles.css'

// Import emoji-picker-element
import 'emoji-picker-element'

// Check if emoji-picker is already defined, if not, wait for it
if (!customElements.get('emoji-picker')) {
	// Force import and wait
	import('emoji-picker-element').then(() => {
		console.log('emoji-picker-element loaded dynamically')
		startApp()
	}).catch(err => {
		console.warn('Failed to load emoji-picker-element:', err)
		startApp() // Start app anyway
	})
} else {
	startApp()
}

function startApp() {
	const app = createApp({
		render: () => h(App)
	})

	app.mount('#app')
}
