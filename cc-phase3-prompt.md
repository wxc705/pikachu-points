# Phase 3 — 全面对齐 V2 设计稿 + 功能补齐

## 项目信息
- 绝对路径: `C:\Users\Windows\projects\pikachu-points`
- 技术栈: Vue 3 + Vite + Pinia + IndexedDB (idb)
- 设计稿: `C:\Users\Windows\Desktop\v2-final-v4.html`（先读这个文件作为 CSS/布局基准）

## 核心目标
当前 `src/kid/TodayTasks.vue`（917行）功能代码基本完整，但 CSS 严重落后于设计稿。**需要做两件事**：
1. **重写 scoped CSS**：基于设计稿 HTML 的 CSS，替换当前 TodayTasks.vue 的 `<style scoped>` 部分
2. **补齐缺失的模板元素**：XP 进度条、时间条、徽章、按钮 SVG 图标

---

## 第一步：读设计稿
先读 `C:\Users\Windows\Desktop\v2-final-v4.html`，提取所有 CSS 规则。设计稿的关键样式：

### 侧栏
- `sidebar`: `flex:0 0 100px; background:linear-gradient(180deg,#4f46e5,#7c3aed)`
- `sb-item`: `padding:12px 12px; border-radius:14px; color:rgba(255,255,255,.5); font-size:16px; font-weight:700`
- `sb-item.active`: `color:#fff; background:rgba(255,255,255,.15)`

### 英雄区
- `hero-chip`: `background:rgba(255,255,255,.85); border:2px solid #e0e7ff; backdrop-filter:blur(8px); border-radius:20px`
- `hero-chip.points`: `background:linear-gradient(135deg,rgba(251,191,36,.9),rgba(245,158,11,.9))`

### 时间条
- `time-bar`: `background:rgba(255,255,255,.85); border-radius:16px; border:2px solid #e0e7ff`

### XP进度条
- `xp-section`: `background:rgba(255,255,255,.85); border-radius:16px; border:2px solid #e0e7ff`
- `xp-track`: `height:16px; background:#eef2ff; border-radius:99px`
- `xp-fill`: `background:linear-gradient(90deg,#818cf8,#6366f1,#4f46e5); position:relative; transition:width .6s`
- `xp-fill::after`: 顶部白色高光条

### 双栏
- `dual`: `display:flex; gap:20px; flex:1`
- `section-card`: `background:rgba(255,255,255,.85); border-radius:20px; border:2px solid #e0e7ff; backdrop-filter:blur(8px)`

### 任务卡片
- `task`: `background:rgba(250,251,255,.8); border:2px solid #eef2ff; backdrop-filter:blur(4px)`
- `task:hover`: `border-color:#c7d2fe; transform:translateY(-2px); box-shadow:0 4px 12px rgba(79,70,229,.08)`
- `task.done`: `opacity:.5; border-color:#d1fae5; background:rgba(240,253,244,.8)`

### 按钮（关键！半透明软糖风格）
- `btn`: 无固定背景，用 `::before` 内光 + `::after` 底部暗光
- `btn::before`: `background:linear-gradient(180deg,rgba(255,255,255,.28),transparent); height:50%`
- `btn::after`: `background:linear-gradient(0deg,rgba(0,0,0,.08),transparent); height:30%`
- `btn:active`: `transform:scale(.92) translateY(2px)`
- `btn-go`: `background:linear-gradient(180deg,rgba(129,140,248,.85),rgba(99,102,241,.9),rgba(79,70,229,.95)); box-shadow:0 8px 28px rgba(99,102,241,.3); backdrop-filter:blur(8px)`
- `btn-done`: `background:linear-gradient(180deg,rgba(52,211,153,.85),rgba(16,185,129,.9),rgba(5,150,105,.95)); backdrop-filter:blur(8px)`

### 进度条
- `progress-bar`: `height:12px; background:#eef2ff; border-radius:99px`
- `progress-fill.xp`: `background:linear-gradient(90deg,#818cf8,#6366f1)`
- `progress-fill.pt`: `background:linear-gradient(90deg,#fbbf24,#f59e0b)`

