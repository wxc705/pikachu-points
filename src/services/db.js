import { openDB as idbOpen } from 'idb'
import { applyTombstone, isTombstoned, tsOf } from './merge.js'

export const DB_NAME = 'pikachu-points'
export const DB_VERSION = 5
// ==== 同步脏标（方案D 自动推送）：本地写库 → 标脏 → 30s定时/离页/联网冲刷上云 ====
const SYNC_DIRTY_KEY = 'pikachu-points:sync-dirty'
let _syncDirtySuppressed = false
// pull 合并回写是“来自云端的写”，pull 期间抑制标脏，防 30s 推拉死循环
export function setSyncDirtySuppressed(v) { _syncDirtySuppressed = v }
export function markSyncDirty() {
  if (_syncDirtySuppressed) return
  try { localStorage.setItem(SYNC_DIRTY_KEY, '1') } catch (_) {}
}
export function isSyncDirty() {
  try { return localStorage.getItem(SYNC_DIRTY_KEY) === '1' } catch (_) { return false }
}
export function clearSyncDirty() {
  try { localStorage.removeItem(SYNC_DIRTY_KEY) } catch (_) {}
}

// UUID：优先 crypto.randomUUID（Safari/iPadOS 14.5+），老系统用 getRandomValues 拼 v4。
// 绝不使用 Math.random —— 两台设备撞 uid 等于账本互相覆盖。
export function newUid() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null
  if (c && typeof c.randomUUID === 'function') {
    try { return c.randomUUID() } catch (_) {}
  }
  if (c && typeof c.getRandomValues === 'function') {
    const b = new Uint8Array(16)
    c.getRandomValues(b)
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  }
  throw new Error('当前环境不支持 crypto.getRandomValues，无法生成同步主键 uid')
}

// 种子/内置配置行的确定性 uid：同一份种子在任何设备算出同一个 uid。
// 否则「清库后重新 seed + pull」会把云端同一课表当成另一套行，39 条变 78 条。
// 仅用于内置种子；用户新建行仍走 crypto.randomUUID。
export function stableUid(namespace, key) {
  const s = `${namespace}|${key}`
  let h1 = 0x811c9dc5
  let h2 = 0x9e3779b9
  let h3 = 0x85ebca6b
  let h4 = 0xc2b2ae35
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x85ebca6b)
    h3 = Math.imul(h3 ^ c, 0xc2b2ae35)
    h4 = Math.imul(h4 ^ c, 0x27d4eb2f)
  }
  const hex = [h1, h2, h3, h4].map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

// 任何写库路径都先过这里：uid 是唯一主键，id 与 uid 对齐（旧自增 id 留在 legacyId）
function withUid(row, legacyId) {
  const src = row && typeof row === 'object' ? row : {}
  const hasUid = src.uid != null && src.uid !== ''
  const uid = hasUid ? String(src.uid) : newUid()
  const next = { ...src, uid, id: uid }
  if (src.legacyId != null) next.legacyId = src.legacyId
  else if (!hasUid && src.id != null && src.id !== uid) next.legacyId = src.id
  else if (legacyId !== undefined) next.legacyId = legacyId
  return next
}

function liveOnly(rows) {
  return (rows || []).filter((r) => !isTombstoned(r))
}

function safeClone(v) {
  try { return JSON.parse(JSON.stringify(v)) } catch (_) { return v }
}

// ---- v5 schema：六张同步表 keyPath=uid（string，去 autoIncrement）；weekly_plan 仍按 weekday ----
const SHARED_INDEXES = [['by_id', 'id', { unique: false }]]
const STORE_DEFS = {
  projects: { keyPath: 'uid', indexes: [['by_category', 'category', { unique: false }], ...SHARED_INDEXES] },
  checkins: {
    keyPath: 'uid',
    indexes: [['by_date', 'date', { unique: false }], ['by_project', 'projectId', { unique: false }], ...SHARED_INDEXES]
  },
  exchange_requests: { keyPath: 'uid', indexes: [['by_status', 'status', { unique: false }], ...SHARED_INDEXES] },
  weekly_plan: { keyPath: 'weekday', indexes: [['by_weekday', 'weekday', { unique: true }]] },
  weekly_tasks: { keyPath: 'uid', indexes: [['by_weekday', 'weekday', { unique: false }], ...SHARED_INDEXES] },
  daily_checkins: {
    keyPath: 'uid',
    indexes: [['by_date', 'date', { unique: false }], ['by_task', 'taskId', { unique: false }], ...SHARED_INDEXES]
  },
  daily_homework: { keyPath: 'uid', indexes: [['by_date', 'date', { unique: false }], ...SHARED_INDEXES] }
}
const ALL_STORES = Object.keys(STORE_DEFS)
const LEDGER_STORES = ['checkins', 'daily_checkins', 'exchange_requests', 'daily_homework']

