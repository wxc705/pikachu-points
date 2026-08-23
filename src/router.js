import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './views/Home.vue'
import Checkin from './views/Checkin.vue'
import Exchange from './views/Exchange.vue'
import History from './views/History.vue'
import Rating from './views/Rating.vue'
import WeeklyReport from './views/WeeklyReport.vue'
import ParentDashboard from './views/ParentDashboard.vue'
import ProjectManage from './views/ProjectManage.vue'
import Settings from './views/Settings.vue'
import WeeklyPlan from './views/WeeklyPlan.vue'
import KidHome from './kid/KidHome.vue'

const routes = [
 { path: '/', name: 'home', component: Home },
 { path: '/checkin', name: 'checkin', component: Checkin },
 { path: '/exchange', name: 'exchange', component: Exchange },
 { path: '/history', name: 'history', component: History },
 { path: '/rating', name: 'rating', component: Rating },
 { path: '/report', name: 'report', component: WeeklyReport },
 { path: '/parent', name: 'parent', component: ParentDashboard },
 { path: '/projects', name: 'projects', component: ProjectManage },
 { path: '/settings', name: 'settings', component: Settings },
 { path: '/weekly-plan', name: 'weekly-plan', component: WeeklyPlan },
 { path: '/kid', name: 'kid', component: KidHome }
]

const router = createRouter({
 history: createWebHashHistory(),
 routes
})

export default router
