import { openDB as idbOpen } from 'idb'

export const DB_NAME = 'pikachu-points'
export const DB_VERSION = 3

let _dbPromise = null

export async function openDB() {
 if (_dbPromise) return _dbPromise
 _dbPromise = idbOpen(DB_NAME, DB_VERSION, {
 upgrade(db) {
 if (!db.objectStoreNames.contains('projects')) {
 const store = db.createObjectStore('projects', {
 keyPath: 'id',
 autoIncrement: true
 })
 store.createIndex('by_category', 'category', { unique: false })
 }
 if (!db.objectStoreNames.contains('checkins')) {
 const store = db.createObjectStore('checkins', {
 keyPath: 'id',
 autoIncrement: true
 })
 store.createIndex('by_date', 'date', { unique: false })
 store.createIndex('by_project', 'projectId', { unique: false })
 }
 if (!db.objectStoreNames.contains('exchange_requests')) {
 const store = db.createObjectStore('exchange_requests', {
 keyPath: 'id',
 autoIncrement: true
 })
 store.createIndex('by_status', 'status', { unique: false })
 }
 // v2: 每周学习计划（按 weekday 存）
 if (!db.objectStoreNames.contains('weekly_plan')) {
 const store = db.createObjectStore('weekly_plan', {
 keyPath: 'weekday'
 })
 store.createIndex('by_weekday', 'weekday', { unique: true })
 }
 // v3: 每周任务（QC 课表）
 if (!db.objectStoreNames.contains('weekly_tasks')) {
 const store = db.createObjectStore('weekly_tasks', {
 keyPath: 'id',
 autoIncrement: true
 })
 store.createIndex('by_weekday', 'weekday', { unique: false })
 }
 // v3: 任务打卡记录（date+taskId 去重用于防重复打卡）
 if (!db.objectStoreNames.contains('daily_checkins')) {
 const store = db.createObjectStore('daily_checkins', {
 keyPath: 'id',
 autoIncrement: true
 })
 store.createIndex('by_date', 'date', { unique: false })
 store.createIndex('by_task', 'taskId', { unique: false })
 }
 }
 })
 return _dbPromise
}

// ----- projects -----
export async function addProject(project) {
 const db = await openDB()
 return db.add('projects', { ...project, updatedAt: Date.now() })
}

export async function updateProject(id, patch) {
 const db = await openDB()
 const tx = db.transaction('projects', 'readwrite')
 const store = tx.objectStore('projects')
 const existing = await store.get(id)
 if (!existing) {
 await tx.done
 return null
 }
 const next = { ...existing, ...patch, id, updatedAt: Date.now() }
 await store.put(next)
 await tx.done
 return next
}

export async function setProjectActive(id, isActive) {
 return updateProject(id, { isActive })
}

export async function deleteProject(id) {
 const db = await openDB()
 await db.delete('projects', id)
}

export async function getProjects() {
 const db = await openDB()
 return db.getAll('projects')
}

export async function getActiveProjects() {
 const db = await openDB()
 const all = await db.getAll('projects')
 return all.filter((p) => p.isActive !== false)
}

// ----- checkins -----
export async function addCheckin(checkin) {
 const db = await openDB()
 return db.add('checkins', checkin)
}

export async function getCheckinsByDate(date) {
 const db = await openDB()
 return db.getAllFromIndex('checkins', 'by_date', date)
}

export async function getAllCheckins() {
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
 const db = await openDB()
 return db.add('exchange_requests', req)
}

export async function updateExchangeRequest(id, patch) {
 const db = await openDB()
 const tx = db.transaction('exchange_requests', 'readwrite')
 const store = tx.objectStore('exchange_requests')
 const existing = await store.get(id)
 if (!existing) {
 await tx.done
 return null
 }
 const next = { ...existing, ...patch, id }
 await store.put(next)
 await tx.done
 return next
}

export async function getPendingRequests() {
 const db = await openDB()
 const all = await db.getAllFromIndex('exchange_requests', 'by_status', 'pending')
 return all
}

export async function getAllRequests() {
 const db = await openDB()
 return db.getAll('exchange_requests')
}

// ----- 同步辅助：清空全部 + 覆盖写入 -----
export async function clearAll() {
 const db = await openDB()
 const tx = db.transaction(['projects', 'checkins', 'exchange_requests'], 'readwrite')
 await tx.objectStore('projects').clear()
 await tx.objectStore('checkins').clear()
 await tx.objectStore('exchange_requests').clear()
 await tx.done
}

export async function putCheckin(checkin) {
 const db = await openDB()
 return db.put('checkins', checkin)
}

export async function putProject(project) {
 const db = await openDB()
 return db.put('projects', project)
}

export async function putExchangeRequest(req) {
 const db = await openDB()
 return db.put('exchange_requests', req)
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
 const db = await openDB()
 return db.put('weekly_plan', { weekday, projectIds: [...new Set(projectIds)] })
}

export async function clearWeeklyPlan(weekday) {
 const db = await openDB()
 return db.delete('weekly_plan', weekday)
}

// ----- weekly_tasks (v3): 每周任务（QC 课表） -----
// task: { weekday, timeSlot, name, points, category, sortOrder, isActive }
export async function getAllWeeklyTasks() {
 const db = await openDB()
 return db.getAll('weekly_tasks')
}

export async function getWeeklyTasksByWeekday(weekday) {
 const db = await openDB()
 return db.getAllFromIndex('weekly_tasks', 'by_weekday', weekday)
}

export async function addWeeklyTask(task) {
 const db = await openDB()
 return db.add('weekly_tasks', { ...task, isActive: task.isActive !== false })
}

export async function putWeeklyTask(task) {
 const db = await openDB()
 return db.put('weekly_tasks', task)
}

export async function updateWeeklyTask(id, patch) {
 const db = await openDB()
 const tx = db.transaction('weekly_tasks', 'readwrite')
 const store = tx.objectStore('weekly_tasks')
 const existing = await store.get(id)
 if (!existing) {
 await tx.done
 return null
 }
 const next = { ...existing, ...patch, id }
 await store.put(next)
 await tx.done
 return next
}

export async function deleteWeeklyTask(id) {
 const db = await openDB()
 await db.delete('weekly_tasks', id)
}

// ----- daily_checkins (v3): 任务打卡记录（date+taskId 去重防重复打卡） -----
export async function addDailyCheckin(entry) {
 const db = await openDB()
 return db.add('daily_checkins', entry)
}

export async function getDailyCheckinsByDate(date) {
 const db = await openDB()
 return db.getAllFromIndex('daily_checkins', 'by_date', date)
}

export async function getAllDailyCheckins() {
 const db = await openDB()
 return db.getAll('daily_checkins')
}
