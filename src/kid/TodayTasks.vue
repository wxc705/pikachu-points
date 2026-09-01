<template>
  <div class="tt-page">
    <!-- 顶部：日期 + 总积分 + 连续打卡 -->
    <header class="tt-header">
      <div class="tt-hd-chip tt-hd-date">
        <span class="tt-hd-icon">📅</span>
        <div class="tt-hd-col">
          <span class="tt-hd-sub">{{ wdLabel }}</span>
          <span class="tt-hd-label">{{ mdLabel }}</span>
        </div>
      </div>
      <div class="tt-hd-chip tt-hd-points">
        <span class="tt-hd-icon">⭐</span>
        <div class="tt-hd-col">
          <span class="tt-hd-label">积分</span>
          <span class="tt-hd-num">{{ totalPointsText }}</span>
        </div>
      </div>
      <div class="tt-hd-chip tt-hd-streak">
        <span class="tt-hd-icon">🔥</span>
        <div class="tt-hd-col">
          <span class="tt-hd-label">连续</span>
          <span class="tt-hd-num">{{ streak }}天</span>
        </div>
      </div>
    </header>

    <!-- 主体：按 activeTab 切换 -->
    <main class="tt-body">
      <!-- 今日任务 -->
      <section v-if="activeTab === 'today'" class="tt-today">
        <div class="tt-today-head">
          <h2 class="tt-title">📋 今日任务</h2>
          <span class="tt-earned">今日已得 +{{ store.todayTaskEarned }}分</span>
        </div>

        <div v-if="loading" class="tt-loading" aria-label="加载中">⏳</div>
        <div v-else-if="!store.todayTasks.length" class="tt-empty">
          <div class="tt-empty-emoji">🎈</div>
          <div class="tt-empty-title">今天没有任务哦</div>
          <div class="tt-empty-hint">好好休息，去玩吧！</div>
        </div>
        <div v-else class="tt-list">
          <div
            v-for="(task, i) in store.todayTasks"
            :key="task.id"
            class="tt-card-wrap"
            :style="entryStyle(i)"
          >
            <div class="tt-card" :class="cardClass(task)" @click="tapTask(task)">
              <div class="tt-card-slot">
                <span class="tt-slot-icon">{{ emojiForTask(task) }}</span>
                <span class="tt-slot-text">{{ task.category || '' }}</span>
              </div>
              <div class="tt-card-mid">
                <span class="tt-card-emoji">{{ emojiForTask(task) }}</span>
                <span class="tt-card-name">{{ task.name }}</span>
              </div>
              <div class="tt-card-right">
                <span class="tt-card-points">+{{ task.points }}</span>
                <button
                  class="tt-card-btn"
                  :class="isDone(task) ? 'is-done' : ''"
                  :disabled="isDone(task) || busy.has(task.id)"
                >
                  <span v-if="isDone(task)">✓</span>
                  <span v-else>打卡</span>
                </button>
              </div>
              <!-- 打卡成功 +N 上浮 -->
              <Transition name="tt-float">
                <span
                  v-if="floating && floating.taskId === task.id"
                  class="tt-float-points"
                  :key="floating.nonce"
                >+{{ task.points }}</span>
              </Transition>
            </div>
          </div>
        </div>
      </section>

      <!-- 积分 -->
      <section v-else-if="activeTab === 'points'" class="tt-points">
        <div class="tt-score-card">
          <span class="tt-score-label">💰 我的积分</span>
          <span class="tt-score-num">{{ totalPointsText }}</span>
        </div>
        <div class="tt-stats">
          <div class="tt-stat">
            <span class="tt-stat-icon">🔥</span>
            <span class="tt-stat-num">{{ streak }}天</span>
            <span class="tt-stat-label">连续打卡</span>
          </div>
          <div class="tt-stat">
            <span class="tt-stat-icon">🎯</span>
            <span class="tt-stat-num">+{{ store.todayTaskEarned }}</span>
            <span class="tt-stat-label">今日已得</span>
          </div>
        </div>
        <div class="tt-records">
          <h3 class="tt-records-title">最近打卡</h3>
          <div v-if="!recentCheckins.length" class="tt-records-empty">还没有打卡记录哦</div>
          <div v-for="(c, i) in recentCheckins" :key="c.id ?? 'rec-' + i" class="tt-record">
            <span class="tt-record-emoji">{{ emojiForName(c.projectName) }}</span>
            <div class="tt-record-mid">
              <span class="tt-record-name">{{ c.projectName }}</span>
              <span class="tt-record-date">{{ c.date }}</span>
            </div>
            <span class="tt-record-points" :class="c.pointsEarned < 0 ? 'is-neg' : ''">{{ c.pointsEarned > 0 ? '+' : '' }}{{ c.pointsEarned }}</span>
          </div>
        </div>
      </section>

      <!-- 申请（iPad 版） -->
      <section v-else-if="activeTab === 'apply'" class="tt-tab-section">
        <Requests />
      </section>

      <!-- 设置 -->
      <section v-else class="tt-tab-section">
        <Settings />
      </section>
    </main>

    <!-- 底部导航：4 个大 tab，内部 ref 切换，不跳路由 -->
    <nav class="tt-tabs">
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'today' }" @click="activeTab = 'today'">📋 今日</button>
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'points' }" @click="activeTab = 'points'">🏆 积分</button>
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'apply' }" @click="activeTab = 'apply'">📝 申请</button>
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'settings' }" @click="activeTab = 'settings'">⚙️ 设置</button>
    </nav>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <Transition name="tt-pop">
        <div v-if="confirmTask" class="tt-confirm-overlay" @click.self="onCancel">
          <div class="tt-confirm-card">
            <div class="tt-confirm-emoji">{{ emojiForTask(confirmTask) }}</div>
            <div class="tt-confirm-name">{{ confirmTask.name }}</div>
            <div class="tt-confirm-points">+{{ confirmTask.points }} 分</div>
            <button class="tt-confirm-yes" :disabled="submitting" @click="onConfirm">✅ 完成啦</button>
            <button class="tt-confirm-no" @click="onCancel">❌ 还没好</button>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- MC打卡特效 -->
    <McEffect
      :show="mcEffect.show"
      :points="mcEffect.points"
      :message="mcEffect.message"
      @done="mcEffect.show = false"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { dateToWeekday, WEEKDAYS } from '../utils/weekday.js'
