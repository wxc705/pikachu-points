// 皮卡丘积分 · 本机同步服务器（方案D）
// PostgREST 兼容垫片 + 静态托管，零依赖（Node >= 18）。
// 为什么是 PostgREST 兼容：sync.js 只用两个动词
//   .from(t).upsert(rows, { onConflict: 'id' })  → POST /rest/v1/<t>?on_conflict=id
//   .from(t).select('*')                          → GET  /rest/v1/<t>?select=*
// 垫片把这两个动词接住 → sync.js / supabase.js 零改动，只换构建期 URL/KEY。
//
// 启动：node server/sync-server.mjs
// 环境变量（都有默认）：
//   SYNC_PORT=8787  SYNC_HOST=0.0.0.0  SYNC_KEY=lan-sync-key-2026
//   SYNC_DATA_DIR=./server/data   SYNC_WWW_DIR=./server/dist-lan
// 数据：server/data/<table>.json（{id: row}，tmp+rename 原子写）。
// 信任模型：局域网开放（0.0.0.0），路由 NAT 不做端口映射即不暴露公网；
//   apikey 必须匹配 SYNC_KEY（与 build:lan 写进前端的 key 同源），否则 401。

import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, statSync, createReadStream } from 'node:fs'
import { join, dirname, extname, resolve, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.SYNC_DATA_DIR || join(__dirname, 'data')
const WWW_DIR = process.env.SYNC_WWW_DIR || join(__dirname, 'dist-lan')
const PORT = Number(process.env.SYNC_PORT || 8787)
const HOST = process.env.SYNC_HOST || '0.0.0.0'
const API_KEY = process.env.SYNC_KEY || 'lan-sync-key-2026'

const TABLES = ['checkins', 'exchange_requests', 'projects', 'daily_homework', 'weekly_tasks', 'daily_checkins']

// ---- 存储：内存 Map + JSON 文件 ----
mkdirSync(DATA_DIR, { recursive: true })
const store = {}
for (const t of TABLES) {
  const p = join(DATA_DIR, t + '.json')
  let obj = {}
  if (existsSync(p)) {
    try { obj = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.warn(`[sync] ${t}.json 损坏，跳过：${e.message}`) }
  }
  store[t] = new Map(Object.entries(obj))
}
function saveTable(t) {
  const p = join(DATA_DIR, t + '.json')
  const tmp = p + '.tmp'
  writeFileSync(tmp, JSON.stringify(Object.fromEntries(store[t])))
  renameSync(tmp, p)
}

// 稳定序列化（键排序）：撞 id 判等用，避免键序差异造成误判重分配
function canonical(v) {
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']'
  if (typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}'
  return JSON.stringify(v)
}

// daily_checkins 唯一性：同 (date, task_id) 只留 created_at 较新的一条。
// （落地 TODO-supabase-sync.md 里的 unique(date,task_id) 建议：
//   两台设备离线各打同一任务 → 不同 id → upsert by id 会双记，这里按业务键去重。）
// 并集保护：同 id 但内容不同 = 两台设备自增 id 撞车 → 分配 srv-N 保留双方行，绝不互相覆盖。
function upsertRows(table, rows) {
  const map = store[table]
  const affected = []
  for (const row0 of rows) {
    let row = row0
    if (row == null || row.id == null) continue
    if (table === 'daily_checkins' && row.date != null && row.task_id != null) {
      let skip = false
      for (const [oid, orow] of map) {
        if (oid !== String(row.id) && orow.date === row.date && orow.task_id === row.task_id) {
          const incomingTs = Number(row.created_at) || 0
          const existingTs = Number(orow.created_at) || 0
          if (existingTs >= incomingTs) { skip = true; break } // 较新者胜，丢弃这条
          map.delete(oid) // incoming 更新 → 删旧
        }
      }
      if (skip) continue
    }
    const rid = String(row.id)
    if (map.has(rid)) {
      const prev = map.get(rid)
      if (canonical(prev) === canonical(row)) { affected.push(prev); continue } // 同内容副本 → 幂等 no-op
      let n = 1
      while (map.has('srv-' + n)) n++
      row = { ...row, id: 'srv-' + n } // 撞 id 内容不同 → 重分配，保并集
    }
    map.set(String(row.id), row)
    affected.push(row)
  }
  saveTable(table)
  return affected
}

// ---- HTTP ----
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.map': 'application/json', '.webmanifest': 'application/manifest+json'
}

