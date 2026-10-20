import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// C4：恢复 PWA（断网冷启动）。registerType='autoUpdate' 解决当年
// 「SW 缓存导致样式不更新」的痛点：新 SW skipWaiting + clientsClaim，
// 下次进入自动接管；所有请求仍走网络优先，不锁死旧资源。
// api.github.com 明确排除：同步数据绝不能被 SW 拦截/缓存。
const pwa = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
  manifest: {
    name: '皮卡丘工作台',
    short_name: '皮卡丘',
    description: '6 岁孩子专属的积分激励工作台',
    lang: 'zh-CN',
    theme_color: '#fde047',
    background_color: '#fef9c3',
    display: 'standalone',
    orientation: 'landscape',
    start_url: './',
    scope: './',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  },
  workbox: {
    // app shell：index.html / assets / public 下的知识图谱 JSON
    // ultraman 大 GIF 不进 precache，避免断网冷启动先下几 MB 素材
    globPatterns: ['**/*.{js,css,html,json,webmanifest}'],
    globIgnores: ['ultraman/**'],
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/^https:\/\/api\.github\.com\//],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
    runtimeCaching: [
      {
        // 同步接口只走网络，永不缓存（GitHub API 明确排除）
        urlPattern: /^https:\/\/api\.github\.com\//,
        handler: 'NetworkOnly'
      }
    ]
  },
  devOptions: {
    enabled: false
  }
})

export default defineConfig({
  plugins: [vue(), pwa],
  base: process.env.VITE_BASE || './',
  server: {
    proxy: {
      // dev 下把作业智能解析转发到本机方案D 服务器（8787 有 /parse + LLM key）
      '/parse': 'http://127.0.0.1:8787'
    }
  }
})