import { playCoin, unlockAudio } from '../services/sound.js'
import Requests from './Requests.vue'
import Settings from './Settings.vue'
import McEffect from './McEffect.vue'
import './kid-style.css'

const store = usePointsStore()

const activeTab = ref('today')
const loading = ref(true)
const confirmTask = ref(null)
const submitting = ref(false)
const busy = ref(new Set()) // 打卡后 3 秒防抖，防 6 岁孩子狂点
const floating = ref(null) // { taskId, points, nonce }
const mcEffect = ref({ show: false, points: 1, message: '任务完成！' })

// 当前分钟数（自 0:00），每分钟刷新用于时段高亮
function nowToMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
const nowMinutes = ref(nowToMinutes())

// ---- 日期展示 ----
const wdLabel = computed(() => {
  const [y, m, d] = store.today.split('-').map(Number)
  const wd = dateToWeekday(new Date(y, m - 1, d))
  const info = WEEKDAYS.find((w) => w.n === wd) || WEEKDAYS[0]
  return info.short
})
const mdLabel = computed(() => {
  const [, m, d] = store.today.split('-')
  return `${Number(m)}.${Number(d)}`
})

const totalPointsText = computed(() => store.totalPoints.toLocaleString('en-US'))
const streak = computed(() => store.currentStreak)

// 最近 10 条打卡记录（checkins 按 createdAt 倒序）
const recentCheckins = computed(() =>
  [...store.checkins]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10)
)

// ---- emoji 映射（按名称/分类关键词，未匹配用 ⭐）----
const EMOJI_RULES = [
  [/卡丁车/, '🏎️'],
  [/诗歌/, '🎵'],
  [/国象/, '♟️'],
  [/编程/, '💻'],
  [/乐高/, '🧱'],
  [/写字|练字/, '✏️'],
  [/思维/, '🧠'],
  [/英语/, '🔤'],
  [/语文/, '📖'],
  [/阅读/, '📚'],
  [/游戏/, '🎮'],
  [/体能|体育/, '💪'],
  [/实验/, '🔬'],
  [/拨付/, '💰'],
  [/评分|评价/, '📝']
]
function emojiForName(name = '') {
  for (const [re, e] of EMOJI_RULES) {
    if (re.test(name)) return e
  }
  return '⭐'
}
function emojiForTask(task) {
  return emojiForName(`${task.category || ''} ${task.name || ''}`)
}

// ---- 是否已打卡 ----
function isDone(task) {
  return store.todayTaskDoneIds.has(task.id)
}

