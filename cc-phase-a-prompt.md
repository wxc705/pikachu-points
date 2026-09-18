# CC Phase A — 皮卡丘积分系统 v3：iPad 横版今日任务清单

## 项目背景
Vue 3 + Vite + Pinia + IndexedDB(idb) + Tailwind 的儿童积分应用（6岁孩子用）。
工作目录: `C:\Users\Windows\projects\pikachu-points`
现有儿童端 `/kid` 是手机竖版 KidHome.vue。本次要新增 **iPad 横版今日任务清单**：
孩子打开 iPad 看到今日任务列表（来自 QC 每周课表），点卡片完成 → 得积分。

## 任务范围（严格）
**只改/建这 4 个文件，其他一律不动：**
1. 修改 `src/services/db.js` — 新增 weekly_tasks + daily_checkins 两个 IndexedDB 表 + CRUD
2. 修改 `src/stores/points.js` — 新增 weeklyTasks/dailyCheckins 状态 + 种子导入 + 今日任务 computed + 打卡 action
3. 新建 `src/kid/TodayTasks.vue` — iPad 横版主界面（今日任务清单 + 底部4tab导航）
4. 修改 `src/router.js` — 新增 /kid/today 路由 + iPad 自动跳转

**禁止：**
- 不新建其他文件（种子数据已有 `src/services/weeklyTasksSeed.js`，直接 import）
- 不 touch package.json / vite.config.js / src/main.js / src/services/sync.js / src/App.vue
- 不改 KidHome.vue / WeeklyPlan.vue / Checkin.vue / Home.vue 等旧页面
- 不删旧逻辑（旧 weekly_plan 打卡流程保留，新旧共存）
- 不跑 npm install / build（我来验证）
- 不要写云同步（Supabase 同步是后续 Phase）

## 文件 1: src/services/db.js（修改）
把 `DB_VERSION` 从 2 改成 3。在 `upgrade(db)` 回调里追加（沿用现有 `if (!db.objectStoreNames.contains(...))` 模式）：

```js
// v3: 每周任务（QC 课表）
if (!db.objectStoreNames.contains('weekly_tasks')) {
  const store = db.createObjectStore('weekly_tasks', { keyPath: 'id', autoIncrement: true })
  store.createIndex('by_weekday', 'weekday', { unique: false })
}
// v3: 任务打卡记录（date+taskId 去重用于防重复打卡）
if (!db.objectStoreNames.contains('daily_checkins')) {
  const store = db.createObjectStore('daily_checkins', { keyPath: 'id', autoIncrement: true })
  store.createIndex('by_date', 'date', { unique: false })
  store.createIndex('by_task', 'taskId', { unique: false })
}
```

新增导出函数（风格对齐现有函数，加注释）：
- `getAllWeeklyTasks()` — db.getAll('weekly_tasks')
- `getWeeklyTasksByWeekday(weekday)` — getAllFromIndex('weekly_tasks', 'by_weekday', weekday)
- `addWeeklyTask(task)` — db.add（task 含 weekday/timeSlot/name/points/category/sortOrder/isActive）
- `putWeeklyTask(task)` — db.put
- `updateWeeklyTask(id, patch)` — 事务读-合并-写（参考现有 updateProject 实现）
- `deleteWeeklyTask(id)` — db.delete
- `addDailyCheckin(entry)` — db.add('daily_checkins')
- `getDailyCheckinsByDate(date)` — getAllFromIndex('daily_checkins', 'by_date', date)
- `getAllDailyCheckins()` — db.getAll('daily_checkins')

## 文件 2: src/stores/points.js（修改）

顶部 import 增加（现有 import 保留）：
```js
import {
  getAllWeeklyTasks as dbGetAllWeeklyTasks,
  addWeeklyTask as dbAddWeeklyTask,
  getAllDailyCheckins as dbGetAllDailyCheckins,
  addDailyCheckin as dbAddDailyCheckin
} from '../services/db.js'
import { WEEKLY_TASKS_SEED } from '../services/weeklyTasksSeed.js'
```

新增状态（现有 refs 旁）：
```js
const weeklyTasks = ref([])     // 每周任务配置
const dailyCheckins = ref([])   // 任务打卡记录
```

