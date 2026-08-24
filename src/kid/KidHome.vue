<template>
  <div class="kid-page">
    <!-- 顶部：奥特曼等级 + 连续打卡 -->
    <div class="kid-streak">
      <img
        v-if="ultramanLevel"
        :src="`/ultraman/level${ultramanLevel}.png`"
        class="kid-ultraman"
        alt="奥特曼"
      />
      <span v-else class="kid-ultraman" style="display:flex;align-items:center;justify-content:center;font-size:44px;">⚡</span>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div class="kid-streak-text">
          <span class="kid-streak-flame">🔥</span>
          连续打卡 <strong>{{ streak }}</strong> 天
        </div>
        <span v-if="ultramanLevel" class="kid-level-tag">{{ levelLabel }}</span>
      </div>
    </div>

    <h2 class="kid-title">✨ 今天要做的事：</h2>

    <!-- 今日进度条：完成任务数 / 总数，给孩子即时成就感 -->
    <div v-if="!loading && goals.length" class="kid-progress">
      <div class="kid-progress-bar">
        <div class="kid-progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <span class="kid-progress-text">{{ doneCount }} / {{ goals.length }} 完成</span>
    </div>

    <!-- 任务列表 -->
    <div v-if="loading" class="kid-loading" aria-label="加载中">⏳</div>
    <div v-else class="kid-goals">
      <!-- 空态：引导卡片填充空白，给小朋友明确下一步 -->
      <div v-if="usingFallback" class="kid-empty-card">
        <div class="kid-empty-emoji">🦸</div>
        <div class="kid-empty-title">今天没有任务哦</div>
        <div class="kid-empty-hint">去找爸爸妈妈领取新任务吧！</div>
      </div>
      <div
        v-for="(goal, i) in goals"
        :key="goal.key"
        class="kid-goal-card"
        :style="{ animation: `card-in 420ms ${i * 90}ms cubic-bezier(0.34,1.56,0.64,1) both` }"
      >
        <div class="kid-goal-emoji-wrap">
          <span class="kid-goal-emoji">{{ goal.emoji }}</span>
        </div>
        <div class="kid-goal-info">
          <span class="kid-goal-name">{{ goal.name }}</span>
          <span class="kid-goal-points">+{{ goal.points }} 分</span>
        </div>
        <button
          class="kid-goal-btn"
          :class="isDone(goal) ? 'is-done' : ''"
          :disabled="isDone(goal) || busy.has(goal.key)"
          @click="tapGoal(goal, $event)"
        >
          <span v-if="isDone(goal)">✅ 完成</span>
          <span v-else>👇 打卡</span>
        </button>
      </div>
    </div>

    <!-- 底部：我的积分 -->
    <div class="kid-score">
      <span class="kid-score-label">💰 我的积分</span>
      <span class="kid-score-num count-bounce" :key="store.totalPoints">{{ scoreText }}</span>
    </div>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <Transition name="kid-pop">
        <div v-if="confirmGoal" class="kid-confirm-overlay" @click.self="onCancel">
          <div class="kid-confirm-card">
            <div class="kid-confirm-emoji">{{ confirmGoal.emoji }}</div>
            <div class="kid-confirm-name">{{ confirmGoal.name }}</div>
            <div class="kid-confirm-points">+{{ confirmGoal.points }} 分</div>
            <button class="kid-confirm-yes" :disabled="submitting" @click="onConfirm">
              ✅ 完成啦
            </button>
            <button class="kid-confirm-no" @click="onCancel">❌ 还没好</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <CoinBurst v-if="coinBurst" :x="coinBurst.x" :y="coinBurst.y" @done="coinBurst = null" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { isSupabaseConfigured } from '../services/supabase.js'
import { playCoin, unlockAudio } from '../services/sound.js'
import CoinBurst from '../components/CoinBurst.vue'
import './kid-style.css'

const store = usePointsStore()

const goals = ref([])
const usingFallback = ref(false)
const loading = ref(true)
const confirmGoal = ref(null)
const submitting = ref(false)
const busy = ref(new Set()) // 打卡后禁用 3 秒的 key 集合（防 6 岁孩子狂点）
const coinBurst = ref(null)
const pendingRect = ref(null)

// ---- 根据任务名猜一个 emoji（daily_goals 没配图标时用）----
function emojiForName(name) {
  const n = name || ''
  if (/练字|写字/.test(n)) return '📝'
  if (/阅读|读书|看书|绘本/.test(n)) return '📖'
  if (/数学|口算|计算|算数/.test(n)) return '🔢'
  if (/英语|英文/.test(n)) return '🔤'
  if (/古诗|诗词|背诗/.test(n)) return '📜'
  if (/拼音/.test(n)) return '🔡'
  if (/跳绳|运动|跑步|游泳|体能|篮球|足球|羽毛球/.test(n)) return '🏃'
  if (/识字/.test(n)) return '🔤'
  if (/编程/.test(n)) return '💻'
  return '⭐'
}

