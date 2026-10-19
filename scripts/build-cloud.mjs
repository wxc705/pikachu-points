// 云构建（t017）：GitHub Contents API 同步引擎
// 用法：npm run build:cloud            （VITE_GH_REPO 默认 wxc705/pikachu-data）
//       VITE_GH_TOKEN=ghp_xxx npm run build:cloud   ← 可选，仅内网/E2E 注入用
// t019 架构修正：token 不再是必填项——**产物里绝不能出现 github_pat_ 字样**
// （公开仓里任何烤进 bundle 的密钥会被 GitHub secret scanning 数十秒内自动吊销，
//  线上同步恒 401）。生产 token 由家长端「设置」页在运行时录入 localStorage `pk_gh_token`。
import { spawnSync } from 'node:child_process'

const token = process.env.VITE_GH_TOKEN || ''
const repo = process.env.VITE_GH_REPO || 'wxc705/pikachu-data'

if (token && /github_pat_|ghp_/.test(token)) {
  console.error('[build-cloud] ✗ 拒绝把 github_pat_/ghp_ 开头的 token 注入构建产物（进公开仓必被吊销）。' +
    '请清掉 VITE_GH_TOKEN，改由家长端「设置 → 云同步密钥」运行时录入。')
  process.exit(1)
}

console.log(`[build-cloud] VITE_SYNC_ENGINE=github VITE_GH_REPO=${repo} VITE_GH_TOKEN=${token ? '<env len ' + token.length + '>' : '<未注入，运行时读 localStorage pk_gh_token>'} base=./`)

const r = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    VITE_SYNC_ENGINE: 'github',
    ...(token ? { VITE_GH_TOKEN: token } : {}),
    VITE_GH_REPO: repo,
    VITE_BASE: './',
    // 覆盖 .env.production 的 Supabase 遗留配置：云构建不带死域名
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_PUBLISHABLE_KEY: ''
  }
})
if (r.status) process.exit(r.status)

// 自检：产物里绝不能有 github_pat_/ghp_ 密钥字样（阳性对照 api.github.com 必须 >0）
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const assetsDir = join(process.cwd(), 'dist', 'assets')
let leaked = 0
let positive = 0
for (const f of readdirSync(assetsDir)) {
  if (!f.endsWith('.js') && !f.endsWith('.css')) continue
  const txt = readFileSync(join(assetsDir, f), 'utf8')
  if (/github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9_]{20,}/.test(txt)) leaked++
  if (txt.includes('api.github.com')) positive++
}
if (positive < 1) {
  console.error('[build-cloud] ✗ 自检失败：产物里找不到 api.github.com（阳性对照为 0，产物可能没构建出来/是错口味）')
  process.exit(1)
}
if (leaked) {
  console.error(`[build-cloud] ✗ 自检失败：${leaked} 个产物文件含 github_pat_/ghp_ 密钥字样（禁止部署）`)
  process.exit(1)
}
console.log('[build-cloud] ✓ dist/ 已生成（GitHub 引擎，密钥扫描通过：github_pat_/ghp_ = 0，api.github.com > 0）')