function createAllStores(db) {
  for (const name of ALL_STORES) {
    if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name)
    const def = STORE_DEFS[name]
    const store = db.createObjectStore(name, { keyPath: def.keyPath })
    for (const [idxName, keyPath, opts] of def.indexes) store.createIndex(idxName, keyPath, opts)
  }
}

function readStoreRows(db, name) {
  if (!db.objectStoreNames.contains(name)) return Promise.resolve([])
  // db 是 idb 的 IDBPDatabase 包装：transaction().store.getAll() 返回 Promise；
  // 不能给它挂原生 IDBRequest 的 onsuccess（会永远不触发 → 迁移静默卡死）。
  return db.transaction(name, 'readonly').store.getAll()
}

async function snapshotDb(db) {
  const out = {}
  for (const name of ALL_STORES) out[name] = await readStoreRows(db, name)
  return out
}

function mapRef(map, v) {
  if (v == null) return v
  return map.get(String(v)) ?? v
}

// 旧行逐行搬进新 schema：uid 新生成，id 指向 uid，legacyId 保留旧自增 id。
// 外键（projectId/taskId/homeworkId/weekly_plan.projectIds）同步改写到新 uid。
// 升级事务本身原子：中断 = 整个 versionchange 回滚，重跑不会重复插入。
function migrateSnapshot(snapshot) {
  const snap = snapshot || {}
  const projectMap = new Map()
  const taskMap = new Map()
  const homeworkMap = new Map()
  const newUidFor = (row, map) => {
    const uid = row && row.uid != null && row.uid !== '' ? String(row.uid) : newUid()
    if (row && row.id != null) map.set(String(row.id), uid)
    if (row && row.uid != null) map.set(String(row.uid), uid)
    return uid
  }

  const projects = (snap.projects || []).map((row) => {
    const uid = newUidFor(row, projectMap)
    return withUid({
      ...row,
      uid,
      updatedAt: tsOf(row.updatedAt) || tsOf(row.createdAt) || 0,
      ...(tsOf(row.deletedAt) ? { deletedAt: tsOf(row.deletedAt) } : {})
    }, row.legacyId ?? row.id)
  })
  const weeklyTasks = (snap.weekly_tasks || []).map((row) => {
    const uid = newUidFor(row, taskMap)
    return withUid({
      ...row,
      uid,
      updatedAt: tsOf(row.updatedAt) || tsOf(row.createdAt) || 0,
      ...(tsOf(row.deletedAt) ? { deletedAt: tsOf(row.deletedAt) } : {})
    }, row.legacyId ?? row.id)
  })
  const dailyHomework = (snap.daily_homework || []).map((row) => {
    const uid = newUidFor(row, homeworkMap)
    return withUid({
      ...row,
      uid,
      createdAt: tsOf(row.createdAt) || 0,
      updatedAt: tsOf(row.updatedAt) || tsOf(row.createdAt) || 0,
      ...(tsOf(row.deletedAt) ? { deletedAt: tsOf(row.deletedAt) } : {})
    }, row.legacyId ?? row.id)
  })
  const checkins = (snap.checkins || []).map((row) => withUid({
    ...row,
    uid: row.uid != null && row.uid !== '' ? String(row.uid) : newUid(),
    projectId: mapRef(projectMap, row.projectId),
    taskId: mapRef(taskMap, row.taskId),
    homeworkId: mapRef(homeworkMap, row.homeworkId),
    createdAt: tsOf(row.createdAt) || 0,
    updatedAt: tsOf(row.updatedAt) || tsOf(row.createdAt) || 0,
    ...(tsOf(row.deletedAt) ? { deletedAt: tsOf(row.deletedAt) } : {})
  }, row.legacyId ?? row.id))
  const dailyCheckins = (snap.daily_checkins || []).map((row) => withUid({
    ...row,
    uid: row.uid != null && row.uid !== '' ? String(row.uid) : newUid(),
    taskId: mapRef(taskMap, row.taskId),
    completedAt: tsOf(row.completedAt) || 0,
    updatedAt: tsOf(row.updatedAt) || tsOf(row.completedAt) || 0,
    ...(tsOf(row.deletedAt) ? { deletedAt: tsOf(row.deletedAt) } : {})
  }, row.legacyId ?? row.id))
  const requests = (snap.exchange_requests || []).map((row) => withUid({
    ...row,
    uid: row.uid != null && row.uid !== '' ? String(row.uid) : newUid(),
    createdAt: tsOf(row.createdAt) || 0,
    decidedAt: tsOf(row.decidedAt) || 0,
    updatedAt: tsOf(row.updatedAt) || tsOf(row.decidedAt) || tsOf(row.createdAt) || 0,
    ...(tsOf(row.deletedAt) ? { deletedAt: tsOf(row.deletedAt) } : {})
  }, row.legacyId ?? row.id))
  const weeklyPlans = (snap.weekly_plan || []).map((row) => ({
    ...row,
    projectIds: Array.isArray(row.projectIds) ? row.projectIds.map((id) => mapRef(projectMap, id)) : []
  }))

  return {
    projects,
    checkins,
    exchange_requests: requests,
    weekly_plan: weeklyPlans,
    weekly_tasks: weeklyTasks,
    daily_checkins: dailyCheckins,
    daily_homework: dailyHomework
  }
}

