# Phase 1a — 数据层扩展（daily_homework 表 + 成就系统 + store 扩展）

## 项目信息
- 绝对路径: `C:\Users\Windows\projects\pikachu-points`
- 技术栈: Vue 3 + Vite + Pinia + IndexedDB (idb)
- 当前 DB_VERSION: 3（升级到 4）

## 任务概述
为皮卡丘积分系统 v4 建立数据层基础。共修改 2 个文件。

---

## 文件 1: `C:\Users\Windows\projects\pikachu-points\src\services\db.js`

### 改动: 升级 DB_VERSION 3→4，新增 `daily_homework` 表

在 `openDB()` 函数中:
1. 把 `DB_VERSION` 从 3 改为 4
2. 在 upgrade 回调的末尾（`daily_checkins` 创建之后）新增:

```js
// v4: 每日学校作业（家长每天录入，按日期存储）
if (!db.objectStoreNames.contains('daily_homework')) {
  const store = db.createObjectStore('daily_homework', {
    keyPath: 'id',
    autoIncrement: true
  })
  store.createIndex('by_date', 'date', { unique: false })
}
```

### 改动: 文件末尾新增 daily_homework CRUD 函数

在文件最后（`getAllDailyCheckins` 函数之后）添加:

```js
// ----- daily_homework (v4): 每日学校作业 -----
// homework: { date, tasks: [{ name, points, done }], source, createdAt }
export async function addDailyHomework(homework) {
  const db = await openDB()
  return db.add('daily_homework', { ...homework, createdAt: Date.now() })
}

export async function getDailyHomeworkByDate(date) {
  const db = await openDB()
  return db.getAllFromIndex('daily_homework', 'by_date', date)
}

export async function getDailyHomeworkAll() {
  const db = await openDB()
  return db.getAll('daily_homework')
}

export async function updateDailyHomework(id, patch) {
  const db = await openDB()
  const tx = db.transaction('daily_homework', 'readwrite')
  const store = tx.objectStore('daily_homework')
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

export async function deleteDailyHomework(id) {
  const db = await openDB()
  await db.delete('daily_homework', id)
}
```

---

## 文件 2: `C:\Users\Windows\projects\pikachu-points\src\stores\points.js`

### 改动 1: 导入新函数

在文件顶部的 import 语句中，从 `'../services/db.js'` 新增导入:
```js
import {
  // ... 现有导入保持不变 ...
  getAllDailyHomework as dbGetAllDailyHomework,
  addDailyHomework as dbAddDailyHomework,
  updateDailyHomework as dbUpdateDailyHomework
} from '../services/db.js'
```

### 改动 2: store 内新增状态和 computed

在 store 内部（`dailyCheckins` ref 附近）新增:

```js
const dailyHomework = ref([]) // 每日学校作业记录
```

在 `load()` 函数中，把 `dailyHomework` 加到 Promise.all:

```js
async function load(force = false) {
  if (loaded.value && !force) return
  const [c, r, p, w, wt, dc, dh] = await Promise.all([
    getAllCheckins(),
    getAllRequests(),
    dbGetProjects(),
    dbGetAllWeeklyPlans(),
    dbGetAllWeeklyTasks(),
    dbGetAllDailyCheckins(),
    dbGetAllDailyHomework()
  ])
  checkins.value = c
  requests.value = r
  projects.value = p
  weeklyPlans.value = w
  weeklyTasks.value = wt
  dailyCheckins.value = dc
  dailyHomework.value = dh
  loaded.value = true
  await seedWeeklyTasksIfEmpty()
}
```

### 改动 3: 今日学校作业 computed

在 `todayTasks` computed 附近新增:

```js
// 今日学校作业（从 daily_homework 表读取当天记录）
const todayHomework = computed(() => {
  const entry = dailyHomework.value.find((h) => h.date === today.value)
  if (!entry || !entry.tasks) return []
  return entry.tasks.map((t, i) => ({
    ...t,
    id: `hw:${today.value}:${i}`,
    category: '学校',
    key: `homework:${today.value}:${i}`
  }))
})

// 今日学校作业已完成数
const todayHomeworkDoneCount = computed(() => {
  return todayHomework.value.filter((t) => t.done).length
})

// 今日学校作业所得积分
const todayHomeworkEarned = computed(() => {
  return todayHomework.value
    .filter((t) => t.done)
    .reduce((s, t) => s + (t.points || 0), 0)
})
```

### 改动 4: 学校作业打卡方法

在 `addTaskCheckin` 函数附近新增:

```js
// 打卡学校作业（标记 done=true + 写 checkins 积分记账）
async function addHomeworkCheckin(task) {
  // 找到 daily_homework 中的记录
  const entry = dailyHomework.value.find((h) => h.date === today.value)
  if (!entry) return null
  
  // 找到具体任务
  const taskIndex = entry.tasks.findIndex((t, i) => `hw:${today.value}:${i}` === task.id)
  if (taskIndex === -1 || entry.tasks[taskIndex].done) return null
  
  // 标记 done
  entry.tasks[taskIndex].done = true
  await dbUpdateDailyHomework(entry.id, { tasks: entry.tasks })
  dailyHomework.value = [...dailyHomework.value]
  
  // 积分记账（复用 checkins 表）
  const checkinEntry = {
    projectId: null,
    projectName: task.name,
    category: '学校',
    pointsEarned: task.points,
    homeworkId: entry.id,
    homeworkIndex: taskIndex,
    checkedBy: 'kid',
    date: today.value,
    createdAt: Date.now()
  }
  await dbAddCheckin(checkinEntry)
  checkins.value = [...checkins.value, checkinEntry]
  
  return { homeworkEntry: entry, checkinEntry }
}
```