修改 `load()` 的 Promise.all，增加 `dbGetAllWeeklyTasks(), dbGetAllDailyCheckins()`，对应赋值。

新增函数/计算属性：

```js
// 种子导入：weekly_tasks 空时从课表种子导入（幂等）
async function seedWeeklyTasksIfEmpty() {
  if (weeklyTasks.value.length > 0) return false
  const existing = await dbGetAllWeeklyTasks()
  if (existing.length > 0) { weeklyTasks.value = existing; return false }
  for (const t of WEEKLY_TASKS_SEED) {
    await dbAddWeeklyTask({ ...t, isActive: true })
  }
  weeklyTasks.value = await dbGetAllWeeklyTasks()
  return true
}

// 今日任务：按当天 weekday 匹配，isActive 过滤，sortOrder 排序
const todayTasks = computed(() => {
  const wd = dateToWeekday()
  return weeklyTasks.value
    .filter((t) => t.weekday === wd && t.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.id || 0) - (b.id || 0))
})

// 今日已完成任务 id 集合（防重复打卡）
const todayTaskDoneIds = computed(() => {
  const s = new Set()
  for (const c of dailyCheckins.value) {
    if (c.date === today.value) s.add(c.taskId)
  }
  return s
})

// 今日任务所得积分
const todayTaskEarned = computed(() =>
  dailyCheckins.value
    .filter((c) => c.date === today.value)
    .reduce((s, c) => s + (c.points || 0), 0)
)

// 打卡一个任务：写 daily_checkins（状态）+ checkins（积分记账）
// 同一天同一任务重复点击 → 返回 null（幂等）
async function addTaskCheckin(task) {
  if (todayTaskDoneIds.value.has(task.id)) return null
  const now = Date.now()
  const dailyEntry = {
    date: today.value,
    taskId: task.id,
    taskName: task.name,
    category: task.category,
    points: task.points,
    completedAt: now,
    checkedBy: 'kid'
  }
  await dbAddDailyCheckin(dailyEntry)
  // 积分记账复用现有 checkins 表（totalPoints 自动累计）
  const checkinEntry = {
    projectId: null,
    projectName: task.name,
    category: task.category,
    pointsEarned: task.points,
    taskId: task.id,
    checkedBy: 'kid',
    date: today.value,
    createdAt: now
  }
  await dbAddCheckin(checkinEntry)
  dailyCheckins.value = [...dailyCheckins.value, dailyEntry]
  checkins.value = [...checkins.value, checkinEntry]
  return { dailyEntry, checkinEntry }
}
```

（注意：`addCheckin`、`dbAddCheckin` 已在 store 内可用，不需要重新 import。）
`load()` 里加载后**立即调用 seedWeeklyTasksIfEmpty()**（load 内部 await 它，保证首次进入就有任务）。

return 导出新增：`weeklyTasks, dailyCheckins, todayTasks, todayTaskDoneIds, todayTaskEarned, seedWeeklyTasksIfEmpty, addTaskCheckin`

## 文件 3: src/kid/TodayTasks.vue（新建 — 本轮核心）

iPad 横版今日任务清单。**6 岁孩子用：大按钮、大字体、最少点击。**

### 布局（landscape 优先，min-height 100dvh）
```
┌──────────────────────────────────────────────┐
│ 周三 📅 8.31          ⭐ 2,304   🔥 5天      │  ← header: 日期+累计积分+连续打卡
├──────────────────────────────────────────────┤
│  📋 今日任务（今日已得 +12分）                │
│  ┌────────────────────────────────────────┐ │
│  │ 🌅 早晨   多邻国1-2单元    [✅ +1]      │ │  ← 已完成: 绿底+✓
│  │ ⏰ 16:30  思维             [+1 打卡]    │ │  ← 当前时段: 金色高亮边框
│  │ ⏰ 18:00  语文预习          [+1 打卡]    │ │  ← 未来: 白卡
│  │ ⏰ 18:00  英语              [+1 打卡]    │ │
│  │ ⏰ 20:30  阅读15min         [+1 打卡]    │ │
│  └────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ [📋 今日] [🏆 积分] [📝 申请] [⚙️ 设置]    │  ← 底部 tab 导航（大按钮）
└──────────────────────────────────────────────┘
```

