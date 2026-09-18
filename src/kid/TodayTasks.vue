<template>
  <div class="tt-page" :class="{ 'tt-page--sidebar': isIPad }">
    <!-- 左侧导航栏（v4.1 iPad 横版） -->
    <nav v-if="isIPad" class="tt-sidebar">
      <div class="sb-avatar">
        <span class="sb-avatar-emoji">{{ ultramanEmoji }}</span>
        <span class="sb-avatar-level">{{ levelLabel }}</span>
      </div>
      <button class="sb-item" :class="{ 'is-active': activeTab === 'today' }" @click="activeTab = 'today'">📋 冒险</button>
      <button class="sb-item" :class="{ 'is-active': activeTab === 'points' }" @click="activeTab = 'points'">🏆 基地</button>
      <button class="sb-item" :class="{ 'is-active': activeTab === 'apply' }" @click="activeTab = 'apply'">🛒 商城</button>
      <button class="sb-item" :class="{ 'is-active': activeTab === 'settings' }" @click="activeTab = 'settings'">⚙️ 设置</button>
      <div class="sb-spacer"></div>
      <a class="sb-item sb-parent" href="#/">👨‍👩‍👧</a>
    </nav>

    <!-- 主内容区 -->
    <div class="tt-main-area">
      <!-- 顶部英雄区（v4） -->
      <HeroSection
        :date="store.today"
        :total-points="store.totalPoints"
        :today-earned="store.todayTaskEarned + store.todayHomeworkEarned"
        :streak="store.currentStreak"
        :level="ultramanLevel"
        :level-label="levelLabel"
        :level-progress="levelProgress"
        :level-next-days="levelNextDays"
      />

      <!-- 时段指示器（v4.1） -->
      <div v-if="isIPad && currentTimelineSlot" class="tt-time-indicator">
        <span class="tti-left">{{ currentTimelineSlot.icon }} {{ currentTimelineSlot.label }} ({{ currentTimelineSlot.time }})</span>
        <span v-if="nextTimelineSlot" class="tti-right">下一个：{{ nextTimelineSlot.label }} 还有 {{ minutesUntilNext }} 分钟</span>
        <span v-else class="tti-right tti-done">今天的任务都完成啦！</span>
      </div>

      <!-- 说话气泡（v4） -->
      <SpeechBubble :text="bubbleText" :emoji="bubbleEmoji" :trigger="bubbleTrigger" />

      <!-- 全勤庆祝（v4） -->
      <AllDoneEffect :show="showAllDone" :total-earned="store.todayTaskEarned + store.todayHomeworkEarned" @close="showAllDone = false" />

    <!-- 主体：按 activeTab 切换 -->
    <main class="tt-body">
      <!-- 今日任务（v4 双栏：学校作业 + 自我拓展） -->
      <section v-if="activeTab === 'today'" class="tt-today">
        <div v-if="loading" class="tt-loading" aria-label="加载中">⏳</div>
        <div v-else-if="!store.todayTasks.length && !store.todayHomework.length" class="tt-empty">
          <div class="tt-empty-emoji">🎈</div>
          <div class="tt-empty-title">今天没有任务哦</div>
          <div class="tt-empty-hint">好好休息，去玩吧！</div>
        </div>
        <div v-else class="tt-dual">
          <!-- 左栏：学校作业 -->
          <div class="tt-column">
            <div class="tt-col-head">
              <h2 class="tt-title">📚 学校作业</h2>
              <span class="tt-earned" v-if="store.todayHomework.length">今日已得 +{{ store.todayHomeworkEarned }}分</span>
            </div>
            <div v-if="!store.todayHomework.length" class="tt-col-empty">
              <span class="tt-col-empty-emoji">📝</span>
              <span class="tt-col-empty-text">还没有作业哦</span>
            </div>
            <div v-else class="tt-list">
              <div
                v-for="(task, i) in store.todayHomework"
                :key="task.key"
                class="tt-card-wrap"
                :style="entryStyle(i)"
              >
                <div class="tt-card" :class="{ 'is-done': task.done }" @click="tapHomework(task)">
                  <div class="tt-card-mid">
                    <span class="tt-card-emoji">{{ emojiForName(task.name) }}</span>
                    <span class="tt-card-name">{{ task.name }}</span>
                  </div>
                  <div class="tt-card-right">
                    <span class="tt-card-points">+{{ task.points }}</span>
                    <button
                      class="tt-card-btn"
                      :class="{ 'is-done': task.done }"
                      :disabled="task.done || busy.has(task.key)"
                    >
                      <span v-if="task.done">✓</span>
                      <span v-else>打卡</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="tt-col-progress">
              <div class="tt-progress-bar">
                <div class="tt-progress-fill" :style="{ width: homeworkProgressPct + '%' }"></div>
              </div>
              <span class="tt-progress-text">{{ homeworkDoneCount }}/{{ store.todayHomework.length }} 完成</span>
            </div>
          </div>

          <!-- 右栏：自我拓展 -->
          <div class="tt-column">
            <div class="tt-col-head">
              <h2 class="tt-title">🌟 自我拓展</h2>
              <span class="tt-earned" v-if="store.todayTasks.length">今日已得 +{{ store.todayTaskEarned }}分</span>
            </div>
            <div v-if="!store.todayTasks.length" class="tt-col-empty">
              <span class="tt-col-empty-emoji">🌟</span>
              <span class="tt-col-empty-text">今天没有拓展任务</span>
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
                    <span class="tt-slot-icon">{{ slotIcon(task.timeSlot) }}</span>
                    <span class="tt-slot-text">{{ slotLabel(task.timeSlot) }}</span>
                  </div>
                  <div class="tt-card-mid">
                    <span class="tt-card-emoji">{{ emojiForTask(task) }}</span>
                    <span class="tt-card-name">{{ task.name }}</span>
                  </div>
                  <div class="tt-card-right">
                    <span class="tt-card-points">+{{ task.points }}</span>
                    <button
                      class="tt-card-btn"
                      :class="{ 'is-done': isDone(task) }"
                      :disabled="isDone(task) || busy.has(task.id)"
                    >
                      <span v-if="isDone(task)">✓</span>
                      <span v-else>打卡</span>
                    </button>
                  </div>
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
            <div class="tt-col-progress">
              <div class="tt-progress-bar">
                <div class="tt-progress-fill" :style="{ width: expansionProgressPct + '%' }"></div>
              </div>
              <span class="tt-progress-text">{{ expansionDoneCount }}/{{ store.todayTasks.length }} 完成</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 我的基地（v4：积分 + 成就墙） -->
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
        <!-- 成就墙 -->
        <div class="tt-achieve">
          <div class="tt-achieve-head">
            <h3 class="tt-records-title">🏆 我的成就</h3>
            <span class="tt-achieve-count">{{ store.unlockedCount }}/{{ store.ACHIEVEMENT_DEFS.length }}</span>
          </div>
          <div class="tt-achieve-grid">
            <div
              v-for="a in store.achievements"
              :key="a.id"
              class="tt-achieve-badge"
              :class="{ 'is-locked': !a.unlocked }"
              @click="selectedAchievement = a"
            >
              <span class="tt-achieve-emoji">{{ a.unlocked ? a.emoji : '🔒' }}</span>
              <span class="tt-achieve-name">{{ a.unlocked ? a.name : '???' }}</span>
            </div>
          </div>
        </div>
        <!-- 成就详情弹窗 -->
        <Teleport to="body">
          <Transition name="tt-pop">
            <div v-if="selectedAchievement" class="tt-confirm-overlay" @click.self="selectedAchievement = null">
              <div class="tt-confirm-card">
                <div class="tt-confirm-emoji">{{ selectedAchievement.unlocked ? selectedAchievement.emoji : '🔒' }}</div>
                <div class="tt-confirm-name">{{ selectedAchievement.name }}</div>
                <div class="tt-confirm-points" style="font-size:18px;color:#666;">{{ selectedAchievement.desc }}</div>
                <div v-if="!selectedAchievement.unlocked" style="margin-top:8px;font-size:16px;color:#ea580c;font-weight:700;">
                  继续努力，就能解锁！
                </div>
                <button class="tt-confirm-no" @click="selectedAchievement = null">关闭</button>
              </div>
            </div>
          </Transition>
        </Teleport>
      </section>

      <!-- 积分商城（v4） -->
      <section v-else-if="activeTab === 'apply'" class="tt-mall">
        <div class="tt-mall-header">
          <h2 class="tt-title">🛒 积分商城</h2>
          <span class="tt-mall-balance">当前 {{ totalPointsText }} 分</span>
        </div>

        <div v-if="!rewards.length" class="tt-empty">
          <div class="tt-empty-emoji">🎁</div>
          <div class="tt-empty-title">还没有奖品哦</div>
          <div class="tt-empty-hint">让爸爸妈妈去添加奖品吧！</div>
        </div>

        <div v-else class="tt-mall-list">
          <div
            v-for="(reward, i) in rewards"
            :key="reward.id"
            class="tt-mall-card"
            :class="{ 'is-affordable': canAfford(reward), 'is-expensive': !canAfford(reward) }"
            :style="entryStyle(i)"
            @click="tapReward(reward)"
          >
            <span class="tt-mall-emoji">{{ reward.emoji || '🎁' }}</span>
            <div class="tt-mall-info">
              <span class="tt-mall-name">{{ reward.name }}</span>
              <span class="tt-mall-cost">{{ reward.points }} 分</span>
            </div>
            <div class="tt-mall-status">
              <span v-if="canAfford(reward)" class="tt-mall-yes">✅ 可以兑换</span>
              <span v-else class="tt-mall-no">⏳ 还差 {{ reward.points - store.totalPoints }} 分</span>
            </div>
          </div>
        </div>

        <!-- 自定义愿望入口 -->
        <button class="tt-mall-wish" @click="showWishInput = !showWishInput">
          ✨ 自定义愿望
        </button>
        <div v-if="showWishInput" class="tt-wish-form">
          <input
            v-model="wishText"
            placeholder="我想要..."
            class="tt-wish-input"
            @keyup.enter="submitWish"
          />
          <button class="tt-wish-btn" :disabled="!wishText.trim() || wishSaving" @click="submitWish">
            {{ wishSaving ? '...' : '提交' }}
          </button>
        </div>
        <p v-if="wishMsg" class="tt-wish-msg" :class="wishMsg.startsWith('✅') ? 'is-ok' : 'is-err'">{{ wishMsg }}</p>

        <!-- 兑换确认弹窗 -->
        <Teleport to="body">
          <Transition name="tt-pop">
            <div v-if="confirmReward" class="tt-confirm-overlay" @click.self="confirmReward = null">
              <div class="tt-confirm-card">
                <div class="tt-confirm-emoji">{{ confirmReward.emoji || '🎁' }}</div>
                <div class="tt-confirm-name">{{ confirmReward.name }}</div>
                <div class="tt-confirm-points">扣 {{ confirmReward.points }} 分</div>
                <button class="tt-confirm-yes" :disabled="mallSubmitting" @click="onConfirmReward">✅ 兑换</button>
                <button class="tt-confirm-no" @click="confirmReward = null">❌ 再想想</button>
              </div>
            </div>
          </Transition>
        </Teleport>
      </section>

      <!-- 设置（v4：时间线 + 返回家长端） -->
      <section v-else class="tt-settings-page">
        <!-- 今日时间线 -->
        <div class="tt-timeline">
          <h2 class="tt-title">📅 今日安排</h2>
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
        <div class="tt-settings">
          <a class="tt-settings-link" href="#/">👨‍👩‍👧 返回家长端</a>
        </div>
      </section>
    </main>
    </div><!-- /tt-main-area -->

    <!-- 底部导航：手机竖版用（iPad 用左侧栏） -->
    <nav v-if="!isIPad" class="tt-tabs">
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'today' }" @click="activeTab = 'today'">📋 冒险</button>
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'points' }" @click="activeTab = 'points'">🏆 基地</button>
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'apply' }" @click="activeTab = 'apply'">🛒 商城</button>
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
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { dateToWeekday, WEEKDAYS } from '../utils/weekday.js'
import { playCoin, unlockAudio } from '../services/sound.js'
import { speakEncouragement, speakAllDone, warmUpVoice } from '../services/voice.js'
import HeroSection from '../components/HeroSection.vue'
import SpeechBubble from '../components/SpeechBubble.vue'
import AllDoneEffect from '../components/AllDoneEffect.vue'
import './kid-style.css'

