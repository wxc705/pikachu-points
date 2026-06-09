<template>
 <div class="min-h-screen bg-bg-theme text-ink">
 <header class="bg-primary text-ink shadow">
 <div class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
 <h1 class="text-lg font-bold flex items-center gap-1.5">
 <Zap class="w-5 h-5" :stroke-width="2.5" />
 皮卡丘积分
 </h1>
 <nav class="flex gap-1 text-sm">
 <router-link
 v-for="link in links"
 :key="link.to"
 :to="link.to"
 class="px-3 py-1 rounded-full hover:bg-primary-soft flex items-center gap-1"
 active-class="bg-primary-soft font-semibold"
 >
 <component :is="link.icon" class="w-4 h-4" :stroke-width="2" />
 {{ link.label }}
 </router-link>
 </nav>
 </div>
 </header>
 <main class="max-w-3xl mx-auto px-4 py-4">
 <router-view />
 </main>

 <!-- 里程碑全屏动画：root mount，store 控制 show/hide -->
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
