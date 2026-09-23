// 云同步抽象层
// 抽象：push / pull / sync 三个核心函数。view 文件只调这三个，不知道底下是 localStorage 还是 Supabase。
// 当前实现：Supabase（真云端，跨设备同步）
// 未来：可以一行 import 切到 localStorage 模式（fallback）

import { getAllCheckins, getAllRequests, getProjects, putCheckin, putProject, putExchangeRequest, getAllWeeklyTasks, putWeeklyTask, getAllDailyCheckins, putDailyCheckin, getDailyHomeworkAll, putDailyHomework } from './db.js'
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
 const [checkins, requests, projects, weeklyTasks, dailyCheckins] = await Promise.all([
   getAllCheckins(),
   getAllRequests(),
   getProjects(),
   getAllWeeklyTasks(),
   getAllDailyCheckins()
 ])

 let pushed = 0
 const errors = []
 // 逐表 upsert，失败不连坐其他表：一张表报错（如表不存在/字段不匹配）只记错误，
 // 已成功的表照常写入云端，最后汇总抛出（UI 能显示具体哪张表、为什么失败）
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
   try {
     const { error } = await supabase.from('checkins').upsert(rows, { onConflict: 'id' })
     if (error) throw error
     pushed += rows.length
   } catch (e) { errors.push({ table: 'checkins', error: e.message || String(e) }) }
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
   try {
     const { error } = await supabase.from('exchange_requests').upsert(rows, { onConflict: 'id' })
     if (error) throw error
     pushed += rows.length
   } catch (e) { errors.push({ table: 'exchange_requests', error: e.message || String(e) }) }
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
     updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : nowIso()
   }))
   try {
     const { error } = await supabase.from('projects').upsert(rows, { onConflict: 'id' })
     if (error) throw error
     pushed += rows.length
   } catch (e) { errors.push({ table: 'projects', error: e.message || String(e) }) }
 }
 // weekly_tasks (v5 闯关课表) — 家长配置
 if (weeklyTasks.length) {
   const rows = weeklyTasks.map((t) => ({
     id: t.id,
     weekday: t.weekday,
     time_slot: t.timeSlot,
     name: t.name,
     points: t.points,
     category: t.category,
     sort_order: t.sortOrder,
     is_active: t.isActive !== false,
     once: t.once || null,
     created_at: t.createdAt || null,
     updated_at: nowIso()
   }))
   try {
     const { error } = await supabase.from('weekly_tasks').upsert(rows, { onConflict: 'id' })
     if (error) throw error
     pushed += rows.length
   } catch (e) { errors.push({ table: 'weekly_tasks', error: e.message || String(e) }) }
 }
 // daily_homework (v4)
 const dailyHomework = await getDailyHomeworkAll()
 if (dailyHomework.length) {
   const rows = dailyHomework.map((h) => ({
     id: h.id,
     date: h.date,
     tasks: h.tasks,
     source: h.source,
     created_at: h.createdAt ? new Date(h.createdAt).toISOString() : nowIso()
   }))
   try {
     const { error } = await supabase.from('daily_homework').upsert(rows, { onConflict: 'id' })
     if (error) throw error
     pushed += rows.length
   } catch (e) { errors.push({ table: 'daily_homework', error: e.message || String(e) }) }
   }
   // daily_checkins (v4.1 闯关打卡流水) — append-only，按 id upsert
   if (dailyCheckins.length) {
   const rows = dailyCheckins.map((d) => ({
     id: d.id,
     date: d.date,
     task_id: d.taskId,
     task_name: d.taskName,
     category: d.category,
     points: d.points,
     completed_at: d.completedAt || null,
     checked_by: d.checkedBy || 'kid',
     updated_at: nowIso()
   }))
   try {
     const { error } = await supabase.from('daily_checkins').upsert(rows, { onConflict: 'id' })
     if (error) throw error
     pushed += rows.length
   } catch (e) { errors.push({ table: 'daily_checkins', error: e.message || String(e) }) }
   }

 const ts = nowIso()
 state.lastSyncedAt = ts
 state.lastResult = { pushed, pulled: 0, errors, lastSyncedAt: ts }
 // 部分表失败不 throw：返回完整结果（含 errors），UI 显示"部分推送 + 具体失败表"
 // 核心数据（打卡/兑换）已成功写入云端，不应被一张失败的表连坐
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
 // 逐表拉取，表不存在/无权访问只记错误，不连坐其他表（核心打卡/兑换数据优先）
 const pullErrors = []
 const [cr, rr, pr, wt, dhr, dcr] = await Promise.allSettled([
   supabase.from('checkins').select('*'),
   supabase.from('exchange_requests').select('*'),
   supabase.from('projects').select('*'),
   supabase.from('weekly_tasks').select('*'),
   supabase.from('daily_homework').select('*'),
   supabase.from('daily_checkins').select('*')
 ])
 const cloudCheckins = cr.status === 'fulfilled' && !cr.value.error ? cr.value.data : null
 if (cr.status === 'rejected' || (cr.value && cr.value.error)) pullErrors.push({ table: 'checkins', error: cr.status === 'rejected' ? cr.reason.message : cr.value.error.message })
 const cloudRequests = rr.status === 'fulfilled' && !rr.value.error ? rr.value.data : null
 if (rr.status === 'rejected' || (rr.value && rr.value.error)) pullErrors.push({ table: 'exchange_requests', error: rr.status === 'rejected' ? rr.reason.message : rr.value.error.message })
 const cloudProjects = pr.status === 'fulfilled' && !pr.value.error ? pr.value.data : null
 if (pr.status === 'rejected' || (pr.value && pr.value.error)) pullErrors.push({ table: 'projects', error: pr.status === 'rejected' ? pr.reason.message : pr.value.error.message })
 const cloudWeeklyTasks = wt.status === 'fulfilled' && !wt.value.error ? wt.value.data : null
 if (wt.status === 'rejected' || (wt.value && wt.value.error)) pullErrors.push({ table: 'weekly_tasks', error: wt.status === 'rejected' ? wt.reason.message : wt.value.error.message })
 const cloudHomework = dhr.status === 'fulfilled' && !dhr.value.error ? dhr.value.data : null
 if (dhr.status === 'rejected' || (dhr.value && dhr.value.error)) pullErrors.push({ table: 'daily_homework', error: dhr.status === 'rejected' ? dhr.reason.message : dhr.value.error.message })
 const cloudDailyCheckins = dcr.status === 'fulfilled' && !dcr.value.error ? dcr.value.data : null
 if (dcr.status === 'rejected' || (dcr.value && dcr.value.error)) pullErrors.push({ table: 'daily_checkins', error: dcr.status === 'rejected' ? dcr.reason.message : dcr.value.error.message })
 if (pullErrors.length) state.lastError = pullErrors.map((x) => `${x.table}: ${x.error}`).join(' | ')

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
 // projects 是家长配置，用 updatedAt 做 last-write-wins（避免同步顺序把本地改动覆盖）
 const localProjectMap = new Map(localProjects.map((p) => [p.id, p]))
 for (const p of (cloudProjects || [])) {
 const row = {
   id: p.id,
   category: p.category,
   name: p.name,
   points: p.points,
   pointRange: p.point_range,
   sortOrder: p.sort_order,
   isActive: p.is_active,
   updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : 0
 }
 const existing = localProjectMap.get(p.id)
 if (!existing) {
 await putProject(row)
 pulled++
 } else {
   // last-write-wins：云端 updatedAt 较新才覆盖本地
   const eTs = existing.updatedAt || 0
   const cTs = row.updatedAt || 0
   if (cTs > eTs) {
     await putProject(row)
     merged++
   }
   // else: 本地较新，保留（下次 push 传上去）
 }
 }

 // ---- weekly_tasks 合并 (v5 闯关课表) ----
 // 家长配置：同 id 云端优先单行覆盖；本地多出的行保留（daily_checkins.taskId 引用它，绝不删）
 // 已知限制：删除不同步、无 LWW —— 待后端方案落地后细化（见 TODO-supabase-sync.md）
 const localWeeklyTasks = await getAllWeeklyTasks()
 const localTaskIds = new Set(localWeeklyTasks.map((t) => t.id))
 for (const t of (cloudWeeklyTasks || [])) {
   const row = {
     id: t.id,
     weekday: t.weekday,
     timeSlot: t.time_slot,
     name: t.name,
     points: t.points,
     category: t.category,
     sortOrder: t.sort_order,
     isActive: t.is_active !== false,
     once: t.once || null,
     createdAt: t.created_at || 0
     }
   if (localTaskIds.has(t.id)) merged++
   else pulled++
   await putWeeklyTask(row)
 }

 // ---- daily_checkins 合并 (v4.1) ----
 // append-only 流水：按 id 并集，两台设备的打卡都保留，不覆盖不删
 const localDaily = await getAllDailyCheckins()
 const localDailyIds = new Set(localDaily.map((d) => d.id))
 for (const d of (cloudDailyCheckins || [])) {
   if (localDailyIds.has(d.id)) continue
   await putDailyCheckin({
     id: d.id,
     date: d.date,
     taskId: d.task_id,
     taskName: d.task_name,
     category: d.category,
     points: d.points,
     completedAt: d.completed_at || 0,
     checkedBy: d.checked_by || 'kid'
   })
   pulled++
 }

 // ---- daily_homework 合并 (v4) ----
 // daily_homework 按 date 去重，同一天保留 createdAt 较新的
 if (cloudHomework && cloudHomework.length) {
   const localHomework = await getDailyHomeworkAll()
   const localHwMap = new Map(localHomework.map((h) => [h.date, h]))
   for (const h of cloudHomework) {
     const row = {
       id: h.id,
       date: h.date,
       tasks: h.tasks,
       source: h.source,
       createdAt: h.created_at ? new Date(h.created_at).getTime() : 0
     }
     const existing = localHwMap.get(h.date)
     if (!existing) {
       await putDailyHomework(row)
       pulled++
     } else {
       const eTs = existing.createdAt || existing.id || 0
       const cTs = row.createdAt || row.id || 0
       if (cTs > eTs) {
         await putDailyHomework(row)
         merged++
       }
     }
   }
 }

 const ts = nowIso()
 state.lastSyncedAt = ts
 state.lastResult = { pushed: 0, pulled, merged, errors: pullErrors, lastSyncedAt: ts }
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
 const errors = [...(p.errors || []), ...(u.errors || [])]
 return {
   pushed: u.pushed,
   pulled: p.pulled,
   errors,
   lastSyncedAt: state.lastSyncedAt
 }
}

// 测试用：清空云（不实现，留空接口）
export async function clearCloud() {
 if (!isSupabaseConfigured()) return
 // Supabase 没"全清"接口，要清得在 Dashboard 跑 SQL
 console.warn('[sync] clearCloud 不支持远程清空（安全）')
}