const store = usePointsStore()

const activeTab = ref('today')
const loading = ref(true)
const confirmTask = ref(null)
const submitting = ref(false)
const busy = ref(new Set()) // 打卡后 3 秒防抖，防 6 岁孩子狂点
const floating = ref(null) // { taskId, points, nonce }

// v4 新状态
const bubbleText = ref('')
const bubbleEmoji = ref('⭐')
const bubbleTrigger = ref(0)
const showAllDone = ref(false)
let _allDoneFired = false // 同一天只弹一次

// v4: 积分商城
const showWishInput = ref(false)
const wishText = ref('')
const wishSaving = ref(false)
const wishMsg = ref('')
const confirmReward = ref(null)
const mallSubmitting = ref(false)

// v4: 成就详情
const selectedAchievement = ref(null)

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

// v4: 积分商城 — 奖品列表（projects 表中 category='兑换' 的项目）
const rewards = computed(() => {
  return store.projects.filter((p) => p.category === '兑换' && p.isActive !== false)
})

function canAfford(reward) {
  return store.totalPoints >= (reward.points || 0)
}

async function tapReward(reward) {
  if (!canAfford(reward)) {
    wishMsg.value = `还差 ${reward.points - store.totalPoints} 分，继续努力！`
    setTimeout(() => { wishMsg.value = '' }, 3000)
    return
  }
  confirmReward.value = reward
}

