// 云同步抽象层
// 抽象：push / pull / sync 三个核心函数。view 文件只调这三个，不知道底下是 GitHub Contents 还是 LAN 垫片。
// 行映射与合并语义统一在 services/merge.js（B1），这里只负责编排与保护闸。

import {
  getAllCheckinsRaw, getAllRequestsRaw, getProjectsRaw, getAllWeeklyTasksRaw,
  getDailyHomeworkAllRaw, getAllDailyCheckinsRaw,
  putCheckin, putProject, putExchangeRequest, putWeeklyTask, putDailyHomework, putDailyCheckin,
  clearSyncDirty, setSyncDirtySuppressed, markSyncDirty
} from './db.js'

import { supabase, isSupabaseConfigured } from './supabase.js'
import {
  SYNC_ENGINE, isSyncEngineConfigured, syncEngineClient,
  clearCloudBaseline as ghClearCloudBaseline
} from './githubSync.js'
import { SYNC_TABLE_KEYS, mergeRows, toCloud, rowUid } from './merge.js'

// ---- 引擎选择（t017）：VITE_SYNC_ENGINE=github → GitHub 私有仓 Contents API；
// 否则（dev / build:lan SAME_ORIGIN）走原 Supabase 路径，局域网垫片行为不变 ----
const engine = syncEngineClient()
const ENGINE_UNCONFIGURED_MSG = SYNC_ENGINE === 'github'
  ? 'GitHub 同步未配置：先到「设置 → 云同步密钥」粘贴保存密钥（或构建时注入 VITE_GH_TOKEN / VITE_GH_REPO）'
  : 'Supabase 未配置：检查 .env'

// ---- 状态订阅 ----
const listeners = new Set()
const state = {
  isSyncing: false,
  lastSyncedAt: null,
  lastError: null,
  lastResult: null
}

function notify() {
  for (const cb of listeners) {
    try { cb({ ...state }) } catch (e) {}
  }
}

export function onSyncChange(callback) {
  listeners.add(callback)
  callback({ ...state })
  return () => listeners.delete(callback)
}

export function getSyncState() {
  return { ...state }
}

// ---- 工具 ----
function nowIso() { return new Date().toISOString() }

// ==== 数据安全红线（t018/B5）：pull 只能做并集合并，任何情况下都不得物理丢本地行 ====
// 三道闸：① 云端该表为空或拉取失败 → 整表跳过，本地一个字节都不写；
//        ② 合并全程只 put 不 delete；③ 收尾按 uid 内容级比对，pull 前存在的 uid 丢失则回滚该表。
const SYNC_TABLES = SYNC_TABLE_KEYS

const RAW_BY_TABLE = {
  checkins: getAllCheckinsRaw,
  exchange_requests: getAllRequestsRaw,
  projects: getProjectsRaw,
  weekly_tasks: getAllWeeklyTasksRaw,
  daily_homework: getDailyHomeworkAllRaw,
  daily_checkins: getAllDailyCheckinsRaw
}

const PUT_BY_TABLE = {
  checkins: putCheckin,
  exchange_requests: putExchangeRequest,
  projects: putProject,
  weekly_tasks: putWeeklyTask,
  daily_homework: putDailyHomework,
  daily_checkins: putDailyCheckin
}

async function readAllTablesRaw() {
  const [c, r, p, w, h, d] = await Promise.all([
    getAllCheckinsRaw(), getAllRequestsRaw(), getProjectsRaw(),
    getAllWeeklyTasksRaw(), getDailyHomeworkAllRaw(), getAllDailyCheckinsRaw()
  ])
  return {
    checkins: c, exchange_requests: r, projects: p,
    weekly_tasks: w, daily_homework: h, daily_checkins: d
  }
}

function countsOf(snap) {
  const out = {}
  for (const t of SYNC_TABLES) out[t] = (snap[t] || []).length
  return out
}

