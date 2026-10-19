import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router.js'
import { seedIfEmpty } from './services/seed.js'
import { applyTheme } from './stores/points.js'
import { DEFAULT_THEME_ID, getTheme } from './themes/index.js'
import { unlockAudio } from './services/sound.js'
import { registerDumpGlobals } from './services/dataExport.js'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Seed the IndexedDB on first boot; ignore errors so app still mounts offline.
seedIfEmpty().catch((err) => console.warn('[seed] failed:', err))

app.mount('#app')

// t018 抢救通道：控制台 dumpData() 导出账本；家长端 URL 带 ?dump=1 进页即自动下载
registerDumpGlobals()

// 应用启动主题：优先用 localStorage 中保存的，否则用默认
try {
 const saved = localStorage.getItem('pikachu-points:theme-id')
 const theme = getTheme(saved) || getTheme(DEFAULT_THEME_ID)
 applyTheme(theme)
} catch (e) { /* 静默 */ }

// 解锁 Web Audio（安卓 Chrome 限制：AudioContext 需用户首次手势后才能 resume）
const unlock = () => {
 unlockAudio()
 document.removeEventListener('click', unlock)
 document.removeEventListener('touchstart', unlock)
}
document.addEventListener('click', unlock, { once: true, passive: true })
document.addEventListener('touchstart', unlock, { once: true, passive: true })
