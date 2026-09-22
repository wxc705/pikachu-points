# Phase 5 — 项目管理 → 闯关管理（数据统一到 weekly_tasks）

## 项目信息
- 绝对路径: `C:\Users\Windows\projects\pikachu-points`
- 技术栈: Vue 3 + Vite + Pinia + IndexedDB (idb)
- **用 bash 执行命令，NOT PowerShell**（CC在Windows跑PowerShell的npm命令会死循环）

## 背景
儿童端 iPad"闯关"任务来自 `weekly_tasks` 表（按 weekday 分布的课表种子），
但家长端没有任何编辑入口（`updateWeeklyTask` 函数存在但无人调用）。
家长端"项目管理"页管理的是 `projects` 表（服务打卡页/周计划），两套数据割裂。
**目标：把 ProjectManage 改造成"闯关管理"，直接编辑 weekly_tasks。**

## 数据模型（weekly_tasks 表，已有表结构，不要动 db.js 的 store 定义）
```js
{ id, weekday: 1-7, timeSlot: '早晨' | '16:30-17:00', name: '思维',
  points: 1, category: '思维', sortOrder: 20, isActive: true }
```
- db.js 已有函数（**可直接 import，不要重复造**）：
  `getAllWeeklyTasks / getWeeklyTasksByWeekday / addWeeklyTask / putWeeklyTask / updateWeeklyTask / deleteWeeklyTask`
- 参考种子: `src/services/weeklyTasksSeed.js`（47条，weekday/timeSlot/points规范）

---

## 改动 1: `src/stores/points.js` — 补 weekly_tasks CRUD

当前 import 只有 `getAllWeeklyTasks as dbGetAllWeeklyTasks, addWeeklyTask as dbAddWeeklyTask`。
**补 import** `updateWeeklyTask as dbUpdateWeeklyTask, deleteWeeklyTask as dbDeleteWeeklyTask`。

在 `seedWeeklyTasksIfEmpty` 函数之后新增 3 个方法，并**加进 store return 列表**：

```js
// ----- 闯关管理（家长端）: weekly_tasks CRUD -----
async function addWeeklyTaskItem(t) {
  const id = await dbAddWeeklyTask({
    weekday: Number(t.weekday), timeSlot: t.timeSlot || '早晨', name: t.name.trim(),
    points: Number(t.points) || 1, category: t.category || '闯关',
    sortOrder: t.sortOrder || Date.now() % 100000, isActive: true,
    createdAt: Date.now()
  })
  weeklyTasks.value = await dbGetAllWeeklyTasks()
  return id
}
async function updateWeeklyTaskItem(id, patch) {
  await dbUpdateWeeklyTask(id, patch)
  weeklyTasks.value = await dbGetAllWeeklyTasks()
}
async function deleteWeeklyTaskItem(id) {
  await dbDeleteWeeklyTask(id)
  weeklyTasks.value = await dbGetAllWeeklyTasks()
}
```
return 列表加上 `addWeeklyTaskItem, updateWeeklyTaskItem, deleteWeeklyTaskItem`。

**⚠️ 坑1（前车之鉴）**：`dbUpdateWeeklyTask` 若内部把 patch 直接 put 进 IDB，
patch 里的 Vue reactive Proxy 会抛 DataCloneError。先读 db.js 该函数实现，
若无 JSON 清洗，给它加 `patch = JSON.parse(JSON.stringify(patch))`（参照同文件
`updateDailyHomework` 的写法与注释）。

## 改动 2: `src/views/ProjectManage.vue` — 改造成闯关管理

### 2a. 文案
- 页面标题 `📝 项目管理` → `⚔️ 闯关管理`
- 副标题/说明（若有）→ `设定每周闯关内容，小朋友每天在 iPad 上闯关`

### 2b. 主列表数据源：projects 按分类分组 → weeklyTasks 按星期分组
- 分组：`const groups = [1,2,3,4,5,6,7].map(w => ({ w, label: ['周一'..'周日'][w-1],
  list: store.weeklyTasks.filter(t => t.weekday === w && t.isActive !== false)
    .sort((a,b) => (a.sortOrder||0)-(b.sortOrder||0)) }))`
  （weekday.js 有 WEEKDAYS 常量可用，从 `../utils/weekday.js` import）