### 改动 5: 家长端写入学校作业方法

```js
// 家长端：写入今日学校作业（覆盖写入，同一天只保留最新）
async function saveTodayHomework(tasks) {
  const existing = dailyHomework.value.find((h) => h.date === today.value)
  const payload = {
    date: today.value,
    tasks: tasks.map((t) => ({
      name: t.name,
      points: t.points || 2,
      done: false
    })),
    source: '家长录入'
  }
  if (existing) {
    const next = await dbUpdateDailyHomework(existing.id, payload)
    if (next) {
      dailyHomework.value = dailyHomework.value.map((h) => (h.id === existing.id ? next : h))
    }
    return next
  } else {
    const id = await dbAddDailyHomework(payload)
    const stored = { ...payload, id }
    dailyHomework.value = [...dailyHomework.value, stored]
    return stored
  }
}
```

### 改动 6: 成就系统 computed

在 store 内新增:

```js
// 成就徽章定义
const ACHIEVEMENT_DEFS = [
  { id: 'first', name: '初次打卡', emoji: '🔥', desc: '第一次完成任务' },
  { id: '100', name: '百分选手', emoji: '⭐', desc: '累计获得 100 分' },
  { id: '500', name: '五百分侠', emoji: '💎', desc: '累计获得 500 分' },
  { id: '1000', name: '千分王者', emoji: '👑', desc: '累计获得 1000 分' },
  { id: '5000', name: '万分传说', emoji: '🌈', desc: '累计获得 5000 分' },
  { id: 'streak3', name: '三日连续', emoji: '🔥', desc: '连续打卡 3 天' },
  { id: 'streak7', name: '七日达人', emoji: '⭐', desc: '连续打卡 7 天' },
  { id: 'streak14', name: '半月英雄', emoji: '🏆', desc: '连续打卡 14 天' },
  { id: 'streak30', name: '月度冠军', emoji: '👑', desc: '连续打卡 30 天' },
  { id: 'read30', name: '阅读小达人', emoji: '📚', desc: '阅读任务累计 30 次' },
  { id: 'chess30', name: '象棋小王子', emoji: '♟️', desc: '国象任务累计 30 次' },
  { id: 'write30', name: '练字高手', emoji: '✏️', desc: '练字任务累计 30 次' },
  { id: 'sport30', name: '运动健将', emoji: '💪', desc: '运动任务累计 30 次' },
]

// 按 category 统计打卡次数
function countByCategory(category) {
  return checkins.value.filter((c) => c.category === category).length
}

// 实时计算成就解锁状态
const achievements = computed(() => {
  const total = totalEarned.value
  const streak = currentStreak.value
  return ACHIEVEMENT_DEFS.map((def) => {
    let unlocked = false
    switch (def.id) {
      case 'first': unlocked = checkins.value.length > 0; break
      case '100': unlocked = total >= 100; break
      case '500': unlocked = total >= 500; break
      case '1000': unlocked = total >= 1000; break
      case '5000': unlocked = total >= 5000; break
      case 'streak3': unlocked = streak >= 3; break
      case 'streak7': unlocked = streak >= 7; break
      case 'streak14': unlocked = streak >= 14; break
      case 'streak30': unlocked = streak >= 30; break
      case 'read30': unlocked = countByCategory('阅读') >= 30; break
      case 'chess30': unlocked = countByCategory('国象') >= 30; break
      case 'write30': unlocked = countByCategory('写字') >= 30; break
      case 'sport30': unlocked = countByCategory('运动') >= 30; break
    }
    return { ...def, unlocked }
  })
})

// 已解锁成就数
const unlockedCount = computed(() => achievements.value.filter((a) => a.unlocked).length)
```

### 改动 7: return 语句导出

在 store return 对象中新增导出:
```js
dailyHomework,
todayHomework,
todayHomeworkDoneCount,
todayHomeworkEarned,
addHomeworkCheckin,
saveTodayHomework,
achievements,
unlockedCount,
ACHIEVEMENT_DEFS,
```

---

## 禁止清单
- **不要**新建任何文件
- **不要**修改 `main.js` / `router.js` / `App.vue`
- **不要**修改 `sync.js` / `supabase.js` / `sound.js`
- **不要**修改 `KidHome.vue` / `TodayTasks.vue`（Phase 1c 处理）
- **不要**修改 `ParentDashboard.vue`（Phase 1d 处理）
- **不要**删除或重命名任何现有函数
- **不要**修改 `weeklyTasksSeed.js`
- **不要**引入任何 npm 新依赖

## 验证清单
修改完成后运行:
1. `cd C:\Users\Windows\projects\pikachu-points && npm run build` — 构建成功无报错
2. `grep -c "daily_homework" dist/assets/index-*.js` — 结果 > 0（新表已打入 bundle）
3. `grep -c "ACHIEVEMENT_DEFS" dist/assets/index-*.js` — 结果 > 0（成就系统已打入 bundle）
4. `grep -c "saveTodayHomework" dist/assets/index-*.js` — 结果 > 0