async function onConfirmReward() {
  const reward = confirmReward.value
  if (!reward) return
  mallSubmitting.value = true
  try {
    await store.addRequest(reward.name, reward.points, '商城兑换')
    wishMsg.value = `✅ 已提交「${reward.name}」兑换申请`
    confirmReward.value = null
    setTimeout(() => { wishMsg.value = '' }, 3000)
  } catch (e) {
    wishMsg.value = '❌ 提交失败'
  } finally {
    mallSubmitting.value = false
  }
}

async function submitWish() {
  const text = wishText.value.trim()
  if (!text) return
  wishSaving.value = true
  try {
    await store.addRequest(text, 0, '自定义愿望')
    wishMsg.value = `✅ 愿望「${text}」已提交`
    wishText.value = ''
    showWishInput.value = false
    setTimeout(() => { wishMsg.value = '' }, 3000)
  } catch (e) {
    wishMsg.value = '❌ 提交失败'
  } finally {
    wishSaving.value = false
  }
}

// 当前分钟数（自 0:00），每分钟刷新用于时段高亮
function nowToMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
const nowMinutes = ref(nowToMinutes())

// ---- 日期展示（HeroSection 内部处理，这里保留供底部 tab 用 ----

// v4.1: iPad 检测
const isIPad = computed(() => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
})
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

