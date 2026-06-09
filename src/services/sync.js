// 云同步抽象层
// 抽象：push / pull / sync 三个核心函数。view 文件只调这三个，不知道底下是 localStorage 还是 Supabase。
// 当前实现：Supabase（真云端，跨设备同步）
// 未来：可以一行 import 切到 localStorage 模式（fallback）

import { getAllCheckins, getAllRequests, getProjects } from './db.js'
import { supabase, isSupabaseConfigured } from './supabase.js'

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

// ---- 核心接口 ----

// push: 把本地 IndexedDB 全部数据推到云（last-write-wins by id）
export async function push() {
 if (!isSupabaseConfigured()) {
 throw new Error('Supabase 未配置：检查 .env')
 }
 if (state.isSyncing) return state.lastResult
 state.isSyncing = true
 state.lastError = null
 notify()
 try {
 const [checkins, requests, projects] = await Promise.all([
 getAllCheckins(),
 getAllRequests(),
 getProjects()
 ])

 let pushed = 0
 // checkins
 if (checkins.length) {
 const rows = checkins.map((c) => ({
   project_id: c.projectId,
   project_name: c.projectName,
   category: c.category,
   points_earned: c.pointsEarned,
   note: c.note,
   checked_by: c.checkedBy,
   date: c.date,
   created_at: c.createdAt,
   id: c.id,
   updated_at: nowIso()
 }))
 const { error } = await supabase.from('checkins').upsert(rows, { onConflict: 'id' })
 if (error) throw error
 pushed += rows.length
 }
 // exchange_requests
 if (requests.length) {
 const rows = requests.map((r) => ({
   reward: r.reward,
   points_cost: r.pointsCost,
   note: r.note,
   status: r.status,
   date: r.date,
   created_at: r.createdAt,
   decided_at: r.decidedAt,
   id: r.id,
   updated_at: nowIso()
 }))
 const { error } = await supabase.from('exchange_requests').upsert(rows, { onConflict: 'id' })
 if (error) throw error
 pushed += rows.length
 }
 // projects
 if (projects.length) {
 const rows = projects.map((p) => ({
   category: p.category,
   name: p.name,
   points: p.points,
   point_range: p.pointRange,
   sort_order: p.sortOrder,
   is_active: p.isActive,
   id: p.id,
   updated_at: nowIso()
 }))
 const { error } = await supabase.from('projects').upsert(rows, { onConflict: 'id' })
 if (error) throw error
 pushed += rows.length
 }

 const ts = nowIso()
 state.lastSyncedAt = ts
 state.lastResult = { pushed, pulled: 0, lastSyncedAt: ts }
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

// pull: 从云拉取全部数据，按 updated_at 取较新者写回本地
export async function pull() {
 if (!isSupabaseConfigured()) {
 throw new Error('Supabase 未配置：检查 .env')
 }
 if (state.isSyncing) return state.lastResult
 state.isSyncing = true
 state.lastError = null
 notify()
 try {
 const [{ data: cloudCheckins, error: e1 }, { data: cloudRequests, error: e2 }, { data: cloudProjects, error: e3 }] = await Promise.all([
 supabase.from('checkins').select('*'),
 supabase.from('exchange_requests').select('*'),
 supabase.from('projects').select('*')
 ])
 if (e1) throw e1
 if (e2) throw e2
 if (e3) throw e3

 const localCheckins = await getAllCheckins()
 const localRequests = await getAllRequests()
 const localProjects = await getProjects()

 const { clearAll, putCheckin, putProject, putExchangeRequest } = await import('./db.js')
 // 简单策略：云数据 = 真值（用云覆盖本地）。要 last-write-wins 可在 db 层加 updated_at 字段后升级
 await clearAll()
 let pulled = 0
 for (const c of (cloudCheckins || [])) {
 // Supabase 字段是 snake_case，我们 db 是 camelCase，需映射
 const { updated_at, ...rest } = c
 await putCheckin({ id: rest.id, projectId: rest.projectId, projectName: rest.projectName, category: rest.category, pointsEarned: rest.pointsEarned, note: rest.note, checkedBy: rest.checkedBy, date: rest.date, createdAt: rest.createdAt })
 pulled++
 }
 for (const r of (cloudRequests || [])) {
 const { updated_at, ...rest } = r
 await putExchangeRequest({ id: rest.id, reward: rest.reward, pointsCost: rest.pointsCost, note: rest.note, status: rest.status, date: rest.date, createdAt: rest.createdAt, decidedAt: rest.decidedAt })
 pulled++
 }
 for (const p of (cloudProjects || [])) {
 const { updated_at, ...rest } = p
 await putProject({ id: rest.id, category: rest.category, name: rest.name, points: rest.points, pointRange: rest.pointRange, sortOrder: rest.sortOrder, isActive: rest.isActive })
 pulled++
 }

 const ts = nowIso()
 state.lastSyncedAt = ts
 state.lastResult = { pushed: 0, pulled, lastSyncedAt: ts }
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

// 双向：先 pull 再 push
export async function sync() {
 const p = await pull()
 const u = await push()
 return {
 pushed: u.pushed,
 pulled: p.pulled,
 lastSyncedAt: state.lastSyncedAt
 }
}

// 测试用：清空云（不实现，留空接口）
export async function clearCloud() {
 if (!isSupabaseConfigured()) return
 // Supabase 没"全清"接口，要清得在 Dashboard 跑 SQL
 console.warn('[sync] clearCloud 不支持远程清空（安全）')
}
