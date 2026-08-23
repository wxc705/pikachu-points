<template>
  <div class="kid-page">
    <!-- 顶部：连续打卡 -->
    <div class="kid-streak">
      <span class="kid-streak-flame">🔥</span>
      <span class="kid-streak-text">连续打卡 <strong>{{ streak }}</strong> 天</span>
    </div>

    <h2 class="kid-title">今天要做的事：</h2>

    <!-- 任务列表 -->
    <div v-if="loading" class="kid-loading" aria-label="加载中">⏳</div>
    <div v-else class="kid-goals">
      <p v-if="usingFallback" class="kid-empty-note">📭 今天没有任务</p>
      <div v-for="goal in goals" :key="goal.key" class="kid-goal-card">
        <div class="kid-goal-info">
          <span class="kid-goal-emoji">{{ goal.emoji }}</span>
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
import { supabase, isSupabaseConfigured } from '../services/supabase.js'
import { playCoin, unlockAudio } from '../services/sound.js'
import { dateToWeekday } from '../utils/weekday.js'
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

const weekday = dateToWeekday() // 1=周一 ... 7=周日（与 weekly_plan 约定一致）

// ---- 内置占位任务（daily_goals 表未建/为空时兜底）----
const FALLBACK_GOALS = [
  { key: 'kid:default:lianzi', name: '练字 20分钟', points: 10, emoji: '📝' },
  { key: 'kid:default:yuedu', name: '阅读 15分钟', points: 10, emoji: '📖' },
  { key: 'kid:default:suanshu', name: '数学口算 10题', points: 10, emoji: '🔢' }
]

const CACHE_KEY = 'pikachu-points:kid-goals'

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

// ---- 把 daily_goals 行归一化成 { key, name, points, emoji, pid, category } ----
// 兼容 snake_case（Supabase）与 camelCase（本地缓存/其他来源）
function normalizeGoal(g) {
  const name = (g.name || g.task_name || g.title || '').toString().trim()
  const points = Number(g.points ?? g.points_earned ?? 10) || 10
  const emoji = g.emoji || g.icon || emojiForName(name)
  const rawId = g.id ?? null
  const key = String(rawId ?? name ?? 'goal')
  // 优先关联真实项目（daily_goals 可能带 project_id），否则用 kid: 前缀合成稳定 id
  let pid = g.project_id ?? g.projectId ?? null
  let category = '学习'
  if (pid != null) {
    const proj = store.projects.find((p) => String(p.id) === String(pid))
    if (proj) category = proj.category || '学习'
  } else {
    pid = 'kid:' + key
  }
  return { key, name, points, emoji, pid, category }
}

// ---- daily_goals 的 localStorage 缓存（离线也能读到上次拉取的任务）----
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (!obj || obj.weekday !== weekday || !Array.isArray(obj.goals)) return null
    return obj.goals
  } catch (e) {
    return null
  }
}

function writeCache(rows) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ weekday, goals: rows }))
  } catch (e) {
    // 静默：localStorage 不可用（隐私模式）
  }
}

async function loadGoals() {
  loading.value = true
  try {
    let rows = null
    // 从云读当天任务；Supabase 未配置 / 表未建 / 连不上（HTTP 000）都走兜底
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('daily_goals').select('*').eq('day_of_week', weekday)
      if (!error && Array.isArray(data) && data.length) rows = data
    }
    if (!rows) rows = readCache()
    if (rows && rows.length) {
      goals.value = rows.map(normalizeGoal)
      usingFallback.value = false
      writeCache(rows)
    } else {
      goals.value = FALLBACK_GOALS.map((g) => ({ ...g, pid: g.key, category: '学习' }))
      usingFallback.value = true
    }
  } catch (e) {
    // 静默：云同步失败不打扰孩子，用缓存/占位任务
    const cached = readCache()
    if (cached && cached.length) {
      goals.value = cached.map(normalizeGoal)
      usingFallback.value = false
    } else {
      goals.value = FALLBACK_GOALS.map((g) => ({ ...g, pid: g.key, category: '学习' }))
      usingFallback.value = true
    }
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