function cors(res, req) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('access-control-allow-headers', req.headers['access-control-request-headers'] || 'apikey,authorization,content-type,prefer,x-client-info')
  res.setHeader('access-control-expose-headers', 'content-range,prefer')
  res.setHeader('access-control-max-age', '86400')
}
function sendJson(res, status, obj, req) {
  const body = JSON.stringify(obj)
  cors(res, req)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) })
  res.end(body)
}
function readBody(req) {
  return new Promise((res, rej) => {
    let buf = ''
    req.on('data', (c) => { buf += c; if (buf.length > 20e6) { rej(new Error('body too large')); req.destroy() } })
    req.on('end', () => res(buf))
    req.on('error', rej)
  })
}
function authOk(req) {
  const k = req.headers['apikey']
  const a = req.headers['authorization']
  return k === API_KEY || a === `Bearer ${API_KEY}`
}

function serveStatic(req, res, pathname) {
  let p = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '')
  if (!p || p === '.') p = 'index.html'
  let file = join(WWW_DIR, p)
  if (!file.startsWith(WWW_DIR)) { res.writeHead(403); return res.end('forbidden') }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    file = join(WWW_DIR, 'index.html') // hash 路由 SPA fallback
    if (!existsSync(file)) {
      return sendJson(res, 503, { message: `LAN 构建产物缺失：先跑 npm run build:lan（期望 ${WWW_DIR}）` }, req)
    }
  }
  const ext = extname(file)
  const immutable = /\/assets\//.test(file) || /-[A-Za-z0-9_]{8,}\./.test(file)
  cors(res, req)
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache'
  })
  createReadStream(file).pipe(res)
}

const server = createServer(async (req, res) => {
  const started = Date.now()
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const path = url.pathname

    if (req.method === 'OPTIONS') { cors(res, req); res.writeHead(204); return res.end() }

    // 健康检查（TODO 验收清单的 curl 路径；不校验 key，给 curl 探活用）
    if (path === '/auth/v1/health') return sendJson(res, 200, { date: new Date().toUTCString() }, req)
    if (path === '/sync/health') return sendJson(res, 200, { ok: true, tables: TABLES, rows: Object.fromEntries(TABLES.map(t => [t, store[t].size])) }, req)

    // PostgREST 垫片 /rest/v1/<table>
    const m = path.match(/^\/rest\/v1\/([a-z_]+)$/)
    if (m) {
      const table = m[1]
      if (!authOk(req)) return sendJson(res, 401, { message: 'Invalid API key', code: '401', details: '', hint: '' }, req)
      if (!TABLES.includes(table)) return sendJson(res, 404, { message: `relation "public.${table}" does not exist`, code: '42P01', details: null, hint: null }, req)

      if (req.method === 'GET') {
        cors(res, req)
        const body = JSON.stringify([...store[table].values()])
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) })
        return res.end(body)
      }
      if (req.method === 'POST') {
        const raw = await readBody(req)
        let parsed
        try { parsed = raw ? JSON.parse(raw) : [] } catch (e) { return sendJson(res, 400, { message: `JSON parse error: ${e.message}`, code: 'PGRST102', details: null, hint: null }, req) }
        const rows = Array.isArray(parsed) ? parsed : [parsed]
        const affected = upsertRows(table, rows)
        const wantRep = String(req.headers['prefer'] || '').includes('return=representation')
        cors(res, req)
        const body = wantRep ? JSON.stringify(affected) : ''
        res.writeHead(201, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) })
        return res.end(body)
      }
      return sendJson(res, 405, { message: 'Method not allowed', code: 'PGRST105', details: null, hint: null }, req)
    }

    if (req.method !== 'GET') return sendJson(res, 405, { message: 'Method not allowed' }, req)
    return serveStatic(req, res, path)
  } catch (e) {
    console.error('[sync] 500:', e)
    try { sendJson(res, 500, { message: e.message || String(e) }, req) } catch (_) {}
  } finally {
    if (process.env.SYNC_LOG) console.log(`${req.method} ${req.url} ${Date.now() - started}ms`)
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[pikachu-sync] listening on http://${HOST}:${PORT}`)
  console.log(`[pikachu-sync] data=${DATA_DIR} www=${WWW_DIR} tables=${TABLES.join(',')}`)
  if (!existsSync(join(WWW_DIR, 'index.html'))) console.warn(`[pikachu-sync] ⚠ ${WWW_DIR}/index.html 不存在 — 静态托管未就绪，先 npm run build:lan`)
})
