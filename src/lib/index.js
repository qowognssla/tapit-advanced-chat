import { defineCustomElement } from 'vue'
import ChatWindow from './ChatWindow'
import VideoCall from './components/VideoCall/VideoCall'

export const VueAdvancedChat = defineCustomElement(ChatWindow)
export { VideoCall }

const PACKAGE_NAME = 'vue-advanced-chat'

export function register() {
	if (!customElements.get(PACKAGE_NAME)) {
		customElements.define(PACKAGE_NAME, VueAdvancedChat)
	}
}
