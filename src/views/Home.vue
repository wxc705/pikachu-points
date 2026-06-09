<template>
 <div class="space-y-4">
 <section
 class="rounded-2xl shadow p-6 text-center"
 :style="{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primary))', color: 'var(--color-ink)' }"
 >
 <p class="text-sm font-medium opacity-80">皮卡丘总积分</p>
 <p class="text-6xl font-extrabold tracking-tight mt-1">
 {{ store.totalPoints }}
 </p>
 <p class="text-sm mt-2 opacity-80">
累计获得 {{ store.totalEarned }} · 已兑换 {{ store.totalSpent }}
 </p>
 </section>

 <section class="rounded-2xl bg-surface shadow p-4 flex items-center justify-between">
 <div>
 <p class="text-xs text-ink-soft">今日新增</p>
 <p class="text-2xl font-bold text-secondary">
 {{ store.todayNet >=0 ? '+' : '' }}{{ store.todayNet }}
 </p>
 </div>
 <div class="text-right text-xs text-ink-soft">
 <p>+{{ store.todayEarned }}获得</p>
 <p>-{{ store.todaySpent }}兑换</p>
 </div>
 </section>

 <section v-if="streakInfo" class="flex justify-center">
  <span :class="['inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold shadow-sm', streakInfo.cls]">
  <component :is="streakInfo.icon" class="w-4 h-4" :stroke-width="2.5" />
  {{ streakInfo.label }}
  </span>
 </section>

 <section class="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <router-link
 v-for="link in actions"
 :key="link.to"
 :to="link.to"
 class="rounded-2xl bg-surface shadow p-4 text-center hover:bg-primary-soft"
 >
 <component :is="link.icon" class="w-7 h-7 mx-auto text-secondary" :stroke-width="2" />
 <div class="text-sm font-medium mt-1">{{ link.label }}</div>
 </router-link>
 </section>
 </div>
</template>

<script setup>
import { computed, h, onMounted } from 'vue'
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
 if (n <=0) return null
 if (n >=7) return { icon: Rainbow, label: '连续 7 天 — 彩虹！', cls: 'bg-gradient-to-r from-pink-200 via-yellow-200 to-blue-200 text-purple-800' }
 if (n >=5) return { icon: Zap, label: '连续 5 天', cls: 'bg-primary-soft text-ink' }
 if (n >=3) return { icon: Flame, label: '连续 3 天', cls: 'bg-primary-soft text-ink' }
 return { icon: Sprout, label: '起步 1 天', cls: 'bg-primary-soft text-ink' }
})
</script>