function writeSnapshot(tx, migrated) {
  const seen = new Set()
  for (const name of ALL_STORES) {
    const store = tx.objectStore(name)
    for (const row of migrated[name] || []) {
      if (name !== 'weekly_plan') {
        const uid = row && row.uid != null ? String(row.uid) : ''
        if (!uid) continue
        const key = name + '|' + uid
        if (seen.has(key)) continue // 极端输入里的重复 uid：只写一次
        seen.add(key)
      }
      store.put(row)
    }
  }
}

let _dbPromise = null

async function openAndMigrate() {
  // 先按现有版本只读打开，拿到旧数据快照；再升级。升级本身原子，快照失败不会写库。
  const existing = await idbOpen(DB_NAME)
  const version = existing.version
  if (version > DB_VERSION) {
    try { existing.close() } catch (_) {}
    throw new Error(`IndexedDB 版本 ${version} 高于当前应用期望 ${DB_VERSION}，请先升级应用而不是降级数据`)
  }
  if (version === DB_VERSION) return existing
  let snapshot = null
  try {
    snapshot = await snapshotDb(existing)
  } finally {
    try { existing.close() } catch (_) {}
  }
  const migrated = migrateSnapshot(snapshot)
  return idbOpen(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, tx) {
      createAllStores(db)
      writeSnapshot(tx, migrated)
    }
  })
}

export function openDB() {
  if (_dbPromise) return _dbPromise
  _dbPromise = openAndMigrate().catch((e) => {
    _dbPromise = null
    throw e
  })
  return _dbPromise
}

// ----- projects -----
export async function addProject(project) {
  markSyncDirty()
  const db = await openDB()
  const src = project || {}
  const hasUpdatedAt = Object.prototype.hasOwnProperty.call(src, 'updatedAt')
  const row = withUid({ ...src, updatedAt: hasUpdatedAt ? tsOf(src.updatedAt) : Date.now() })
  // put 而非 add：种子 uid 是确定性的，删除后重 seed 需要用同一 uid 覆盖墓碑行
  await db.put('projects', row)
  if (project && typeof project === 'object') Object.assign(project, { uid: row.uid, id: row.uid })
  return row.uid
}

export async function updateProject(id, patch) {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction('projects', 'readwrite')
  const store = tx.objectStore('projects')
  const existing = await store.get(id)
  if (!existing || isTombstoned(existing)) {
    await tx.done
    return null
  }
  const safePatch = safeClone(patch)
  const next = {
    ...existing,
    ...safePatch,
    uid: existing.uid,
    id: existing.uid,
    updatedAt: tsOf(safePatch.updatedAt) || Date.now()
  }
  await store.put(next)
  await tx.done
  return next
}

export async function setProjectActive(id, isActive) {
  return updateProject(id, { isActive })
}

export async function deleteProject(id) {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction('projects', 'readwrite')
  const store = tx.objectStore('projects')
  const existing = await store.get(id)
  if (!existing) { await tx.done; return null }
  const next = applyTombstone(existing)
  await store.put(next)
  await tx.done
  return next
}

