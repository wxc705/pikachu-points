import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
 plugins: [
 vue(),
 VitePWA({
 registerType: 'autoUpdate',
 includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
 manifest: {
 name: '皮卡丘积分',
 short_name: '皮卡丘积分',
 description: '6 岁孩子专属的积分激励系统',
 theme_color: '#fde047',
 background_color: '#fef9c3',
 display: 'standalone',
 orientation: 'portrait',
 start_url: './',
 scope: './',
 icons: [
 { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
 { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
 { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
 ]
 },
 workbox: {
 globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
 // html2canvas 单独 chunk 必须预缓存
 maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
 },
 devOptions: {
 enabled: false
 }
 })
 ],
 base: './'
})
