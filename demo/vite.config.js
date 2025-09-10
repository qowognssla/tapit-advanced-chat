import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const path = require('path')
export default defineConfig({
	plugins: [
		vue({
			template: {
				compilerOptions: {
					isCustomElement: tagName => {
						return tagName === 'vue-advanced-chat' || 
							   tagName === 'emoji-picker' ||
							   tagName.startsWith('emoji-')
					}
				}
			}
		})
	],
	resolve: {
		extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
		alias: {
			'@': path.resolve(__dirname, './src')
		}
	},
	server: {
		open: '/'
	},
	base: process.env.NODE_ENV === 'production' ? '/vue-advanced-chat/' : '/'
})
