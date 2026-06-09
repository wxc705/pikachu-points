import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import {
  getAllCheckins,
  addCheckin as dbAddCheckin,
  getAllRequests,
  addExchangeRequest as dbAddRequest,
  updateExchangeRequest as dbUpdateRequest,
  getProjects as dbGetProjects,
  addProject as dbAddProject,
  updateProject as dbUpdateProject,
  setProjectActive as dbSetProjectActive,
  deleteProject as dbDeleteProject,
  getAllWeeklyPlans as dbGetAllWeeklyPlans,
  setWeeklyPlan as dbSetWeeklyPlan,
  clearWeeklyPlan as dbClearWeeklyPlan
} from '../services/db.js'
import { DEFAULT_THEME_ID, getTheme } from '../themes/index.js'
import { push as syncPush, pull as syncPull, sync as syncBoth, onSyncChange, getSyncState, clearCloud as syncClearCloud } from '../services/sync.js'
import { dateToWeekday } from '../utils/weekday.js'

const MILESTONES = [100, 500, 1000, 5000]
const MILESTONE_KEY = 'pikachu-points:reached-milestones'
const THEME_KEY = 'pikachu-points:theme-id'

function loadReached() {
  try {
    const raw = localStorage.getItem(MILESTONE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(arr.filter((n) => MILESTONES.includes(n)))
  } catch (e) {
    return new Set()
  }
}

function saveReached(set) {
  try {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify([...set]))
  } catch (e) {
    // 静默：localStorage 不可用（隐私模式）
  }
}

function todayStr() {
 const d = new Date()
 const y = d.getFullYear()
 const m = String(d.getMonth() +1).padStart(2, '0')
 const day = String(d.getDate()).padStart(2, '0')
 return `${y}-${m}-${day}`
}

function dateToStr(d) {
 const y = d.getFullYear()
 const m = String(d.getMonth() +1).padStart(2, '0')
 const day = String(d.getDate()).padStart(2, '0')
 return `${y}-${m}-${day}`
}

// 把主题色应用到 :root 的 CSS 变量
export function applyTheme(theme) {
 if (typeof document === 'undefined' || !theme || !theme.colors) return
 const root = document.documentElement
 for (const [key, value] of Object.entries(theme.colors)) {
 root.style.setProperty(`--color-${key}`, value)
 }
 // 文字色（默认 ink/ink-soft 来自 style.css，仅在主题未提供时回退）
 if (!theme.colors.ink) root.style.setProperty('--color-ink', '#1f2937')
 if (!theme.colors['ink-soft']) root.style.setProperty('--color-ink-soft', '#6b7280')
}