// 稳定序列化：合并前后内容级比较，避免每轮 pull 无谓回写
function stable(v) {
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']'
  if (typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}'
  }
  return JSON.stringify(v)
}
function rowsEqual(a, b) {
  return stable(a) === stable(b)
}

// 内容级保护闸：pull 前每表 uid 快照，pull 后这些 uid 必须仍存在（墓碑行也算存在）。
// 丢失 → 把该表 pull 前所有行 put 回去 + 报错。行数检查保留作兜底。
async function guardNoShrink(before, skippedEmpty) {
  const after = await readAllTablesRaw()
  const violations = []
  for (const t of SYNC_TABLES) {
    const bRows = before[t] || []
    const aRows = after[t] || []
    const beforeUids = new Set(bRows.map(rowUid).filter(Boolean))
    const afterUids = new Set(aRows.map(rowUid).filter(Boolean))
    const missing = [...beforeUids].filter((uid) => !afterUids.has(uid))
    if (missing.length || aRows.length < bRows.length) {
      for (const row of bRows) await PUT_BY_TABLE[t](row) // 回滚该表
      violations.push(`${t}: 丢失 uid ${missing.length} 个 / 行数 ${bRows.length}→${aRows.length}（已回滚）`)
    }
  }
  if (violations.length) {
    const msg = `数据安全红线违规(pull 丢行): ${violations.join('; ')}`
    console.error('[sync][DATA-SAFETY] ' + msg)
    markSyncDirty() // 回滚的行要补推上云（此刻仍在 suppressed 窗口内，由 finally 统一补标）
    return { msg, before: countsOf(before), after: countsOf(before), skippedEmpty, restored: true }
  }
  return { msg: null, before: countsOf(before), after: countsOf(after), skippedEmpty, restored: false }
}

// ---- 核心接口 ----

// push: 把本地六表（含墓碑行）推到云；墓碑行带 deletedAt，云端保留删除记录供其他设备 pull
export async function push() {
  if (!isSyncEngineConfigured()) {
    throw new Error(ENGINE_UNCONFIGURED_MSG)
  }
  if (state.isSyncing) return state.lastResult
  state.isSyncing = true
  state.lastError = null
  notify()
  try {
    const raw = await readAllTablesRaw()
    let pushed = 0
    const errors = []

    // 逐表 upsert，失败不连坐其他表。空表跳过（B4 的显式清云走 clearCloudBaseline，不靠空表 push）。
    for (const table of SYNC_TABLES) {
      const localRows = raw[table] || []
      if (!localRows.length) continue
      const rows = localRows.map((r) => toCloud(table, r)).filter(Boolean)
      try {
        const { error } = await engine.from(table).upsert(rows, { onConflict: 'uid' })
        if (error) throw error
        pushed += rows.length
      } catch (e) {
        errors.push({ table, error: e.message || String(e) })
      }
    }

    const ts = nowIso()
    state.lastSyncedAt = ts
    state.lastResult = { pushed, pulled: 0, errors, lastSyncedAt: ts }
    if (!errors.length) clearSyncDirty()
    state.lastError = errors.length ? errors.map((x) => `${x.table}: ${x.error}`).join(' | ') : null
    return state.lastResult
  } catch (e) {
    state.lastError = e.message || String(e)
    state.lastResult = { pushed: 0, pulled: 0, error: state.lastError }
    throw e
  } finally {
    state.isSyncing = false
    notify()
  }
}

