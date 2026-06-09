<template>
  <div class="space-y-5">
    <!-- 总积分卡片 — 渐变背景 + 大数字动画 -->
    <section
      class="rounded-3xl shadow-lg p-6 text-center animate-fade-in-up"
      style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: var(--color-ink)"
    >
      <p class="text-sm font-medium opacity-75">⚡ 皮卡丘总积分</p>
      <p class="text-7xl font-extrabold tracking-tighter mt-2 count-bounce" :key="store.totalPoints">
        {{ store.totalPoints }}
      </p>
      <div class="flex items-center justify-center gap-4 mt-2 text-xs opacity-75">
        <span>🏆 累计 {{ store.totalEarned }}</span>
        <span>🎁 已兑 {{ store.totalSpent }}</span>
      </div>
    </section>

    <!-- 今日概览 -->
    <section class="rounded-2xl bg-surface shadow-sm p-5 flex items-center justify-between card-lift">
      <div>
        <p class="text-xs text-ink-soft mb-0.5">今日净增</p>
        <p :class="['text-3xl font-bold', store.todayNet >= 0 ? 'text-secondary' : 'text-ink-soft']">
          {{ store.todayNet >= 0 ? '+' : '' }}{{ store.todayNet }}
        </p>
      </div>
      <div class="flex gap-4 text-xs text-ink-soft">
        <div class="text-center">
          <p class="text-lg font-semibold text-ink">+{{ store.todayEarned }}</p>
          <p>获得</p>
        </div>
        <div class="text-center">
          <p class="text-lg font-semibold text-ink">-{{ store.todaySpent }}</p>
          <p>兑换</p>
        </div>
      </div>
    </section>

    <!-- 连续打卡徽章 -->
    <section v-if="streakInfo" class="flex justify-center">
      <span :class="['inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold shadow-md animate-fade-in-up', streakInfo.cls]">
        <component :is="streakInfo.icon" class="w-5 h-5" :stroke-width="2.5" />
        {{ streakInfo.label }}
      </span>
    </section>

    <!-- 快捷操作 -->
    <section class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <router-link
        v-for="link in actions"
        :key="link.to"
        :to="link.to"
        class="rounded-2xl bg-surface shadow-sm p-5 text-center card-lift btn-press relative overflow-hidden group"
      >
        <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <component :is="link.icon" class="w-8 h-8 mx-auto text-secondary relative z-10" :stroke-width="1.5" />
        <div class="text-sm font-semibold mt-2 relative z-10">{{ link.label }}</div>
      </router-link>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { usePointsStore } from '../stores/points.js'
import {
  CheckCircle2,
  Gift,
  Clock,
  Star,
  Sprout,
  Flame,
  Zap,
  Rainbow
} from 'lucide-vue-next'

const store = usePointsStore()

onMounted(() => {
  store.load()
})

const actions = [
  { to: '/checkin', label: '去打卡', icon: CheckCircle2 },
  { to: '/exchange', label: '去兑换', icon: Gift },
  { to: '/history', label: '看历史', icon: Clock },
  { to: '/rating', label: '家长评分', icon: Star }
]

const streakInfo = computed(() => {
  const n = store.currentStreak
  if (n <= 0) return null
  if (n >= 7) return { icon: Rainbow, label: '🌈 连续 7 天 — 太厉害了！', cls: 'bg-gradient-to-r from-pink-200 via-yellow-200 to-blue-200 text-purple-800' }
  if (n >= 5) return { icon: Zap, label: '⚡ 连续 5 天 — 能量满满！', cls: 'bg-primary-soft text-ink' }
  if (n >= 3) return { icon: Flame, label: '🔥 连续 3 天 — 势头不错！', cls: 'bg-primary-soft text-ink' }
  return { icon: Sprout, label: '🌱 起步第 1 天', cls: 'bg-primary-soft text-ink' }
})
</script>