- 每组标题：`周一` + `（N 项）`；**今天是星期几的组高亮**（用 `dateToWeekday()`，
  今日组标题加个 `今天` 徽标）
- 每项显示：`timeSlot ｜ name ｜ +points 分` + 操作按钮 `↑ ↓ ✎ ⏸ ✕`
  - ↑↓ = sortOrder 交换（同 weekday 内，参照原页交换逻辑，调 updateWeeklyTaskItem）
  - ✎ = 编辑（打开 modal）
  - ⏸ = isActive 切换（调 updateWeeklyTaskItem(id, {isActive:false})；已停用的项
    显示在组内末尾灰色+▶️恢复按钮）
  - ✕ = 删除（先 confirm("确认删除闯关项？") 再 deleteWeeklyTaskItem）
- 顶部加 `📥 导入每周闯关（课表种子）` 按钮：调用 `store.seedWeeklyTasksIfEmpty()`，
  返回 true → 提示"✅ 已导入"；false → "ℹ️ 已有闯关内容，未导入"。
  （提示复用页面现有的轻量方式，没有就用一个简单的 msg ref + 3秒清除）

### 2c. 新增/编辑 modal 表单（替换原 category/points-range 那套）
字段（4个）：
1. **闯关名称** text input（v-model，placeholder `如：思维、国象15min、阅读15min`）
2. **分值** number input（v-model.number，1-10，固定分；去掉原来的固定/区间切换）
3. **时段** text input（v-model，placeholder `早晨 或 16:30-17:00`，默认 `早晨`）
4. **星期几** 7个 pill 按钮单选（周一..周日，默认打开时的今天，用 WEEKDAYS 渲染，
   选中态样式参照原 category pill 的高亮写法）
category 字段不用给用户填，提交时固定 `'闯关'`（或保留一个可选 text 也行，二选一，简单优先）。

- 新增保存 → `store.addWeeklyTaskItem({ name, points, timeSlot, weekday })`
- 编辑保存 → `store.updateWeeklyTaskItem(id, { name, points, timeSlot, weekday })`
- 校验：名称空 → 提示不保存；points 空 → 默认 1
- sortOrder：新增不给用户填（用 addWeeklyTaskItem 里的默认）；编辑不动 sortOrder
- **按钮文案**：新增模式 = `创建`，编辑模式 = `保存`（原页就这么写，沿用）

### 2d. 原 projects 管理整体降级到页面底部
- 用 `<details><summary>📁 打卡项目管理（供打卡页/周计划使用）</summary>...</details>`
  把**原有 projects 列表+分类分组+新增编辑逻辑整段**包进去，**逻辑代码一律不删**，
  只在外面套 details（保证打卡页/周计划的项目还能被编辑）
- `const categories / CAT_META / visibleProjects` 等保持可用

---

## 禁止清单
- **不要**改 `weekly_tasks` 表结构 / db.js 的 store 定义与版本号
- **不要**改 `src/kid/` 下任何文件（儿童端已验收）
- **不要**改 `weeklyTasksSeed.js` 种子内容
- **不要**动 `src/services/sync.js`
- 不新建文件、不加 npm 依赖
- **不要** git commit/push（我统一提交）

## 自验清单（全部执行并在输出里贴结果，不许只说"完成"）
1. `cd C:\Users\Windows\projects\pikachu-points && npm run build` → 必须 ✓ built
2. `grep -c "addWeeklyTaskItem" src/stores/points.js` ≥ 2（定义+return）
3. `grep -c "闯关管理" src/views/ProjectManage.vue` ≥ 1
4. `grep -c "seedWeeklyTasksIfEmpty" src/views/ProjectManage.vue` ≥ 1
5. `grep -c "details" src/views/ProjectManage.vue` ≥ 2
6. 检查 db.js `updateWeeklyTask` 无 Proxy 雷（贴出你看到的实现）
