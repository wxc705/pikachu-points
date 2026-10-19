// t018 抢救通道：IndexedDB 全量导出为 JSON 文件下载
// 用法（任选其一）：
//   1) 控制台敲 `dumpData()`            → 下载 pikachu-points-dump-<时间>.json
//   2) 地址栏打开 `#/parent?dump=1`     → 进家长端即自动下载同一份文件
// 3) 调试只拿对象不下载：`dumpDataOnly()`
// 为什么要它：积分"被清零"未必是物理删除——读取路径断了（DB 版本/浏览器 profile 换了/换源）
// 也会显示 0。先把账本整份导出来，才知道是"数据没了"还是"读不到"，也才有东西可回灌云端。
// 导出只读，不改任何表、不碰 schema、不写库。

import { DB_NAME, DB_VERSION, openDB } from './db.js'

const STORES = ['projects', 'checkins', 'exchange_requests', 'weekly_plan', 'weekly_tasks', 'daily_checkins', 'daily_homework']
const LS_PREFIX = 'pikachu-points:'

// 读库兜底：先让 openDB() 完成 v5 迁移，再单独开一个原生只读连接导出；
// 绝不关闭 app 的单例连接（关闭后 30s 同步/打卡全部写库失败）。
// 注意：idb 的 IDBPDatabase.transaction() 返回包装对象，objectStore().getAll() 是 Promise
// 而非 IDBRequest（给它挂 onsuccess 会永远不触发）——所以这里坚持用原生 indexedDB 连接。
function openDbSafe() {
  const bare = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('indexedDB.open failed'))
    req.onupgradeneeded = () => {
      try { req.result.close() } catch (e) {}
      reject(new Error('数据库需要升级才能打开，导出时拒绝改动 schema'))
    }
    req.onblocked = () => reject(new Error('数据库被其它标签页占用(onblocked)'))
  })
  return openDB()
    .catch((e) => { console.warn('[dump] 按 schema 版本打开失败，改用只读裸打开：', e) })
    .then(() => bare())
}

export async function dumpData() {
  const out = {
    app: 'pikachu-points',
    schema: 't018-dump-v1',
    db: { name: DB_NAME, expectedVersion: DB_VERSION },
    exportedAt: new Date().toISOString(),
    origin: typeof location !== 'undefined' ? location.origin : '',
    href: typeof location !== 'undefined' ? location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    counts: {},
    stores: {},
    localStorage: {},
    readError: null
  }
  let db = null
  try {
    db = await openDbSafe()
    out.db.actualVersion = db.version
  } catch (e) {
    out.readError = String((e && e.message) || e) // 读取路径断了要显形，不装作"没有数据"
    console.error('[dump] ⚠ IndexedDB 打开失败（数据可能还在，只是读不到）：', e)
  }
  if (db) {
    for (const name of STORES) {
      let rows = []
      try {
        if (db.objectStoreNames.contains(name)) {
          rows = await new Promise((resolve, reject) => {
            const r = db.transaction(name, 'readonly').objectStore(name).getAll()
            r.onsuccess = () => resolve(r.result || [])
            r.onerror = () => reject(r.error)
          })
        }
      } catch (e) {
        out.readError = out.readError || `${name}: ${(e && e.message) || e}`
        console.error('[dump] ⚠ 读取表失败', name, e)
      }
      out.stores[name] = rows
      out.counts[name] = rows.length
    }
    try { db.close() } catch (e) {}
  } else {
    for (const name of STORES) { out.stores[name] = []; out.counts[name] = 0 }
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.indexOf(LS_PREFIX) === 0) out.localStorage[k] = localStorage.getItem(k)
    }
  } catch (e) { /* localStorage 不可用不影响账本导出 */ }
  out.totalRows = STORES.reduce((s, t) => s + (out.counts[t] || 0), 0)
  return out
}

// 触发浏览器下载；返回 { name, counts, totalRows }（失败抛错，让调用方显形）
export async function downloadDataDump() {
  const data = await dumpData()
  const json = JSON.stringify(data, null, 2)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const name = `pikachu-points-dump-${stamp}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { try { a.remove() } catch (e) {} }, 0)
  setTimeout(() => { try { URL.revokeObjectURL(url) } catch (e) {} }, 60000)
  const info = { name, counts: data.counts, totalRows: data.totalRows, readError: data.readError, bytes: json.length }
  if (data.readError) console.error('[dump] ⚠ 导出文件不完整（读取路径有错误）：', data.readError)
  console.log('[dump] ✓ 已导出', name, info)
  console.table(data.counts)
  return info
}

// 挂全局：控制台 dumpData() / dumpDataOnly()，以及 #/parent?dump=1 自动导出
export function registerDumpGlobals() {
  if (typeof window === 'undefined') return
  window.dumpData = async () => downloadDataDump()
  window.dumpDataOnly = () => dumpData()

  const maybeAuto = () => {
    try {
      if (/(^|[?&#])dump=1(&|$)/.test(window.location.hash)) {
        // 触发一次后把参数摘掉，避免刷新反复下载（replaceState 不惊动路由）
        const raw = window.location.hash
        const qIdx = raw.indexOf('?')
        let cleaned = raw
        if (qIdx >= 0) {
          const params = raw.slice(qIdx + 1).split('&').filter((p) => p !== 'dump=1')
          cleaned = params.length ? raw.slice(0, qIdx) + '?' + params.join('&') : raw.slice(0, qIdx)
        }
        try { window.history.replaceState(null, '', window.location.pathname + window.location.search + cleaned) } catch (e) {}
        downloadDataDump().catch((e) => console.error('[dump] 自动导出失败：', e))
      }
    } catch (e) { /* 静默 */ }
  }
  maybeAuto()
  window.addEventListener('hashchange', maybeAuto)
}