### 徽章
- `badge`: `width:34px; height:34px; border-radius:10px; font-size:16px; background:rgba(241,245,249,.8); border:2px solid #e2e8f0`
- `badge.locked`: `opacity:.2; filter:grayscale(1)`

### 时间线（设置tab）
- `settings-card`: `background:rgba(255,255,255,.85); border-radius:16px; border:2px solid #e0e7ff; backdrop-filter:blur(8px)`
- `tl-row`: `padding:8px 0; border-bottom:1px solid rgba(241,245,249,.8)`
- `tl-active`: `color:#059669; font-weight:800`

### 底部tab
- `tab`: `flex:1; flex-direction:column; align-items:center; padding:8px 4px; color:#94a3b8; font-size:12px; font-weight:600`
- `tab.is-active`: `color:#4f46e5`

---

## 第二步：修改 TodayTasks.vue

### 2a. 在 XP 进度条区域（英雄区下方，双栏上方）插入模板
在 HeroSection 和双栏之间，加上 XP 进度条和时间条：

```html
<!-- XP 等级进度条 -->
<div class="xp-section" v-if="isIPad">
  <div class="xp-labels">
    <span class="current">⚡ {{ levelLabel }}</span>
    <span>{{ streak }} / {{ nextLevelDays }} 天 → {{ nextLevelLabel }}</span>
  </div>
  <div class="xp-track">
    <div class="xp-fill" :style="{ width: levelProgress + '%' }"></div>
  </div>
</div>

<!-- 时间条 -->
<div class="time-bar" v-if="isIPad && currentTimelineSlot">
  <div class="tb-left">⏰ <span class="time">{{ currentTimeStr }}</span></div>
  <div style="text-align:right">
    <div class="tb-right">当前：<span class="slot">{{ currentTimelineSlot.label }}</span></div>
    <div v-if="nextTimelineSlot" class="tb-next">下一个：{{ nextTimelineSlot.label }} · 还有 {{ minutesUntilNext }} 分钟</div>
  </div>
</div>
```

### 2b. 在每列底部加徽章
学校作业列底部：
```html
<div class="badges" v-if="store.todayHomework.length">
  <div v-for="t in store.todayHomework" :key="t.key" class="badge" :class="{ locked: !t.done }">
    {{ emojiForName(t.name) }}
  </div>
</div>
```

自我拓展列底部：
```html
<div class="badges" v-if="store.todayTasks.length">
  <div v-for="t in store.todayTasks" :key="t.id" class="badge" :class="{ locked: !isDone(t) }">
    {{ emojiForTask(t) }}
  </div>
</div>
```

### 2c. 按钮内加 SVG 图标
把任务卡片的打卡按钮从 emoji 改为 SVG 图标（参考设计稿的 btn-icon + btn-label 结构）：
- 未完成: 闪电图标 `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`
- 已完成: 盾牌勾图标 `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>`

### 2d. 重写 `<style scoped>`
用设计稿的 CSS 替换当前所有 scoped CSS。确保每个 class 名与模板匹配。

---

## 禁止清单
- **不要**修改 `db.js` / `points.js` / `router.js` / `App.vue` / `main.js`
- **不要**修改 `KidHome.vue` / `ParentDashboard.vue`
- **不要**修改 `voice.js` / `SpeechBubble.vue` / `AllDoneEffect.vue` / `HeroSection.vue`
- **不要**新建任何文件
- **不要**引入任何 npm 新依赖
- **不要**改动 JavaScript 逻辑（只改 template + style）
- **不要**改动 `v2-style.css` 或 `kid-style.css`（只改 TodayTasks.vue 的 scoped style）

## 验证清单
1. `cd C:\Users\Windows\projects\pikachu-points && npm run build` — 构建成功
2. 截图对比设计稿，确认：紫色侧栏、玻璃卡片、XP进度条、时间条、半透明按钮、底部tab