// ---- 时段状态：past / current / future（用于高亮与置灰）----
function parseHHmm(s) {
  const [h, m] = s.trim().split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function slotState(timeSlot) {
  const now = nowMinutes.value
  if (!timeSlot) return 'future'
  if (timeSlot === '早晨') return now < 8 * 60 ? 'current' : 'past' // 早晨视为 08:00 前
  const parts = timeSlot.split('-')
  const start = parseHHmm(parts[0])
  if (now < start) return 'future'
  const endPart = parts[1] && parts[1].trim()
  if (!endPart) return 'current' // 开放式结束（如 21:00-）视为当前
  return now <= parseHHmm(endPart) ? 'current' : 'past'
}
function slotLabel(timeSlot) {
  if (!timeSlot) return ''
  if (timeSlot === '早晨') return '早晨'
  return timeSlot.split('-')[0].trim()
}
function slotIcon(timeSlot) {
  return timeSlot === '早晨' ? '🌅' : '⏰'
}
function cardClass(task) {
  if (isDone(task)) return 'is-done'
  const st = slotState(task.timeSlot)
  if (st === 'current') return 'is-current'
  if (st === 'past') return 'is-past'
  return ''
}
function entryStyle(i) {
  return { animation: `tt-in 420ms ${i * 70}ms cubic-bezier(0.34,1.56,0.64,1) both` }
}

// ---- 打卡交互 ----
function setBusy(key, on) {
  const next = new Set(busy.value)
  if (on) next.add(key)
  else next.delete(key)
  busy.value = next
}
function tapTask(task) {
  if (isDone(task) || busy.value.has(task.id)) return
  setBusy(task.id, true)
  setTimeout(() => setBusy(task.id, false), 3000)
  confirmTask.value = task
}
function onCancel() {
  if (confirmTask.value) setBusy(confirmTask.value.id, false)
  confirmTask.value = null
}
async function onConfirm() {
  if (submitting.value) return
  const task = confirmTask.value
  confirmTask.value = null
  if (!task) return
  submitting.value = true
  try {
    unlockAudio() // 首次手势解锁 AudioContext（iOS/Safari 必需）
    const res = await store.addTaskCheckin(task)
    if (res) {
      playCoin().catch(() => {})
      const nonce = Date.now()
      floating.value = { taskId: task.id, points: task.points, nonce }
      // MC特效：XP瓶飞出
      const msgs = ['太棒了！', '经验值+1！', '挖到矿了！', '升级啦！', '获得成就！']
      mcEffect.value = { show: true, points: task.points, message: msgs[Math.floor(Math.random() * msgs.length)] }
      setTimeout(() => {
        if (floating.value && floating.value.nonce === nonce) floating.value = null
      }, 900)
    }
  } catch (e) {
    console.warn('[kid] task checkin failed:', e)
  } finally {
    submitting.value = false
  }
}

let _clockTimer = null
onMounted(async () => {
  // 进入儿童端：隐藏家长端顶部导航（样式在 kid-style.css，通过 body class 作用域）
  document.body.classList.add('kid-mode')
  try {
    await store.load()
    await store.seedWeeklyTasksIfEmpty()
  } catch (e) {
    console.warn('[kid] load failed:', e)
  } finally {
    loading.value = false
  }
  _clockTimer = setInterval(() => { nowMinutes.value = nowToMinutes() }, 60_000)
})

onBeforeUnmount(() => {
  document.body.classList.remove('kid-mode')
  if (_clockTimer) clearInterval(_clockTimer)
})
</script>

<style scoped>
/* ============================================================
   iPad 横版今日任务清单 —— 自包含 scoped CSS
   继承 kid-style.css 设计语言：暖奶油渐变 + 金橙积分 + 三层 warm-lift 阴影
   ============================================================ */

.tt-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(120% 60% at 50% -10%, rgba(255, 214, 102, 0.55) 0%, rgba(255, 236, 179, 0) 55%),
    linear-gradient(180deg, #fff9ec 0%, #fff3dd 45%, #ffe9d6 100%);
  font-family: 'DM Sans', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #222222;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* ---- 顶部：日期 / 积分 / 连续 三卡片 ---- */
.tt-header {
  display: flex;
  align-items: stretch;
  gap: 14px;
  padding: 20px 20px 12px;
}
.tt-hd-chip {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 24px;
  background: #ffffff;
  border: 2px solid #ffd97a;
  box-shadow:
    rgba(255, 183, 39, 0.12) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.04) 0px 2px 6px,
    rgba(0, 0, 0, 0.1) 0px 6px 18px;
  min-width: 0;
}
.tt-hd-icon {
  font-size: 34px;
  line-height: 1;
  flex: 0 0 auto;
}
.tt-hd-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.tt-hd-label {
  font-size: 19px;
  font-weight: 800;
  color: #8a7a5a;
  letter-spacing: 0.2px;
}
.tt-hd-sub {
  font-size: 24px;
  font-weight: 900;
  color: #222222;
  line-height: 1.1;
}
.tt-hd-num {
  font-size: 28px;
  font-weight: 900;
  color: #ea580c;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.tt-hd-points {
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  border-color: #fff3c4;
}
.tt-hd-points .tt-hd-label,
.tt-hd-points .tt-hd-num {
  color: #ffffff;
  text-shadow: rgba(0, 0, 0, 0.12) 0px 2px 4px;
}

/* ---- 主体（可滚动）---- */
.tt-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ---- 今日任务 ---- */
.tt-today {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tt-today-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.tt-title {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.4px;
  margin: 0;
  color: #222222;
}
.tt-earned {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  padding: 8px 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  box-shadow: rgba(255, 138, 0, 0.3) 0px 3px 8px;
  white-space: nowrap;
}

/* 加载 / 空态 */
.tt-loading {
  text-align: center;
  font-size: 56px;
  padding: 48px 0;
  animation: tt-flicker 1.2s ease-in-out infinite;
}
.tt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 24px;
  border-radius: 32px;
  background: linear-gradient(160deg, #ffffff, #fff7e6);
  border: 3px dashed #ffd97a;
  text-align: center;
}
.tt-empty-emoji {
  font-size: 72px;
  line-height: 1;
}
.tt-empty-title {
  font-size: 28px;
  font-weight: 800;
  color: #222222;
}
.tt-empty-hint {
  font-size: 21px;
  font-weight: 600;
  color: #6a6a6a;
}

/* ---- 任务列表 ---- */
.tt-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tt-card-wrap {
  width: 100%;
}
.tt-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 28px;
  background: #ffffff;
  border: 2px solid #ffd97a;
  box-shadow:
    rgba(255, 183, 39, 0.12) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.04) 0px 2px 6px,
    rgba(0, 0, 0, 0.1) 0px 6px 18px;
  transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, opacity 180ms ease;
  cursor: pointer;
}
.tt-card:active {
  transform: scale(0.985);
}

