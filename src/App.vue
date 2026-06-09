<template>
  <div class="min-h-screen bg-bg-theme text-ink">
    <header class="bg-gradient-to-b from-primary to-primary/80 text-ink shadow-sm sticky top-0 z-40 backdrop-blur">
      <div class="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <router-link to="/" class="text-lg font-bold flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <Zap class="w-5 h-5" :stroke-width="2.5" />
          皮卡丘积分
        </router-link>
        <nav class="flex gap-0.5 text-xs overflow-x-auto">
          <router-link
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="px-2.5 py-1.5 rounded-full hover:bg-primary-soft flex items-center gap-1 transition-colors"
            active-class="bg-white/60 font-semibold shadow-sm"
          >
            <component :is="link.icon" class="w-3.5 h-3.5" :stroke-width="2" />
            <span class="hidden sm:inline">{{ link.label }}</span>
          </router-link>
        </nav>
      </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-5">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <!-- 里程碑全屏动画 -->
    <MilestoneEffect
      v-if="store.pendingMilestone"
      :threshold="store.pendingMilestone"
      @done="store.clearMilestone()"
    />
  </div>
</template>

<script setup>
import { usePointsStore } from './stores/points.js'
import MilestoneEffect from './components/MilestoneEffect.vue'
import {
  Zap,
  Home,
  CheckCircle2,
  Gift,
  Clock,
  FileBarChart,
  Users,
  CalendarDays,
  ListChecks,
  Settings as SettingsIcon
} from 'lucide-vue-next'

const store = usePointsStore()
const links = [
  { to: '/', label: '首页', icon: Home },
  { to: '/checkin', label: '打卡', icon: CheckCircle2 },
  { to: '/exchange', label: '兑换', icon: Gift },
  { to: '/history', label: '历史', icon: Clock },
  { to: '/report', label: '报告', icon: FileBarChart },
  { to: '/parent', label: '家长', icon: Users },
  { to: '/weekly-plan', label: '计划', icon: CalendarDays },
  { to: '/projects', label: '项目', icon: ListChecks },
  { to: '/settings', label: '设置', icon: SettingsIcon }
]
</script>
