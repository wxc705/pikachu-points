import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './views/Home.vue'
import Exchange from './views/Exchange.vue'
import History from './views/History.vue'
import Rating from './views/Rating.vue'
import WeeklyReport from './views/WeeklyReport.vue'
import ParentDashboard from './views/ParentDashboard.vue'
import ProjectManage from './views/ProjectManage.vue'
import Settings from './views/Settings.vue'
import WeeklyPlan from './views/WeeklyPlan.vue'
import KidHome from './kid/KidHome.vue'
import TodayTasks from './kid/TodayTasks.vue'
import KnowledgeMap from './kid/KnowledgeMap.vue'

// iPad 检测：UA 含 iPad，或 macOS 且支持多点触控（iPadOS 13+ 伪装成 Mac）
function isIPad() {
 const ua = navigator.userAgent
 return /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

const routes = [
 { path: '/', name: 'home', component: Home, beforeEnter(to, from, next) {
  // iPad 添加到主屏幕后打开 → 直接进 kid 端
  // v6上线统一入口：旧KidHome会把全周49项全倒出来（过滤失效），无条件跳今日视图
  next('/kid/today')
 } },
 { path: '/exchange', name: 'exchange', component: Exchange },
 { path: '/history', name: 'history', component: History },
 { path: '/rating', name: 'rating', component: Rating },
 { path: '/report', name: 'report', component: WeeklyReport },
 { path: '/parent', name: 'parent', component: ParentDashboard },
 { path: '/projects', name: 'projects', component: ProjectManage },
 { path: '/settings', name: 'settings', component: Settings },
 { path: '/weekly-plan', name: 'weekly-plan', component: WeeklyPlan },
 // t019: /kid 直接进 KidHome 主屏（变身动画+壁纸在主屏，之前被无条件跳走用户永远看不到）。
 // 全周49项bug不回头：主屏仍只读 store.todayTasks（按天过滤），今日视图 /kid/today
 // 是默认打卡流（根路由 / 仍跳 /kid/today），主屏用「今日任务」按钮进。
 { path: '/kid', name: 'kid', component: KidHome },
 { path: '/map', name: 'map', component: KnowledgeMap },
 { path: '/kid/today', name: 'kid-today', component: TodayTasks }
]

const router = createRouter({
 history: createWebHashHistory(),
 routes
})

export default router