// v4: 英雄区等级计算
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
const LEVEL_THRESHOLDS = [0, 1, 3, 7, 14, 30] // 索引 0-5
const levelProgress = computed(() => {
  const s = streak.value
  const lv = ultramanLevel.value
  if (lv >= 5) return 100
  const current = LEVEL_THRESHOLDS[lv] || 0
  const next = LEVEL_THRESHOLDS[lv + 1] || 30
  return Math.round(((s - current) / (next - current)) * 100)
})
const levelNextDays = computed(() => {
  const s = streak.value
  const lv = ultramanLevel.value
  if (lv >= 5) return '已满级'
  const next = LEVEL_THRESHOLDS[lv + 1] || 30
  const diff = next - s
  return `差 ${diff} 天升级`
})

// v4.1: 奥特曼 emoji 映射
const ULTRAMAN_EMOJIS = ['⚡', '🦸', '🦸‍♂️', '🌟', '🌍', '💎', '👑']
const ultramanEmoji = computed(() => {
  const lv = ultramanLevel.value
  return ULTRAMAN_EMOJIS[Math.min(lv - 1, ULTRAMAN_EMOJIS.length - 1)] || '⚡'
})

// v4.1: 时段指示器
const currentTimelineSlot = computed(() => {
  const now = nowMinutes.value
  for (let i = DEFAULT_TIMELINE.length - 1; i >= 0; i--) {
    if (now >= DEFAULT_TIMELINE[i].startMin) return { ...DEFAULT_TIMELINE[i], index: i }
  }
  return null
})
const nextTimelineSlot = computed(() => {
  const cur = currentTimelineSlot.value
  if (!cur || cur.index >= DEFAULT_TIMELINE.length - 1) return null
  return DEFAULT_TIMELINE[cur.index + 1]
})
const minutesUntilNext = computed(() => {
  const next = nextTimelineSlot.value
  if (!next) return 0
  return Math.max(0, next.startMin - nowMinutes.value)
})

