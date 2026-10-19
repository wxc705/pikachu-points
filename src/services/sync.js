// 云同步抽象层
// 抽象：push / pull / sync 三个核心函数。view 文件只调这三个，不知道底下是 localStorage 还是 Supabase。
// 当前实现：Supabase（真云端，跨设备同步）
// 未来：可以一行 import 切到 localStorage 模式（fallback）

import { getAllCheckins, getAllRequests, getProjects, putCheckin, putProject, putExchangeRequest, getAllWeeklyTasks, putWeeklyTask, getAllDailyCheckins, putDailyCheckin, getDailyHomeworkAll, putDailyHomework, clearSyncDirty, setSyncDirtySuppressed, markSyncDirty } from './db.js'

import { supabase, isSupabaseConfigured } from './supabase.js'
import { SYNC_ENGINE, isSyncEngineConfigured, syncEngineClient } from './githubSync.js'

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

// ==== 数据安全红线（t018）：pull 只能做并集合并，任何情况下都不得减少本地行 ====
// 背景：空云端/读取失败若被当成"空表"去覆盖本地，等于账本被清零——数据毁灭级 bug。
// 三道闸：① 云端该表为空或拉取失败 → 整表跳过，本地一个字节都不写；
//        ② 合并全程只 put 不 delete；③ 收尾按表比对行数，任何表变少立即回滚快照并报错。
const SYNC_TABLES = ['checkins', 'exchange_requests', 'projects', 'weekly_tasks', 'daily_homework', 'daily_checkins']

function readAllTables() {
  return Promise.all([
    getAllCheckins(), getAllRequests(), getProjects(),
    getAllWeeklyTasks(), getDailyHomeworkAll(), getAllDailyCheckins()
  ]).then(([c, r, p, w, h, d]) => ({
    checkins: c, exchange_requests: r, projects: p,
    weekly_tasks: w, daily_homework: h, daily_checkins: d
  }))
}

const PUT_BY_TABLE = {
  checkins: putCheckin,
  exchange_requests: putExchangeRequest,
  projects: putProject,
  weekly_tasks: putWeeklyTask,
  daily_homework: putDailyHomework,
  daily_checkins: putDailyCheckin
}

function countsOf(snap) {
  const out = {}
  for (const t of SYNC_TABLES) out[t] = (snap[t] || []).length
  return out
}

// 空/失败 → 返回 null（调用方整表跳过）；有行才进合并
function unionRows(cloudRows, table, skippedEmpty) {
  if (!cloudRows || !cloudRows.length) {
    skippedEmpty.push(table)
    return null
  }
  return cloudRows
}

// 收尾闸：行数只增不减，发现变少 → 用 pull 前快照回滚该表，并把红线违规写进错误
async function guardNoShrink(before, skippedEmpty) {
  const after = await readAllTables()
  const violations = []
  for (const t of SYNC_TABLES) {
    const b = (before[t] || []).length
    const a = (after[t] || []).length
    if (a < b) {
      for (const row of before[t]) await PUT_BY_TABLE[t](row) // 回滚到 pull 前
      violations.push(`${t}: ${b}→${a}（已回滚）`)
    }
  }
  if (violations.length) {
    const msg = `数据安全红线违规(pull 减行): ${violations.join('; ')}`
    console.error('[sync][DATA-SAFETY] ' + msg)
    markSyncDirty() // 回滚的行要补推上云（此刻仍在 suppressed 窗口内，由 finally 统一补标）
    return { msg, before: countsOf(before), after: countsOf(before), skippedEmpty, restored: true }
  }
  return { msg: null, before: countsOf(before), after: countsOf(after), skippedEmpty, restored: false }
}


// ---- 核心接口 ----