export async function getProjects() {
  const db = await openDB()
  return liveOnly(await db.getAll('projects'))
}

export async function getProjectsRaw() {
  const db = await openDB()
  return db.getAll('projects')
}

export async function getActiveProjects() {
  const db = await openDB()
  const all = await db.getAll('projects')
  return liveOnly(all).filter((p) => p.isActive !== false)
}

// ----- checkins -----
export async function addCheckin(checkin) {
  markSyncDirty()
  const db = await openDB()
  const row = withUid({
    ...checkin,
    createdAt: tsOf(checkin.createdAt) || Date.now(),
    updatedAt: tsOf(checkin.updatedAt) || tsOf(checkin.createdAt) || Date.now()
  })
  await db.add('checkins', row)
  if (checkin && typeof checkin === 'object') Object.assign(checkin, { uid: row.uid, id: row.uid })
  return row.uid
}

export async function getCheckinsByDate(date) {
  const db = await openDB()
  return liveOnly(await db.getAllFromIndex('checkins', 'by_date', date))
}

export async function getAllCheckins() {
  const db = await openDB()
  return liveOnly(await db.getAll('checkins'))
}

export async function getAllCheckinsRaw() {
  const db = await openDB()
  return db.getAll('checkins')
}

// ----- 报告辅助：本周一到今天的日期范围（YYYY-MM-DD 字符串数组） -----
export function getWeekRange(todayStr) {
  const d = new Date(todayStr + 'T00:00:00')
  const day = d.getDay() // 0=Sun, 1=Mon, ... 6=Sat
  const offsetToMonday = (day === 0 ? 6 : day - 1)
  d.setDate(d.getDate() - offsetToMonday)
  const out = []
  for (let i = 0; i < 7; i++) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${dd}`)
    d.setDate(d.getDate() + 1)
  }
  return out
}

// ----- exchange_requests -----
export async function addExchangeRequest(req) {
  markSyncDirty()
  const db = await openDB()
  const now = Date.now()
  const row = withUid({
    ...req,
    status: req.status || 'pending',
    viewed: req.viewed || false,
    createdAt: tsOf(req.createdAt) || now,
    updatedAt: tsOf(req.updatedAt) || tsOf(req.createdAt) || now
  })
  await db.add('exchange_requests', row)
  if (req && typeof req === 'object') Object.assign(req, { uid: row.uid, id: row.uid })
  return row.uid
}

export async function updateExchangeRequest(id, patch) {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction('exchange_requests', 'readwrite')
  const store = tx.objectStore('exchange_requests')
  const existing = await store.get(id)
  if (!existing || isTombstoned(existing)) {
    await tx.done
    return null
  }
  const safePatch = safeClone(patch)
  const next = {
    ...existing,
    ...safePatch,
    uid: existing.uid,
    id: existing.uid,
    // 审批/已读必须推进 updatedAt：pull 对 exchange_requests 用 updatedAt 做 LWW（B6）
    updatedAt: tsOf(safePatch.updatedAt) || Date.now()
  }
  await store.put(next)
  await tx.done
  return next
}

export async function getPendingRequests() {
  const db = await openDB()
  const all = await db.getAllFromIndex('exchange_requests', 'by_status', 'pending')
  return liveOnly(all)
}

export async function getAllRequests() {
  const db = await openDB()
  return liveOnly(await db.getAll('exchange_requests'))
}

export async function getAllRequestsRaw() {
  const db = await openDB()
  return db.getAll('exchange_requests')
}

// ----- 同步辅助：清空全部 + 覆盖写入 -----
export async function clearAll() {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction(['projects', 'checkins', 'exchange_requests'], 'readwrite')
  await tx.objectStore('projects').clear()
  await tx.objectStore('checkins').clear()
  await tx.objectStore('exchange_requests').clear()
  await tx.done
}

export async function putCheckin(checkin) {
  markSyncDirty()
  const db = await openDB()
  const row = withUid(checkin)
  await db.put('checkins', row)
  return row.uid
}

export async function putProject(project) {
  markSyncDirty()
  const db = await openDB()
  const row = withUid(project)
  await db.put('projects', row)
  return row.uid
}

export async function putExchangeRequest(req) {
  markSyncDirty()
  const db = await openDB()
  const row = withUid(req)
  await db.put('exchange_requests', row)
  return row.uid
}

// ----- weekly_plan (v2): 每周学习计划 -----
// weekday: 1=周一, 2=周二, ..., 7=周日
export async function getAllWeeklyPlans() {
  const db = await openDB()
  return db.getAll('weekly_plan')
}

export async function getWeeklyPlan(weekday) {
  const db = await openDB()
  return db.get('weekly_plan', weekday)
}

export async function setWeeklyPlan(weekday, projectIds) {
  markSyncDirty()
  const db = await openDB()
  return db.put('weekly_plan', { weekday, projectIds: [...new Set(projectIds)] })
}

export async function clearWeeklyPlan(weekday) {
  markSyncDirty()
  const db = await openDB()
  return db.delete('weekly_plan', weekday)
}

// ----- weekly_tasks (v3): 每周任务（QC 课表） -----
// task: { weekday, timeSlot, name, points, category, sortOrder, isActive }
export async function getAllWeeklyTasks() {
  const db = await openDB()
  return liveOnly(await db.getAll('weekly_tasks'))
}

export async function getAllWeeklyTasksRaw() {
  const db = await openDB()
  return db.getAll('weekly_tasks')
}

export async function getWeeklyTasksByWeekday(weekday) {
  const db = await openDB()
  return liveOnly(await db.getAllFromIndex('weekly_tasks', 'by_weekday', weekday))
}

export async function addWeeklyTask(task) {
  markSyncDirty()
  const db = await openDB()
  const src = task || {}
  const now = Date.now()
  const hasUpdatedAt = Object.prototype.hasOwnProperty.call(src, 'updatedAt')
  const hasCreatedAt = Object.prototype.hasOwnProperty.call(src, 'createdAt')
  const row = withUid({
    ...src,
    isActive: src.isActive !== false,
    createdAt: hasCreatedAt ? tsOf(src.createdAt) : now,
    updatedAt: hasUpdatedAt ? tsOf(src.updatedAt) : now
  })
  // put 而非 add：种子 uid 确定性，resetWeeklyTasks（先墓碑后重 seed）要能覆盖旧行
  await db.put('weekly_tasks', row)
  if (task && typeof task === 'object') Object.assign(task, { uid: row.uid, id: row.uid })
  return row.uid
}

export async function putWeeklyTask(task) {
  markSyncDirty()
  const db = await openDB()
  const row = withUid(task)
  await db.put('weekly_tasks', row)
  return row.uid
}

export async function updateWeeklyTask(id, patch) {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction('weekly_tasks', 'readwrite')
  const store = tx.objectStore('weekly_tasks')
  const existing = await store.get(id)
  if (!existing || isTombstoned(existing)) {
    await tx.done
    return null
  }
  const safePatch = safeClone(patch)
  const next = {
    ...existing,
    ...safePatch,
    uid: existing.uid,
    id: existing.uid,
    updatedAt: tsOf(safePatch.updatedAt) || Date.now()
  }
  await store.put(next)
  await tx.done
  return next
}

export async function deleteWeeklyTask(id) {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction('weekly_tasks', 'readwrite')
  const store = tx.objectStore('weekly_tasks')
  const existing = await store.get(id)
  if (!existing) { await tx.done; return null }
  const next = applyTombstone(existing)
  await store.put(next)
  await tx.done
  return next
}

// ----- daily_checkins (v3): 任务打卡记录（date+taskId 去重防重复打卡） -----
export async function addDailyCheckin(entry) {
  markSyncDirty()
  const db = await openDB()
  const now = Date.now()
  const row = withUid({
    ...entry,
    checkedBy: entry.checkedBy || 'kid',
    completedAt: tsOf(entry.completedAt) || now,
    updatedAt: tsOf(entry.updatedAt) || tsOf(entry.completedAt) || now
  })
  await db.add('daily_checkins', row)
  if (entry && typeof entry === 'object') Object.assign(entry, { uid: row.uid, id: row.uid })
  return row.uid
}

export async function getDailyCheckinsByDate(date) {
  const db = await openDB()
  return liveOnly(await db.getAllFromIndex('daily_checkins', 'by_date', date))
}

export async function getAllDailyCheckins() {
  const db = await openDB()
  return liveOnly(await db.getAll('daily_checkins'))
}

export async function getAllDailyCheckinsRaw() {
  const db = await openDB()
  return db.getAll('daily_checkins')
}

// 云同步 pull 用：带显式 uid 覆盖写
export async function putDailyCheckin(entry) {
  markSyncDirty()
  const db = await openDB()
  const row = withUid(entry)
  await db.put('daily_checkins', row)
  return row.uid
}

// ----- daily_homework (v4): 每日学校作业 -----
// homework: { date, tasks: [{ name, points, done }], source, createdAt }
export async function addDailyHomework(homework) {
  markSyncDirty()
  const db = await openDB()
  const now = Date.now()
  const row = withUid({
    ...homework,
    createdAt: tsOf(homework.createdAt) || now,
    updatedAt: tsOf(homework.updatedAt) || now
  })
  await db.add('daily_homework', row)
  if (homework && typeof homework === 'object') Object.assign(homework, { uid: row.uid, id: row.uid })
  return row.uid
}

export async function getDailyHomeworkByDate(date) {
  const db = await openDB()
  return liveOnly(await db.getAllFromIndex('daily_homework', 'by_date', date))
}

export async function getDailyHomeworkAll() {
  const db = await openDB()
  return liveOnly(await db.getAll('daily_homework'))
}

export async function getDailyHomeworkAllRaw() {
  const db = await openDB()
  return db.getAll('daily_homework')
}

export async function updateDailyHomework(id, patch) {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction('daily_homework', 'readwrite')
  const store = tx.objectStore('daily_homework')
  const existing = await store.get(id)
  if (!existing || isTombstoned(existing)) {
    await tx.done
    return null
  }
  // patch 可能携带 Vue reactive Proxy（store state里的 tasks），
  // Proxy 无法被 structured clone → DataCloneError。JSON 往返剥离元数据。
  const safePatch = safeClone(patch)
  const next = {
    ...existing,
    ...safePatch,
    uid: existing.uid,
    id: existing.uid,
    updatedAt: tsOf(safePatch.updatedAt) || Date.now()
  }
  await store.put(next)
  await tx.done
  return next
}

export async function deleteCheckin(id) {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction('checkins', 'readwrite')
  const store = tx.objectStore('checkins')
  const existing = await store.get(id)
  if (!existing) { await tx.done; return null }
  const next = applyTombstone(existing)
  await store.put(next)
  await tx.done
  return next
}

export async function deleteDailyCheckin(id) {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction('daily_checkins', 'readwrite')
  const store = tx.objectStore('daily_checkins')
  const existing = await store.get(id)
  if (!existing) { await tx.done; return null }
  const next = applyTombstone(existing)
  await store.put(next)
  await tx.done
  return next
}

export async function deleteDailyHomework(id) {
  markSyncDirty()
  const db = await openDB()
  const tx = db.transaction('daily_homework', 'readwrite')
  const store = tx.objectStore('daily_homework')
  const existing = await store.get(id)
  if (!existing) { await tx.done; return null }
  const next = applyTombstone(existing)
  await store.put(next)
  await tx.done
  return next
}

export async function putDailyHomework(homework) {
  markSyncDirty()
  const db = await openDB()
  const row = withUid(homework)
  await db.put('daily_homework', row)
  return row.uid
}

// ----- t018c 重置为云端基线：显式清空积分账本（用户主动操作，绝不是同步副作用） -----
// 只清「账本」四表：checkins / daily_checkins / exchange_requests / daily_homework。
// 保留「配置」两表：projects（项目/奖品库）与 weekly_tasks（闯关课表）——那不是积分数据。
// 逐表 clear 而非单事务：Safari 下 await 后同事务续请求有 auto-commit 坑，慢一步换稳。
export async function clearLedgerData() {
  markSyncDirty()
  const db = await openDB()
  const counts = {}
  for (const name of LEDGER_STORES) {
    const all = await db.getAll(name)
    counts[name] = all.length
    await db.clear(name)
  }
  return counts
}

// 重置失败回滚用：清空前把四表原样（含墓碑）拷出来
export async function getLedgerSnapshot() {
  const db = await openDB()
  const snap = {}
  for (const name of LEDGER_STORES) snap[name] = await db.getAll(name)
  return snap
}

// 恢复清空前的账本（逐表 clear + 原样 put；uid 已存在，不会生成新行）
export async function restoreLedgerSnapshot(snapshot) {
  markSyncDirty()
  const db = await openDB()
  for (const name of LEDGER_STORES) {
    const rows = (snapshot && snapshot[name]) || []
    const tx = db.transaction(name, 'readwrite')
    const store = tx.objectStore(name)
    store.clear()
    for (const row of rows) store.put(withUid(row))
    await tx.done
  }
}