// v4: 学校作业进度
const homeworkDoneCount = computed(() => store.todayHomework.filter((t) => t.done).length)
const homeworkProgressPct = computed(() => {
  if (!store.todayHomework.length) return 0
  return Math.round((homeworkDoneCount.value / store.todayHomework.length) * 100)
})

// v4: 拓展任务进度
const expansionDoneCount = computed(() => store.todayTasks.filter((t) => isDone(t)).length)
const expansionProgressPct = computed(() => {
  if (!store.todayTasks.length) return 0
  return Math.round((expansionDoneCount.value / store.todayTasks.length) * 100)
})

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

// v4: 全勤检测
function checkAllDone() {
  if (_allDoneFired) return
  const hwAllDone = store.todayHomework.length > 0 && store.todayHomework.every((t) => t.done)
  const expAllDone = store.todayTasks.length > 0 && store.todayTasks.every((t) => isDone(t))
  // 至少有一区有任务且全部完成
  if ((hwAllDone || expAllDone) && (store.todayHomework.length + store.todayTasks.length > 0)) {
    _allDoneFired = true
    const msg = speakAllDone()
    bubbleText.value = msg
    bubbleEmoji.value = '🏆'
    bubbleTrigger.value++
    setTimeout(() => { showAllDone.value = true }, 600)
  }
}