/* 左侧时段（等宽、灰字） */
.tt-card-slot {
  flex: 0 0 auto;
  width: 88px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.tt-slot-icon {
  font-size: 30px;
  line-height: 1;
}
.tt-slot-text {
  font-size: 21px;
  font-weight: 800;
  color: #8a8a8a;
  letter-spacing: 0.2px;
  white-space: nowrap;
}

/* 中间名称 + emoji 圆底图标 */
.tt-card-mid {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}
.tt-card-emoji {
  flex: 0 0 auto;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #fff4d6, #ffe3a8);
  border: 2px solid #ffd97a;
  box-shadow:
    inset rgba(255, 255, 255, 0.6) 0px 2px 4px,
    rgba(255, 179, 0, 0.25) 0px 4px 10px;
  font-size: 34px;
  line-height: 1;
}
.tt-card-name {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: #222222;
  word-break: break-all;
  line-height: 1.2;
}

/* 右侧积分胶囊 + 打卡按钮 */
.tt-card-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}
.tt-card-points {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  padding: 2px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  box-shadow: rgba(255, 138, 0, 0.3) 0px 3px 8px;
}
.tt-card-btn {
  min-width: 96px;
  min-height: 88px;
  border-radius: 22px;
  border: none;
  font-size: 26px;
  font-weight: 900;
  color: #ffffff;
  cursor: pointer;
  background: linear-gradient(180deg, #ff9a3d, #ff4d00);
  box-shadow:
    0 6px 0 #c2410c,
    0 12px 22px rgba(255, 77, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  touch-action: manipulation;
  transition: transform 110ms ease, box-shadow 110ms ease, filter 160ms ease;
}
.tt-card-btn:active:not(:disabled) {
  transform: translateY(5px) scale(0.98);
  box-shadow:
    0 1px 0 #c2410c,
    0 3px 8px rgba(255, 77, 0, 0.3);
}
.tt-card-btn:disabled {
  cursor: default;
}

/* 完成态：绿色卡 + 按钮弹跳 */
.tt-card.is-done {
  background: linear-gradient(160deg, #f0fdf4, #dcfce7);
  border-color: #86efac;
  animation: tt-card-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tt-card-btn.is-done {
  background: linear-gradient(180deg, #7bf0a8, #22c55e);
  box-shadow:
    0 6px 0 #15803d,
    0 12px 22px rgba(34, 197, 94, 0.4);
  animation: tt-done-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 当前时段：金色 3px 边框 + 轻微发光 */
.tt-card.is-current {
  border: 3px solid #ffb627;
  box-shadow:
    rgba(255, 182, 39, 0.4) 0px 0px 0px 1px,
    rgba(255, 182, 39, 0.25) 0px 0px 18px,
    rgba(0, 0, 0, 0.08) 0px 6px 18px;
}

/* 已过时段且未完成：置灰 */
.tt-card.is-past {
  opacity: 0.55;
  background: #f4f1ea;
}

/* 打卡成功 +N 上浮淡出 */
.tt-float-points {
  position: absolute;
  right: 44px;
  top: 6px;
  font-size: 34px;
  font-weight: 900;
  color: #ff8a00;
  pointer-events: none;
  z-index: 5;
}
.tt-float-enter-active {
  animation: tt-float-up 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ---- 积分 tab ---- */
.tt-points {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.tt-score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 24px;
  border-radius: 32px;
  background: linear-gradient(135deg, #ffb627 0%, #ff8a00 55%, #f97316 100%);
  border: 3px solid #fff3c4;
  box-shadow:
    rgba(255, 183, 39, 0.35) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.06) 0px 4px 10px,
    rgba(255, 138, 0, 0.3) 0px 12px 28px;
}
.tt-score-label {
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: rgba(0, 0, 0, 0.12) 0px 2px 4px;
}
.tt-score-num {
  font-size: 76px;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
  text-shadow:
    rgba(0, 0, 0, 0.18) 0px 3px 8px,
    rgba(255, 255, 255, 0.5) 0px 1px 0;
  font-variant-numeric: tabular-nums;
}
.tt-stats {
  display: flex;
  gap: 16px;
}
.tt-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px;
  border-radius: 24px;
  background: #ffffff;
  border: 2px solid #ffd97a;
  box-shadow:
    rgba(255, 183, 39, 0.12) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.04) 0px 2px 6px,
    rgba(0, 0, 0, 0.1) 0px 6px 18px;
}
.tt-stat-icon {
  font-size: 34px;
  line-height: 1;
}
.tt-stat-num {
  font-size: 32px;
  font-weight: 900;
  color: #ea580c;
  font-variant-numeric: tabular-nums;
}
.tt-stat-label {
  font-size: 20px;
  font-weight: 700;
  color: #6a6a6a;
}
.tt-records {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tt-records-title {
  font-size: 26px;
  font-weight: 800;
  margin: 4px 0 0;
  color: #222222;
}
.tt-records-empty {
  font-size: 20px;
  color: #8a8a8a;
  padding: 20px;
  text-align: center;
}
.tt-record {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border-radius: 22px;
  border: 2px solid #ffe3b0;
  box-shadow:
    rgba(255, 183, 39, 0.08) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.03) 0px 2px 6px;
}
.tt-record-emoji {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(145deg, #fff4d6, #ffe3a8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.tt-record-mid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.tt-record-name {
  font-size: 22px;
  font-weight: 700;
  color: #222222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tt-record-date {
  font-size: 17px;
  color: #9a9a9a;
  font-weight: 600;
}
.tt-record-points {
  font-size: 24px;
  font-weight: 900;
  color: #22c55e;
  font-variant-numeric: tabular-nums;
}
.tt-record-points.is-neg {
  color: #ef4444;
}

/* ---- Tab 内容区（申请等子页面） ---- */
.tt-tab-section {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ---- 申请 / 设置 占位 ---- */
.tt-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 60px 24px;
  border-radius: 32px;
  background: linear-gradient(160deg, #ffffff, #fff7e6);
  border: 3px dashed #ffd97a;
  text-align: center;
}
.tt-ph-emoji {
  font-size: 80px;
  line-height: 1;
}
.tt-ph-title {
  font-size: 30px;
  font-weight: 900;
  color: #222222;
}
.tt-ph-hint {
  font-size: 22px;
  color: #6a6a6a;
  font-weight: 600;
}
.tt-ph-link {
  margin-top: 8px;
  display: inline-block;
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
  padding: 16px 28px;
  border-radius: 20px;
  text-decoration: none;
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  box-shadow: rgba(255, 138, 0, 0.3) 0px 4px 10px;
  transition: transform 110ms ease, box-shadow 110ms ease;
}
.tt-ph-link:active {
  transform: translateY(2px);
  box-shadow: rgba(255, 138, 0, 0.3) 0px 2px 6px;
}

/* ---- 底部导航 ---- */
.tt-tabs {
  display: flex;
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 2px solid #ffe3b0;
  background: rgba(255, 249, 236, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.tt-tab {
  flex: 1;
  min-height: 88px;
  border-radius: 20px;
  border: none;
  font-size: 26px;
  font-weight: 900;
  color: #8a7a5a;
  background: #ffffff;
  box-shadow:
    0 4px 0 #e8d9b8,
    0 8px 16px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 110ms ease, box-shadow 110ms ease, color 160ms ease, background 160ms ease;
}
.tt-tab:active {
  transform: translateY(4px);
  box-shadow:
    0 0 0 #e8d9b8,
    0 2px 6px rgba(0, 0, 0, 0.06);
}
.tt-tab.is-active {
  color: #ffffff;
  background: linear-gradient(180deg, #ffb627, #ff8a00);
  box-shadow:
    0 4px 0 #c2670a,
    0 10px 20px rgba(255, 138, 0, 0.35);
}
.tt-tab.is-active:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 #c2670a;
}

/* ---- 确认弹窗 ---- */
.tt-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(34, 34, 34, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.tt-confirm-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 36px;
  border: 3px solid #ffd97a;
  padding: 32px 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
  box-shadow:
    rgba(255, 183, 39, 0.2) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.08) 0px 8px 24px,
    rgba(0, 0, 0, 0.2) 0px 20px 48px;
}
.tt-confirm-emoji {
  font-size: 88px;
  line-height: 1;
  animation: tt-confirm-bounce 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tt-confirm-name {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.4px;
  color: #222222;
  word-break: break-all;
}
.tt-confirm-points {
  font-size: 28px;
  font-weight: 800;
  padding: 6px 20px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  color: #ffffff;
  box-shadow: rgba(255, 138, 0, 0.3) 0px 4px 10px;
}
.tt-confirm-yes,
.tt-confirm-no {
  width: 100%;
  min-height: 96px;
  border-radius: 26px;
  border: none;
  font-size: 30px;
  font-weight: 900;
  cursor: pointer;
  color: #ffffff;
  touch-action: manipulation;
  transition: transform 110ms ease, box-shadow 110ms ease;
}
.tt-confirm-yes {
  background: linear-gradient(180deg, #7bf0a8, #22c55e);
  box-shadow: 0 6px 0 #15803d;
}
.tt-confirm-no {
  background: linear-gradient(180deg, #fba1a1, #ef4444);
  box-shadow: 0 6px 0 #b91c1c;
}
.tt-confirm-yes:active:not(:disabled),
.tt-confirm-no:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #991b1b;
}
.tt-confirm-yes:disabled {
  opacity: 0.7;
  cursor: default;
}

/* 弹窗过渡（弹性放大） */
.tt-pop-enter-active,
.tt-pop-leave-active {
  transition: opacity 200ms ease, transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tt-pop-enter-from,
.tt-pop-leave-to {
  opacity: 0;
  transform: scale(0.85) translateY(20px);
}

/* ---- 动画 keyframes ---- */
@keyframes tt-in {
  0% { opacity: 0; transform: translateY(18px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes tt-card-pop {
  0% { transform: scale(0.96); }
  55% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
@keyframes tt-done-pop {
  0% { transform: scale(0.9); }
  55% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
@keyframes tt-float-up {
  0% { opacity: 0; transform: translateY(0) scale(0.6); }
  25% { opacity: 1; transform: translateY(-12px) scale(1.15); }
  100% { opacity: 0; transform: translateY(-56px) scale(1); }
}
@keyframes tt-flicker {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
@keyframes tt-confirm-bounce {
  0% { transform: scale(0); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

/* 大屏（iPad/学习机横屏）字体再放大 */
@media (min-width: 640px) {
  .tt-card-name { font-size: 30px; }
  .tt-score-num { font-size: 88px; }
}
</style>