export const usePointsStore = defineStore('points', () => {
 const checkins = ref([])
 const requests = ref([])
 const projects = ref([])
 const weeklyPlans = ref([]) // { weekday, projectIds }[]
 const loaded = ref(false)

 const approvedRequests = computed(() =>
 requests.value.filter((r) => r.status === 'approved')
 )

 //今日已打卡的项目 id集合（用于 Checkin 页禁用按钮）
 const todayCheckedProjectIds = computed(() => {
 const ids = new Set()
 for (const c of checkins.value) {
 if (c.date === today.value) ids.add(c.projectId)
 }
 return ids
 })

 //今日每个项目的累计次数（range 项目允许打多次）
 const todayProjectCounts = computed(() => {
 const m = new Map()
 for (const c of checkins.value) {
 if (c.date !== today.value) continue
 m.set(c.projectId, (m.get(c.projectId) ||0) +1)
 }
 return m
 })

 const totalEarned = computed(() =>
 checkins.value.reduce((s, c) => s + (c.pointsEarned ||0),0)
 )

 const totalSpent = computed(() =>
 approvedRequests.value.reduce((s, r) => s + (r.pointsCost ||0),0)
 )

 const totalPoints = computed(() => totalEarned.value - totalSpent.value)

 const today = ref(todayStr())
 const currentDate = today

 const todayEarned = computed(() =>
 checkins.value
 .filter((c) => c.date === today.value)
 .reduce((s, c) => s + (c.pointsEarned ||0),0)
 )

 const todaySpent = computed(() =>
 approvedRequests.value
 .filter((r) => r.date === today.value)
 .reduce((s, r) => s + (r.pointsCost ||0),0)
 )

 const todayNet = computed(() => todayEarned.value - todaySpent.value)

 //连续打卡天数：今天（或昨天）起往前数连续有任意 checkin 的天数
 const currentStreak = computed(() => {
 if (checkins.value.length ===0) return 0
 const dates = new Set(checkins.value.map((c) => c.date))
 const td = today.value
 let cursor = new Date(td + 'T00:00:00')
 // 今天还没打卡时，从昨天开始数（保留昨日起的连胜）
 if (!dates.has(td)) {
 cursor.setDate(cursor.getDate() -1)
 if (!dates.has(dateToStr(cursor))) return 0
 }
 let streak =0
 while (dates.has(dateToStr(cursor))) {
 streak++
 cursor.setDate(cursor.getDate() -1)
 }
 return streak
 })

 async function load(force = false) {
 if (loaded.value && !force) return
 const [c, r, p, w] = await Promise.all([
 getAllCheckins(),
 getAllRequests(),
 dbGetProjects(),
 dbGetAllWeeklyPlans()
 ])
 checkins.value = c
 requests.value = r
 projects.value = p
 weeklyPlans.value = w
 loaded.value = true
 }

 async function refresh() {
 loaded.value = false
 await load(true)
 }

 async function addCheckin(project) {
 const points = project._pickedPoints ?? project.points ??0
 const entry = {
 projectId: project.id,
 projectName: project.name,
 category: project.category,
 pointsEarned: points,
 date: today.value,
 createdAt: Date.now()
 }
 await dbAddCheckin(entry)
 checkins.value = [...checkins.value, entry]
 return entry
 }

 async function addRatingCheckin(score, note = '') {
 const entry = {
 projectId: null,
 projectName: '学习效果评分',
 category: '评价',
 pointsEarned: score,
 note,
 checkedBy: 'parent',
 date: today.value,
 createdAt: Date.now()
 }
 await dbAddCheckin(entry)
 checkins.value = [...checkins.value, entry]
 return entry
 }

 // 拨付积分（家长手动加减分，独立 category='拨付'）
 async function addGrantPoints(points, reason = '') {
 const entry = {
 projectId: null,
 projectName: reason.trim() || '家长拨付',
 category: '拨付',
 pointsEarned: points, // 可正可负
 note: '',
 checkedBy: 'parent',
 date: today.value,
 createdAt: Date.now()
 }
 await dbAddCheckin(entry)
 checkins.value = [...checkins.value, entry]
 return entry
 }

 async function addRequest(reward, pointsCost, note = '') {
 const entry = {
 reward,
 pointsCost,
 note,
 status: 'pending',
 viewed: false,
 date: today.value,
 createdAt: Date.now()
 }
 await dbAddRequest(entry)
 requests.value = [...requests.value, entry]
 return entry
 }

 async function updateRequest(id, patch) {
   const next = await dbUpdateRequest(id, patch)
   if (next) {
     requests.value = requests.value.map((r) => (r.id === id ? next : r))
   }
   return next
 }

 // ----- 项目（打卡/评分项目）CRUD -----
 async function addProjectItem({ category, name, points, pointRange, sortOrder }) {
   const entry = {
     category,
     name: name.trim(),
     points: points || 0,
     pointRange: pointRange && pointRange[1] > pointRange[0] ? pointRange : null,
     sortOrder: sortOrder || 0,
     isActive: true
   }
   const id = await dbAddProject(entry)
   const stored = { ...entry, id }
   projects.value = [...projects.value, stored].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
   return stored
 }

 async function updateProjectItem(id, patch) {
   const next = await dbUpdateProject(id, patch)
   if (next) {
     projects.value = projects.value.map((p) => (p.id === id ? next : p))
   }
   return next
 }

 async function toggleProjectActive(id) {
   const p = projects.value.find((p) => p.id === id)
   if (!p) return null
   const next = await dbSetProjectActive(id, !p.isActive)
   if (next) {
     projects.value = projects.value.map((x) => (x.id === id ? next : x))
   }
   return next
 }

 async function deleteProjectItem(id) {
   await dbDeleteProject(id)
   projects.value = projects.value.filter((p) => p.id !== id)
 }

 const projectsByCategory = computed(() => {
   const map = new Map()
   for (const p of projects.value) {
     if (!map.has(p.category)) map.set(p.category, [])
     map.get(p.category).push(p)
   }
   for (const list of map.values()) {
     list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
   }
   return map
 })

 // 今日推荐项目（按 weekday 匹配）
 const todayRecommended = computed(() => {
  const wd = dateToWeekday()
  const plan = weeklyPlans.value.find((w) => w.weekday === wd)
  if (!plan || !plan.projectIds || plan.projectIds.length === 0) return []
  const ids = new Set(plan.projectIds)
  return projects.value.filter((p) => ids.has(p.id) && p.isActive !== false)
 })

 async function setWeeklyPlanItem(weekday, projectIds) {
  await dbSetWeeklyPlan(weekday, projectIds)
  const next = weeklyPlans.value.filter((w) => w.weekday !== weekday)
  next.push({ weekday, projectIds: [...new Set(projectIds)] })
  weeklyPlans.value = next.sort((a, b) => a.weekday - b.weekday)
 }

 async function clearWeeklyPlanItem(weekday) {
  await dbClearWeeklyPlan(weekday)
  weeklyPlans.value = weeklyPlans.value.filter((w) => w.weekday !== weekday)
 }

 // 里程碑状态
 const reachedMilestones = ref(loadReached())
 const pendingMilestone = ref(null)

 // 主题状态
 const currentThemeId = ref(
 (() => {
 try {
 const saved = localStorage.getItem(THEME_KEY)
 if (saved && getTheme(saved)) return saved
 } catch (e) { /* 静默 */ }
 return DEFAULT_THEME_ID
 })()
 )

 function setTheme(id) {
 const theme = getTheme(id)
 currentThemeId.value = theme.id
 try {
 localStorage.setItem(THEME_KEY, theme.id)
 } catch (e) { /* 静默 */ }
 applyTheme(theme)
 }

 // 同步状态（云同步）
 const isSyncing = ref(false)
 const lastSyncedAt = ref(getSyncState().lastSyncedAt)
 const lastSyncError = ref(getSyncState().lastError)
 const lastSyncResult = ref(getSyncState().lastResult)

 // 订阅 sync 状态变化
 const unsubscribeSync = onSyncChange((s) => {
 isSyncing.value = s.isSyncing
 lastSyncedAt.value = s.lastSyncedAt
 lastSyncError.value = s.lastError
 lastSyncResult.value = s.lastResult
 })
 onScopeDispose(() => unsubscribeSync())

 // 午夜自动刷新：每分钟检查一次，跨日自动更新 today
 const _midnightTimer = setInterval(() => {
 const now = todayStr()
 if (now !== today.value) {
 today.value = now
 }
 }, 60_000)
 onScopeDispose(() => clearInterval(_midnightTimer))

 // 自动拉取：每 30s 从云拉取一次（Supabase 配好后才生效）
 const _pullTimer = setInterval(async () => {
 if (isSyncing.value) return // 正在同步中，跳过
 try {
 const r = await syncPull()
 if (r.pulled > 0) await load(true) // 有新数据则刷新 store
 } catch (e) { /* 静默：未配 Supabase 时 pull 会抛错，忽略 */ }
 }, 30_000)
 onScopeDispose(() => clearInterval(_pullTimer))

 async function syncPushToCloud() {
 try {
 const r = await syncPush()
 await refresh() // push 不改本地但清下缓存保险
 return r
 } catch (e) {
 throw e
 }
 }

 async function syncPullFromCloud() {
 const r = await syncPull()
 if (r.pulled > 0) await refresh()
 return r
 }

 async function syncBothWays() {
 const r = await syncBoth()
 await refresh()
 return r
 }

 function clearCloud() {
 syncClearCloud()
 lastSyncedAt.value = null
 lastSyncResult.value = null
 }

 // 监听 totalPoints：跨过新阈值时弹一次
 watch(totalPoints, (newVal, oldVal) => {
   if (typeof newVal !== 'number' || newVal <= 0) return
   for (const m of MILESTONES) {
     if (newVal >= m && !reachedMilestones.value.has(m)) {
       reachedMilestones.value.add(m)
       pendingMilestone.value = m
       break // 一次只弹一个，避免叠加
     }
   }
 })

 watch(reachedMilestones, (s) => saveReached(s), { deep: true })

 function clearMilestone() {
   pendingMilestone.value = null
 }

 return {
 checkins,
 requests,
 projects,
 projectsByCategory,
 weeklyPlans,
 todayRecommended,
 setWeeklyPlanItem,
 clearWeeklyPlanItem,
 approvedRequests,
 totalEarned,
 totalSpent,
 totalPoints,
 todayEarned,
 todaySpent,
 todayNet,
 today,
 currentDate,
 todayCheckedProjectIds,
 todayProjectCounts,
 currentStreak,
 load,
 refresh,
 addCheckin,
 addRatingCheckin,
 addGrantPoints,
 addRequest,
 updateRequest,
 addProjectItem,
 updateProjectItem,
 toggleProjectActive,
 deleteProjectItem,
 pendingMilestone,
 clearMilestone,
 currentThemeId,
 setTheme,
 isSyncing,
 lastSyncedAt,
 lastSyncError,
 lastSyncResult,
 syncPushToCloud,
 syncPullFromCloud,
 syncBothWays,
 clearCloud
 }
})