// ---- 把 project 归一化成 { key, name, points, emoji, pid, category } ----
// 来源：store.todayRecommended（周计划）或 store.projects（兜底），都是真实项目对象
function normalizeGoal(p) {
  const name = (p.name || '').toString().trim()
  // 固定分值优先；pointRange 项目（如 10-20 分）默认按最低分计
  let points = Number(p.points) || 0
  if (!points && Array.isArray(p.pointRange) && p.pointRange[1] > p.pointRange[0]) {
    points = Number(p.pointRange[0]) || 10
  }
  if (!points) points = 10
  const emoji = p.emoji || p.icon || emojiForName(name)
  const key = 'kid:proj:' + p.id
  // pid 用真实项目 id：isDone / addCheckin 才能和 Checkin 页共用一套打卡记录
  return { key, name, points, emoji, pid: p.id, category: p.category || '学习' }
}

async function loadGoals() {
  loading.value = true
  try {
    // 跨设备：先尝试从云端拉一次（家长在另一台设备配的周计划）
    // 带 6s 超时，断网/未配置也立即走本地，不让孩子干等
    if (isSupabaseConfigured()) {
      try {
        await Promise.race([
          store.syncPullFromCloud(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('pull timeout')), 6000))
        ])
      } catch (e) {
        // 静默：云不可达用本地数据
      }
    }
    // 数据源：Pinia store（weeklyPlans ∩ projects 已算好"今日推荐"）
    // 兜底1：家长没配周计划 → 展示系统里全部启用的真实项目（不再硬编码占位任务）
    // 兜底2：系统没有项目 → 空列表，模板显示"今天没有任务"
    let recs = [...store.todayRecommended]
    if (!recs.length) {
      recs = store.projects.filter((p) => p.isActive !== false)
    }
    if (recs.length) {
      goals.value = recs.map(normalizeGoal)
      usingFallback.value = false
    } else {
      goals.value = []
      usingFallback.value = true
    }
  } catch (e) {
    // 极端异常也不打扰孩子：空列表
    goals.value = []
    usingFallback.value = true
  } finally {
    loading.value = false
  }
}

// ---- 今天是否已打卡：同 project 已有 checkin，或同名任务今天已打 ----
function isDone(goal) {
  if (store.todayCheckedProjectIds.has(goal.pid)) return true
  return store.checkins.some((c) => c.date === store.today && c.projectName === goal.name)
}

function setBusy(key, on) {
  const next = new Set(busy.value)
  if (on) next.add(key)
  else next.delete(key)
  busy.value = next
}

function tapGoal(goal, event) {
  if (isDone(goal) || busy.value.has(goal.key)) return
  // 3 秒防抖：防止孩子狂点连开弹窗 / 重复打卡
  setBusy(goal.key, true)
  setTimeout(() => setBusy(goal.key, false), 3000)
  pendingRect.value = event?.currentTarget?.getBoundingClientRect() || null
  confirmGoal.value = goal
}

function onCancel() {
  if (confirmGoal.value) {
    setBusy(confirmGoal.value.key, false)
  }
  confirmGoal.value = null
}

async function onConfirm() {
  if (submitting.value) return
  const goal = confirmGoal.value
  const rect = pendingRect.value
  confirmGoal.value = null
  if (!goal) return
  submitting.value = true
  try {
    // 复用 points store 的 addCheckin：本地 IndexedDB 先写，sync 会 push 云（断网也能打）
    await store.addCheckin({
      id: goal.pid,
      name: goal.name,
      category: goal.category || '学习',
      _pickedPoints: goal.points
    })
    unlockAudio() // 首次手势解锁 AudioContext（安卓 Chrome 学习机必需）
    playCoin().catch(() => {}) // 防 unhandled rejection
    if (rect) {
      coinBurst.value = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
  } catch (e) {
    // 静默：写本地失败也不打断孩子
    console.warn('[kid] checkin failed:', e)
  } finally {
    submitting.value = false
  }
}

const streak = computed(() => store.currentStreak)
const scoreText = computed(() => store.totalPoints.toLocaleString('en-US'))

// 今日进度：已完成任务数 / 百分比
const doneCount = computed(() => goals.value.filter((g) => isDone(g)).length)
const progressPct = computed(() => {
  if (!goals.value.length) return 0
  return Math.round((doneCount.value / goals.value.length) * 100)
})

// 奥特曼等级：连续打卡天数 → Lv.1~5（对应 public/ultraman/level1-5.png）
// streak=0 也显示 Lv.1 初始形态，给小朋友"准备变身"的期待感
const ultramanLevel = computed(() => {
  const s = streak.value
  if (s >= 30) return 5
  if (s >= 14) return 4
  if (s >= 7) return 3
  if (s >= 3) return 2
  return 1
})
const levelLabel = computed(() => {
  const s = streak.value
  if (s === 0) return '准备变身'
  return `奥特曼 Lv.${ultramanLevel.value}`
})

onMounted(async () => {
  // 进入儿童端：隐藏家长端顶部导航（样式在 kid-style.css 里，通过 body class 作用域）
  document.body.classList.add('kid-mode')
  await store.load()
  await loadGoals()
})

onBeforeUnmount(() => {
  document.body.classList.remove('kid-mode')
})
</script>