### 结构与交互
- `<script setup>` + Pinia store（usePointsStore）
- onMounted: await store.load(); await store.seedWeeklyTasksIfEmpty()
- **今日 tab（默认）**：
  - 遍历 `store.todayTasks`
  - 卡片字段：timeSlot + name + points；已完成显示 ✅（todayTaskDoneIds.has(task.id)）
  - 完成交互：点击未完成任务卡 → 弹确认（简单 confirm 或直接完成+动画）→ `store.addTaskCheckin(task)` → 播放积分跳动动画（CSS keyframe，卡片上 +1 飘起）→ 更新今日已得
  - 时段高亮：解析当前时间（HH:mm），'早晨' 视为 08:00 前；当前时段卡片加高亮 class；已过时段且未完成 → 卡片置灰（opacity + 灰底）
  - 任务名带 emoji 圆底图标（简单映射：英语🔤/语文📖/思维🧠/国象♟️/编程💻/乐高🧱/阅读📚/写字✏️/游戏🎮/体能💪/实验🔬/卡丁车🏎️/诗歌🎵，未匹配用⭐）
- **积分 tab**：总积分大数字 + 连续打卡 + 今日已得 + 最近 10 条打卡记录（checkins 按 createdAt 倒序）
- **申请 tab**：占位卡片「📝 申请功能开发中，敬请期待」（Phase 2 实现）
- **设置 tab**：占位「⚙️ 设置功能开发中」+ 一个"返回家长端"链接（`<a href="#/">`）
- 底部导航：4 个大 tab 按钮（≥88px 高），当前 tab 高亮，点击切换（内部 ref activeTab，无路由跳转）
- 完成动画：打卡成功时卡片短暂弹跳 + 积分 +N 上浮淡出（CSS keyframes）；可选 Web Audio 短 beep

### 样式要求（scoped，写在 TodayTasks.vue 内）
- 继承 kid-style.css 设计语言：暖奶油渐变背景（#fff9ec→#ffe9d6）、DM Sans + 中文系统字体、圆角卡片 28px、三层 warm-lift 阴影（描边+环境+主提升）、金橙积分色 #ffb627/#ff8a00、暖黑 #222222
- 按钮 ≥96px 高、圆角 20px、按压 3D 下压动画（transform: translateY(2px) + shadow 收缩）
- 任务卡片 flex 布局：左侧时段（等宽、灰字），中间名称（大号 26-30px），右侧积分/按钮
- 完成态：绿色背景 + ✓ 圆形
- 当前时段：金色 3px 边框 + 轻微发光
- 已过未完成：opacity 0.55 + 灰底
- 不要用 Tailwind class 堆砌（这个组件自包含 scoped CSS，防止与家长端样式冲突）
- body class：挂载时 document.body.classList.add('kid-mode')，卸载时移除（和 KidHome.vue 一致）

## 文件 4: src/router.js（修改）

- import TodayTasks from './kid/TodayTasks.vue'
- 新增路由：`{ path: '/kid/today', name: 'kid-today', component: TodayTasks }`
- 文件顶部加 iPad 检测工具函数：
```js
function isIPad() {
  const ua = navigator.userAgent
  return /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}
```
- `/kid` 路由加 `beforeEnter`：iPad → `next('/kid/today')`，否则 `next()`（非 iPad 保持旧 KidHome）

## 验证清单（你写完自查）
1. db.js 无语法错误，DB_VERSION === 3
2. points.js 的 load() 加载了 weeklyTasks/dailyCheckins 且调用了 seedWeeklyTasksIfEmpty
3. TodayTasks.vue 引用的 store 字段都在 points.js return 里
4. router.js 的 /kid/today 已注册，/kid 有 iPad 跳转
5. 搜索确认没有新增第 5 个文件（git status 应该只显示 3 改 1 新 + 已有 weeklyTasksSeed.js）

## 代码风格
- 中文注释（解释"为什么"，不写废话）
- 现有代码风格：4 空格缩进、单引号、无分号（与仓库一致）
- 保持可读性 > 炫技
