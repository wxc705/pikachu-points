// LAN 构建：把「本机同步服务器」的 URL/KEY 写进产物，复制到 server/dist-lan 供静态托管。
// 用法：npm run build:lan   （跨平台：env 由 node 传，不依赖 shell 语法）
// 与 CI 的 gh-pages 构建互不干扰：Pages 用 .env.production（原 Supabase URL，保持方案A可回切）。
import { spawnSync } from 'node:child_process'
import { cpSync, rmSync, mkdirSync } from 'node:fs'

const SYNC_URL = process.env.LAN_SYNC_URL || 'SAME_ORIGIN' // 同源：访问谁同步谁（LAN/Tailscale/localhost 通用）
const SYNC_KEY = process.env.SYNC_KEY || 'lan-sync-key-2026'

console.log(`[build-lan] VITE_SUPABASE_URL=${SYNC_URL}`)
const r = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32', // Windows 下 npm 是 npm.cmd
  env: { ...process.env, VITE_SUPABASE_URL: SYNC_URL, VITE_SUPABASE_PUBLISHABLE_KEY: SYNC_KEY }
})
if (r.status) process.exit(r.status || 1)

rmSync('server/dist-lan', { recursive: true, force: true })
mkdirSync('server/dist-lan', { recursive: true })
cpSync('dist', 'server/dist-lan', { recursive: true })
console.log('[build-lan] ✓ dist → server/dist-lan（服务器从这里托管）')
