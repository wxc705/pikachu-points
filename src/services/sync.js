// 云同步抽象层
// 抽象：push / pull / sync 三个核心函数。view 文件只调这三个，不知道底下是 localStorage 还是 Supabase。
// 当前实现：Supabase（真云端，跨设备同步）
// 未来：可以一行 import 切到 localStorage 模式（fallback）

import { getAllCheckins, getAllRequests, getProjects, putCheckin, putProject, putExchangeRequest } from './db.js'
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
   viewed: r.viewed || false,
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

// pull: 从云拉取，按 createdAt 合并（last-write-wins）
// 关键：不再 clearAll() 后覆盖！改为按 id 合并，云端/本地哪条 createdAt 较新就保留哪条
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

 let pulled = 0
 let merged = 0

 // ---- checkins 合并 ----
 const localCheckinMap = new Map(localCheckins.map((c) => [c.id, c]))
 for (const c of (cloudCheckins || [])) {
 const row = {
   id: c.id,
   projectId: c.project_id,
   projectName: c.project_name,
   category: c.category,
   pointsEarned: c.points_earned,
   note: c.note,
   checkedBy: c.checked_by,
   date: c.date,
   createdAt: c.created_at
 }
 const existing = localCheckinMap.get(c.id)
 if (!existing) {
 await putCheckin(row)
 pulled++
 } else {
 // 都有 → 哪个 createdAt 较新（fallback 到 id 大小）
 const eTs = existing.createdAt || existing.id || 0
 const cTs = row.createdAt || row.id || 0
 if (cTs > eTs) {
 await putCheckin(row)
 merged++
 }
 // 否则保留本地
 }
 }

 // ---- requests 合并 ----
 const localRequestMap = new Map(localRequests.map((r) => [r.id, r]))
 for (const r of (cloudRequests || [])) {
 const row = {
 id: r.id,
 reward: r.reward,
 pointsCost: r.points_cost,
 note: r.note,
 status: r.status,
 viewed: r.viewed || false,
 date: r.date,
 createdAt: r.created_at,
 decidedAt: r.decided_at
 }
 const existing = localRequestMap.get(r.id)
 if (!existing) {
 await putExchangeRequest(row)
 pulled++
 } else {
 const eTs = existing.createdAt || existing.id || 0
 const cTs = row.createdAt || row.id || 0
 if (cTs > eTs) {
 await putExchangeRequest(row)
 merged++
 }
 }
 }

 // ---- projects 合并 ----
 // projects 是家长配置（不是数据），冲突时云端优先（家长最后配置赢）
 const localProjectMap = new Map(localProjects.map((p) => [p.id, p]))
 for (const p of (cloudProjects || [])) {
 const row = {
 id: p.id,
 category: p.category,
 name: p.name,
 points: p.points,
 pointRange: p.point_range,
 sortOrder: p.sort_order,
 isActive: p.is_active
 }
 const existing = localProjectMap.get(p.id)
 if (!existing) {
 await putProject(row)
 pulled++
 } else {
 // projects 任何时候云端优先（家长配置可能改了）
 await putProject(row)
 merged++
 }
 }

 const ts = nowIso()
 state.lastSyncedAt = ts
 state.lastResult = { pushed: 0, pulled, merged, lastSyncedAt: ts }
 return state.lastResult
 } catch (e) {
 state.lastError = e.message || String(e)
 state.lastResult = { pushed: 0, pulled: 0, merged: 0, error: state.lastError }
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
