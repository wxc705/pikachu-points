# Phase 3 — 今日时间线 + 最终验证

## 项目信息
- 绝对路径: `C:\Users\Windows\projects\pikachu-points`
- 技术栈: Vue 3 + Vite + Pinia

## 任务概述
在 `src/kid/TodayTasks.vue` 的"设置"tab（最后一个 `v-else` section）中，添加今日时间线展示。同时验证全部功能。

---

## 文件: `C:\Users\Windows\projects\pikachu-points\src\kid\TodayTasks.vue`

### 改动 1: 在"我的基地"section 的成就墙之后、设置入口之前，插入今日时间线

找到这段代码（在 `</div><!-- tt-achieve -->` 之后、`<!-- 设置入口 -->` 之前）：

```html
        </div>

        <!-- 设置入口 -->
```

替换为：

```html
        </div>

        <!-- 今日时间线 -->
        <div class="tt-timeline">
          <h3 class="tt-title" style="font-size:24px;">📅 今日安排</h3>
          <div class="tt-tl-list">
            <div
              v-for="(slot, i) in timelineSlots"
              :key="i"
              class="tt-tl-slot"
              :class="{ 'is-current': slot.state === 'current', 'is-past': slot.state === 'past' }"
            >
              <div class="tt-tl-time">
                <span class="tt-tl-icon">{{ slot.icon }}</span>
                <span class="tt-tl-hour">{{ slot.time }}</span>
              </div>
              <div class="tt-tl-line"></div>
              <div class="tt-tl-content">{{ slot.label }}</div>
            </div>
          </div>
        </div>

        <!-- 设置入口 -->
```

### 改动 2: 在 script 中添加 timelineSlots computed

在 `selectedAchievement` ref 之后添加：

```js
// v4: 今日时间线
const DEFAULT_TIMELINE = [
  { time: '早晨', icon: '🌅', label: '起床 + 洗漱 + 早餐', startMin: 0 },
  { time: '8:20', icon: '🏫', label: '上学', startMin: 500 },
  { time: '15:20', icon: '🏠', label: '放学', startMin: 920 },
  { time: '16:00', icon: '📚', label: '完成作业', startMin: 960 },
  { time: '17:00', icon: '🏃', label: '运动时间', startMin: 1020 },
  { time: '18:00', icon: '🎮', label: '自由活动', startMin: 1080 },
  { time: '20:00', icon: '🛁', label: '洗澡 + 睡前阅读', startMin: 1200 },
  { time: '21:00', icon: '🌙', label: '睡觉', startMin: 1260 }
]

const timelineSlots = computed(() => {
  const now = nowMinutes.value
  return DEFAULT_TIMELINE.map((slot, i) => {
    const nextStart = i < DEFAULT_TIMELINE.length - 1 ? DEFAULT_TIMELINE[i + 1].startMin : 9999
    let state = 'future'
    if (now >= nextStart) state = 'past'
    else if (now >= slot.startMin) state = 'current'
    return { ...slot, state }
  })
})
```

### 改动 3: 在 `<style scoped>` 末尾添加时间线 CSS

```css
/* ============================================================
   v4: 今日时间线
   ============================================================ */
.tt-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}
.tt-tl-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.tt-tl-slot {
  display: flex;
  align-items: stretch;
  gap: 12px;
  min-height: 48px;
}
.tt-tl-time {
  flex: 0 0 70px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
}
.tt-tl-icon {
  font-size: 20px;
  line-height: 1;
}
.tt-tl-hour {
  font-size: 15px;
  font-weight: 700;
  color: #666;
  white-space: nowrap;
}
.tt-tl-line {
  flex: 0 0 3px;
  background: #e5e7eb;
  border-radius: 2px;
  margin: 4px 0;
}
.tt-tl-content {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 14px;
  font-size: 17px;
  font-weight: 600;
  color: #444;
  border-radius: 12px;
  transition: background 0.3s;
}
.tt-tl-slot.is-current .tt-tl-line {
  background: linear-gradient(180deg, #ffb627, #ff8a00);
  box-shadow: 0 0 8px rgba(255, 183, 39, 0.4);
}
.tt-tl-slot.is-current .tt-tl-content {
  background: linear-gradient(135deg, rgba(255, 214, 102, 0.3), rgba(255, 236, 179, 0.3));
  border-left: 3px solid #ffb627;
  font-weight: 800;
  color: #222;
}
.tt-tl-slot.is-past .tt-tl-hour {
  color: #bbb;
}
.tt-tl-slot.is-past .tt-tl-content {
  color: #bbb;
}
```

---

## 禁止清单
- **不要**修改 `db.js` / `points.js` / `router.js` / `App.vue` / `main.js`
- **不要**修改任何其他 `.vue` 文件
- **不要**新建任何文件
- **不要**引入任何 npm 新依赖

## 验证清单
1. `cd C:\Users\Windows\projects\pikachu-points && npm run build` — 构建成功
2. `grep -c "今日安排" dist/assets/index-*.js` — 结果 > 0
3. `grep -c "tt-timeline" dist/assets/index-*.js` — 结果 > 0
4. `grep -c "timelineSlots" dist/assets/index-*.js` — 结果 > 0（可能被 minify，0 也可接受）
5. 最终检查: `ls -la src/services/voice.js src/components/*.vue` — 全部存在
6. 最终检查: `grep -c "speakEncouragement\|speakAllDone\|warmUpVoice\|太棒了\|全勤达成\|积分商城\|我的成就\|今日安排" dist/assets/index-*.js` — 每个 > 0