// push: 把本地 IndexedDB 全部数据推到云（last-write-wins by id）
export async function push() {
 if (!isSyncEngineConfigured()) {
 throw new Error(ENGINE_UNCONFIGURED_MSG)
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
     task_id: c.taskId || null,

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
     const { error } = await engine.from('checkins').upsert(rows, { onConflict: 'id' })
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
     const { error } = await engine.from('exchange_requests').upsert(rows, { onConflict: 'id' })
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
     const { error } = await engine.from('projects').upsert(rows, { onConflict: 'id' })
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
     skips: t.skips && t.skips.length ? t.skips : null,
     created_at: t.createdAt || null,
     updated_at: nowIso()
   }))
   try {
     const { error } = await engine.from('weekly_tasks').upsert(rows, { onConflict: 'id' })
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
     const { error } = await engine.from('daily_homework').upsert(rows, { onConflict: 'id' })
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
     const { error } = await engine.from('daily_checkins').upsert(rows, { onConflict: 'id' })
     if (error) throw error
     pushed += rows.length
   } catch (e) { errors.push({ table: 'daily_checkins', error: e.message || String(e) }) }
   }

 const ts = nowIso()
 state.lastSyncedAt = ts
 state.lastResult = { pushed, pulled: 0, errors, lastSyncedAt: ts }
 if (!errors.length) clearSyncDirty() // 全表成功才清脏标（部分失败留着下轮重试）

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
 if (!isSyncEngineConfigured()) {
 throw new Error(ENGINE_UNCONFIGURED_MSG)
 }
 if (state.isSyncing) return state.lastResult
 state.isSyncing = true
 state.lastError = null
 let guard = null // t018 数据安全闸（finally 里要用）
 notify()
 try {
 setSyncDirtySuppressed(true) // pull 回写期间抑制脏标（finally 里解除）
 const before = await readAllTables()      // 快照：pull 前各表行数/行内容
 const skippedEmpty = []                    // 云端为空或拉取失败而被整表跳过的表

 // 逐表拉取，表不存在/无权访问只记错误，不连坐其他表（核心打卡/兑换数据优先）
 const pullErrors = []
 const [cr, rr, pr, wt, dhr, dcr] = await Promise.allSettled([
   engine.from('checkins').select('*'),
   engine.from('exchange_requests').select('*'),
   engine.from('projects').select('*'),
   engine.from('weekly_tasks').select('*'),
   engine.from('daily_homework').select('*'),
   engine.from('daily_checkins').select('*')
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
 const checkinSig = (r) => JSON.stringify([r.date, r.projectId, r.projectName, r.category, r.pointsEarned, r.note, r.checkedBy, r.createdAt, r.taskId])

 const checkinSigs = new Set(localCheckins.map(checkinSig))

 const taskDayKeys = new Set(localCheckins.filter((x) => x.taskId).map((x) => x.date + '|' + x.taskId))

 for (const c of (unionRows(cloudCheckins, 'checkins', skippedEmpty) || [])) { // 空云/失败 → 整表跳过
 const row = {
   id: c.id,
   projectId: c.project_id,
   projectName: c.project_name,
   category: c.category,
   pointsEarned: c.points_earned,
   note: c.note,
   checkedBy: c.checked_by,
   date: c.date,
   createdAt: c.created_at,
   taskId: c.task_id || null,

 }
 const sig = checkinSig(row)

 if (checkinSigs.has(sig)) continue // 跨设备同内容副本(撞id重分配等) → 签名去重防双记

 if (row.taskId && taskDayKeys.has(row.date + '|' + row.taskId)) continue // 同日同任务已在本地 → 防双记

 const existing = localCheckinMap.get(c.id)
 if (!existing) {
 await putCheckin(row)
 checkinSigs.add(sig)

 if (row.taskId) taskDayKeys.add(row.date + '|' + row.taskId)

 pulled++
 } else {
 // 都有 → 哪个 createdAt 较新（fallback 到 id 大小）
 const eTs = existing.createdAt || existing.id || 0
 const cTs = row.createdAt || row.id || 0
 if (cTs > eTs) {
 await putCheckin(row)
 checkinSigs.add(sig)

 if (row.taskId) taskDayKeys.add(row.date + '|' + row.taskId)

 merged++
 }
 // 否则保留本地
 }
 }

 // ---- requests 合并 ----
 const localRequestMap = new Map(localRequests.map((r) => [r.id, r]))
 for (const r of (unionRows(cloudRequests, 'exchange_requests', skippedEmpty) || [])) {
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
 for (const p of (unionRows(cloudProjects, 'projects', skippedEmpty) || [])) {
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
 const localTaskMap = new Map(localWeeklyTasks.map((t) => [t.id, t]))

 const wtEq = (a, b) => a.weekday === b.weekday && a.timeSlot === b.timeSlot && a.name === b.name && a.points === b.points && a.category === b.category && a.sortOrder === b.sortOrder && !!a.isActive === !!b.isActive && (a.once || null) === (b.once || null) && JSON.stringify(a.skips || []) === JSON.stringify(b.skips || [])

 for (const t of (unionRows(cloudWeeklyTasks, 'weekly_tasks', skippedEmpty) || [])) {
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
     skips: Array.isArray(t.skips) ? t.skips : [],
     createdAt: t.created_at || 0
     }
   const prevT = localTaskMap.get(t.id)

   if (prevT) { if (wtEq(prevT, row)) continue; merged++ } else pulled++ // 等值跳过：防每30s无谓回写(回写会误标脏)

   await putWeeklyTask(row)

 }

 // ---- daily_checkins 合并 (v4.1) ----
 // append-only 流水：按 id 并集，两台设备的打卡都保留，不覆盖不删
 const localDaily = await getAllDailyCheckins()
 const localDailyIds = new Set(localDaily.map((d) => d.id))
 const localDailyTaskKeys = new Set(localDaily.map((x) => x.date + '|' + x.taskId)) // 本地行是 camelCase（task_id 恒 undefined → 防双记失效、跨设备同任务双记双算分）

 for (const d of (unionRows(cloudDailyCheckins, 'daily_checkins', skippedEmpty) || [])) {
   if (localDailyIds.has(d.id)) continue
   if (localDailyTaskKeys.has(d.date + '|' + d.task_id)) continue // 同日同任务已在本地(异id) → 防双记

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
   localDailyTaskKeys.add(d.date + '|' + d.task_id)

   pulled++
 }

 // ---- daily_homework 合并 (v4) ----
 // daily_homework 按 date 去重，同一天保留 createdAt 较新的
 const hwRows = unionRows(cloudHomework, 'daily_homework', skippedEmpty)
 if (hwRows) {
   const localHomework = await getDailyHomeworkAll()
   const localHwMap = new Map(localHomework.map((h) => [h.date, h]))
   for (const h of hwRows) {
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
 guard = await guardNoShrink(before, skippedEmpty) // 数据安全闸：行数只增不减，变少即回滚+报错
 if (guard.msg) state.lastError = guard.msg
 state.lastSyncedAt = ts
 state.lastResult = { pushed: 0, pulled, merged, errors: pullErrors, skippedEmpty: guard.skippedEmpty, guard: { before: guard.before, after: guard.after, shrunk: !!guard.restored }, lastSyncedAt: ts }
 return state.lastResult
} catch (e) {
 state.lastError = e.message || String(e)
 state.lastResult = { pushed: 0, pulled: 0, merged: 0, error: state.lastError }
 throw e
} finally {
 setSyncDirtySuppressed(false)
 if (guard && guard.restored) markSyncDirty() // 回滚过的行补推上云（抑制解除后才标）

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
 if (!isSyncEngineConfigured()) return
 // Supabase 没"全清"接口，要清得在 Dashboard 跑 SQL
 console.warn('[sync] clearCloud 不支持远程清空（安全）')
}