// v4: 打卡学校作业
async function tapHomework(task) {
  if (task.done || busy.has(task.key)) return
  setBusy(task.key, true)
  setTimeout(() => setBusy(task.key, false), 3000)
  try {
    unlockAudio()
    const res = await store.addHomeworkCheckin(task)
    if (res) {
      playCoin().catch(() => {})
      // 语音鼓励 + 气泡
      warmUpVoice()
      const msg = speakEncouragement()
      bubbleText.value = msg
      bubbleEmoji.value = '⭐'
      bubbleTrigger.value++
      // 全勤检测
      checkAllDone()
    }
  } catch (e) {
    console.warn('[kid] homework checkin failed:', e)
  }
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
      setTimeout(() => {
        if (floating.value && floating.value.nonce === nonce) floating.value = null
      }, 900)
      // v4: 语音鼓励 + 气泡
      warmUpVoice()
      const msg = speakEncouragement()
      bubbleText.value = msg
      bubbleEmoji.value = '⭐'
      bubbleTrigger.value++
      // v4: 全勤检测
      checkAllDone()
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
/* v4: 双栏布局 */
.tt-dual {
  display: flex;
  gap: 20px;
}
.tt-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.tt-col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.tt-col-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
.tt-progress-bar {
  flex: 1;
  height: 8px;
  background: #eee;
  border-radius: 999px;
  overflow: hidden;
}
.tt-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffb627, #ff8a00);
  transition: width 0.4s ease;
}
.tt-progress-text {
  font-size: 16px;
  font-weight: 700;
  color: #8a7a5a;
  white-space: nowrap;
}
/* 栏内空态 */
.tt-col-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.5);
  border: 2px dashed #e5e7eb;
}
.tt-col-empty-emoji { font-size: 36px; }
.tt-col-empty-text { font-size: 18px; font-weight: 600; color: #999; }
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

/* ============================================================
   v4: 积分商城
   ============================================================ */
.tt-mall {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tt-mall-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tt-mall-balance {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  box-shadow: rgba(255, 138, 0, 0.3) 0px 3px 8px;
}
.tt-mall-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tt-mall-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 20px;
  background: #ffffff;
  border: 2px solid #ffd97a;
  box-shadow: rgba(0, 0, 0, 0.04) 0px 2px 6px, rgba(0, 0, 0, 0.08) 0px 4px 12px;
  transition: transform 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.tt-mall-card:active {
  transform: scale(0.97);
}
.tt-mall-card.is-expensive {
  opacity: 0.7;
  border-color: #e5e7eb;
}
.tt-mall-emoji {
  font-size: 36px;
  line-height: 1;
  flex: 0 0 auto;
}
.tt-mall-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.tt-mall-name {
  font-size: 20px;
  font-weight: 700;
  color: #222;
}
.tt-mall-cost {
  font-size: 16px;
  font-weight: 600;
  color: #8a7a5a;
}
.tt-mall-status {
  flex: 0 0 auto;
}
.tt-mall-yes {
  font-size: 16px;
  font-weight: 700;
  color: #16a34a;
}
.tt-mall-no {
  font-size: 16px;
  font-weight: 700;
  color: #ea580c;
}
.tt-mall-wish {
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  border: 2px dashed #ffd97a;
  background: transparent;
  font-size: 18px;
  font-weight: 700;
  color: #8a7a5a;
  cursor: pointer;
  transition: background 0.15s;
}
.tt-mall-wish:active {
  background: rgba(255, 217, 122, 0.2);
}
.tt-wish-form {
  display: flex;
  gap: 8px;
}
.tt-wish-input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid #ffd97a;
  font-size: 18px;
  font-weight: 600;
  outline: none;
  background: #fff;
}
.tt-wish-input:focus {
  border-color: #ffb627;
}
.tt-wish-btn {
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}
.tt-wish-btn:disabled {
  opacity: 0.4;
}
.tt-wish-msg {
  text-align: center;
  font-size: 16px;
  font-weight: 700;
}
.tt-wish-msg.is-ok { color: #16a34a; }
.tt-wish-msg.is-err { color: #dc2626; }

/* ============================================================
   v4: 成就墙
   ============================================================ */
.tt-achieve {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tt-achieve-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tt-achieve-count {
  font-size: 18px;
  font-weight: 800;
  color: #ea580c;
}
.tt-achieve-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 12px;
}
.tt-achieve-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 16px;
  background: linear-gradient(160deg, #fff9ec, #fff3dd);
  border: 2px solid #ffd97a;
  box-shadow: rgba(255, 183, 39, 0.12) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px;
  cursor: pointer;
  transition: transform 0.15s;
}
.tt-achieve-badge:active {
  transform: scale(0.95);
}
.tt-achieve-badge.is-locked {
  background: #f3f4f6;
  border-color: #e5e7eb;
  opacity: 0.6;
}
.tt-achieve-emoji {
  font-size: 32px;
  line-height: 1;
}
.tt-achieve-name {
  font-size: 12px;
  font-weight: 700;
  color: #666;
  text-align: center;
  line-height: 1.2;
}

/* ============================================================
   v4: 设置入口
   ============================================================ */
.tt-settings {
  margin-top: 24px;
  text-align: center;
}
.tt-settings-link {
  display: inline-block;
  padding: 12px 32px;
  border-radius: 16px;
  background: #f3f4f6;
  color: #666;
  font-size: 18px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s;
}
.tt-settings-link:active {
  background: #e5e7eb;
}

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

/* ============================================================
   v4.1: 左侧导航栏布局
   ============================================================ */
.tt-page--sidebar {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  min-height: 100dvh;
}
.tt-sidebar {
  flex: 0 0 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 0;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}
.sb-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  margin-bottom: 8px;
}
.sb-avatar-emoji { font-size: 36px; line-height: 1; }
.sb-avatar-level { font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.7); }
.sb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  padding: 10px 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  border-left: 3px solid transparent;
}
.sb-item:hover { background: rgba(255, 255, 255, 0.05); }
.sb-item.is-active {
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  border-left-color: #ffb627;
  background: rgba(255, 182, 39, 0.1);
}
.sb-spacer { flex: 1; }
.sb-parent {
  color: rgba(255, 255, 255, 0.4);
  font-size: 20px;
  padding: 12px 0;
}
.tt-main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
}

/* ============================================================
   v4.1: 时段指示器
   ============================================================ */
.tt-time-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  margin: 0 20px;
  background: rgba(26, 26, 46, 0.85);
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.tti-left { display: flex; align-items: center; gap: 6px; }
.tti-right { font-size: 14px; color: rgba(255, 255, 255, 0.7); }
.tti-done { color: #4ade80; }

/* 大屏（iPad/学习机横屏）字体再放大 */
@media (min-width: 640px) {
  .tt-card-name { font-size: 30px; }
  .tt-score-num { font-size: 88px; }
}
</style>
