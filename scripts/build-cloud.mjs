// 云构建（t017）：GitHub Contents API 同步引擎
// 用法：VITE_GH_TOKEN=ghp_xxx npm run build:cloud   （可选 VITE_GH_REPO，默认 wxc705/pikachu-data）
// token 只从环境变量注入：不写进源码、不写进任何文件、日志里也不打印（连尾号都不打）。
// 产物 = dist/（base './'，可挂 gh-pages 子路径）。
import { spawnSync } from 'node:child_process'

const token = process.env.VITE_GH_TOKEN || ''
const repo = process.env.VITE_GH_REPO || 'wxc705/pikachu-data'

if (!token) {
  console.error('[build-cloud] ✗ 缺环境变量 VITE_GH_TOKEN（token 只走环境变量，拒绝落盘/硬编码）')
  process.exit(1)
}

console.log(`[build-cloud] VITE_SYNC_ENGINE=github VITE_GH_REPO=${repo} VITE_GH_TOKEN=<len ${token.length}> base=./`)

const r = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    VITE_SYNC_ENGINE: 'github',
    VITE_GH_TOKEN: token,
    VITE_GH_REPO: repo,
    VITE_BASE: './',
    // 覆盖 .env.production 的 Supabase 遗留配置：云构建不带死域名
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_PUBLISHABLE_KEY: ''
  }
})
if (r.status) process.exit(r.status)
console.log('[build-cloud] ✓ dist/ 已生成（GitHub 引擎）')