// pull: 从云拉取 → mergeRows(按 uid，updatedAt LWW，云端墓碑落地) → 只 put 不 delete
export async function pull() {
  if (!isSyncEngineConfigured()) {
    throw new Error(ENGINE_UNCONFIGURED_MSG)
  }
  if (state.isSyncing) return state.lastResult
  state.isSyncing = true
  state.lastError = null
  let guard = null
  notify()
  try {
    setSyncDirtySuppressed(true) // pull 回写期间抑制脏标（finally 里解除）
    const before = await readAllTablesRaw() // 内容级快照：含墓碑
    const skippedEmpty = []

    // 逐表拉取；表不存在/无权访问只记错误，不连坐其他表
    const settled = await Promise.allSettled(SYNC_TABLES.map((t) => engine.from(t).select('*')))
    const cloudByTable = {}
    const pullErrors = []
    for (let i = 0; i < SYNC_TABLES.length; i++) {
      const table = SYNC_TABLES[i]
      const r = settled[i]
      if (r.status === 'rejected') {
        cloudByTable[table] = null
        pullErrors.push({ table, error: r.reason && r.reason.message ? r.reason.message : String(r.reason) })
      } else if (r.value && r.value.error) {
        cloudByTable[table] = null
        pullErrors.push({ table, error: r.value.error.message || String(r.value.error) })
      } else {
        cloudByTable[table] = Array.isArray(r.value && r.value.data) ? r.value.data : null
      }
    }
    if (pullErrors.length) state.lastError = pullErrors.map((x) => `${x.table}: ${x.error}`).join(' | ')

    let pulled = 0
    let merged = 0

    for (const table of SYNC_TABLES) {
      const cloudRows = cloudByTable[table]
      if (cloudRows == null) continue // 读取失败 → 整表跳过，绝不当空表
      if (!cloudRows.length) { skippedEmpty.push(table); continue } // 空云 → 整表跳过

      const localRows = before[table] || []
      const result = mergeRows(table, localRows, cloudRows, [])
      const localByUid = new Map(localRows.map((r) => [rowUid(r), r]).filter(([uid]) => uid))
      for (const row of result.rows) {
        const uid = rowUid(row)
        if (!uid) continue
        const prev = localByUid.get(uid)
        if (!prev || !rowsEqual(prev, row)) await PUT_BY_TABLE[table](row)
      }
      pulled += result.stats.added
      merged += result.stats.updated + result.stats.deleted
    }

    const ts = nowIso()
    guard = await guardNoShrink(before, skippedEmpty)
    if (guard.msg) state.lastError = guard.msg
    state.lastSyncedAt = ts
    state.lastResult = {
      pushed: 0,
      pulled,
      merged,
      errors: pullErrors,
      skippedEmpty: guard.skippedEmpty,
      guard: { before: guard.before, after: guard.after, shrunk: !!guard.restored },
      lastSyncedAt: ts
    }
    return state.lastResult
  } catch (e) {
    state.lastError = e.message || String(e)
    state.lastResult = { pushed: 0, pulled: 0, merged: 0, error: state.lastError }
    throw e
  } finally {
    setSyncDirtySuppressed(false)
    if (guard && guard.restored) markSyncDirty()
    state.isSyncing = false
    notify()
  }
}

// 双向：先 pull 再 push
export async function sync() {
  const p = await pull()
  const u = await push()
  const errors = [...(p.errors || []), ...(u.errors || [])]
  return {
    pushed: u.pushed,
    pulled: p.pulled,
    errors,
    lastSyncedAt: state.lastSyncedAt
  }
}

// B4：显式清空云端账本四表为空对象 {}。
// 只对 GitHub Contents 引擎有意义（每表一个文件，写空文件 = 空基线）；
// LAN/Supabase 垫片没有等价的「写空文件」语义，明确报错而不是假装成功。
export async function clearCloudBaseline() {
  if (!isSyncEngineConfigured()) throw new Error(ENGINE_UNCONFIGURED_MSG)
  if (SYNC_ENGINE !== 'github') {
    throw new Error('当前同步引擎不支持显式清空云端基线（仅 GitHub Contents 引擎支持；LAN 模式请直接清空数据目录）')
  }
  const r = await ghClearCloudBaseline()
  if (r && r.errors && r.errors.length) {
    throw new Error(r.errors.map((x) => `${x.table}: ${x.error}`).join(' | '))
  }
  return r
}

// 旧接口保留（无「全清」安全实现）
export async function clearCloud() {
  if (!isSyncEngineConfigured()) return
  console.warn('[sync] clearCloud 不支持远程清空（安全）；账本重置请走 clearCloudBaseline（B4）')
}
