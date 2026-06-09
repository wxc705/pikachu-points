<template>
 <div class="space-y-4">
 <header class="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow p-5">
 <h1 class="text-xl font-bold">📊 本周积分报告</h1>
 <p class="text-sm mt-1 opacity-90">{{ rangeLabel }}</p>
 </header>

 <div class="grid grid-cols-2 gap-3">
 <button
 @click="generate"
 :disabled="loading"
 class="rounded-2xl bg-primary hover:bg-primary-soft disabled:bg-primary-soft text-ink font-semibold py-3"
 >
 {{ loading ? '生成中…' : (report ? '🔄 重新生成' : '📊 生成报告') }}
 </button>
 <button
 @click="exportImage"
 :disabled="!report || exporting"
 class="rounded-2xl bg-secondary hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3"
 >
 {{ exporting ? '导出中…' : '📷 导出 PNG' }}
 </button>
 </div>

 <p v-if="copyToast" class="text-center text-sm text-secondary">{{ copyToast }}</p>

 <div v-if="report" ref="reportEl" class="space-y-3">
 <!-- 总览 -->
 <section class="rounded-2xl bg-surface shadow p-5">
 <h2 class="text-sm font-semibold text-ink-soft mb-3">总览</h2>
 <div class="grid grid-cols-3 gap-3 text-center">
 <div>
 <p class="text-xs text-ink-soft">本周新增</p>
 <p :class="['text-2xl font-bold', report.weekNet >= 0 ? 'text-secondary' : 'text-secondary']">
 {{ report.weekNet >= 0 ? '+' : '' }}{{ report.weekNet }}
 </p>
 </div>
 <div>
 <p class="text-xs text-ink-soft">本周打卡</p>
 <p class="text-2xl font-bold text-secondary">{{ report.checkinCount }}次</p>
 </div>
 <div>
 <p class="text-xs text-ink-soft">本周兑换</p>
 <p class="text-2xl font-bold text-secondary">-{{ report.weekSpent }}</p>
 </div>
 </div>
 </section>

 <!-- 7 天柱状图 -->
 <section v-if="report.dailyBars.length" class="rounded-2xl bg-surface shadow p-5">
 <h2 class="text-sm font-semibold text-ink-soft mb-3">📊 每日积分</h2>
 <div class="flex items-end justify-between gap-1" :style="{ height: '120px' }">
 <div
 v-for="day in report.dailyBars"
 :key="day.date"
 class="flex-1 flex flex-col items-center gap-1"
 >
 <div class="flex-1 w-full flex items-end justify-center">
 <div
 class="w-full rounded-t transition-all"
 :class="day.net > 0 ? 'bg-secondary' : day.net < 0 ? 'bg-ink-soft' : 'bg-primary-soft'"
 :style="{ height: day.heightPct + '%', minHeight: day.net !== 0 ? '6px' : '2px' }"
 :title="day.date + ': ' + (day.net >= 0 ? '+' : '') + day.net"
 ></div>
 </div>
 <div class="text-xs text-ink-soft">{{ day.label }}</div>
 </div>
 </div>
 <div class="mt-2 text-xs text-ink-soft text-center">
 峰值 {{ report.peakDay.label }}：{{ report.peakDay.net >= 0 ? '+' : '' }}{{ report.peakDay.net }}
 </div>
 </section>

 <!-- 7 天打卡日历 -->
 <section v-if="report.weeklyCells.length" class="rounded-2xl bg-surface shadow p-5">
 <h2 class="text-sm font-semibold text-ink-soft mb-3">📅 打卡日历</h2>
 <div class="grid grid-cols-7 gap-2">
 <div
 v-for="cell in report.weeklyCells"
 :key="cell.date"
 class="text-center"
 >
 <div
 class="aspect-square rounded-xl flex items-center justify-center text-lg"
 :class="cell.intensity === 0 ? 'bg-primary-soft' : cell.intensity <= 2 ? 'bg-primary' : 'bg-secondary text-white'"
 :title="cell.date + (cell.net > 0 ? ' +' + cell.net : '')"
 >
 {{ cell.intensity > 0 ? '✓' : '·' }}
 </div>
 <div class="text-xs text-ink-soft mt-1">{{ cell.label }}</div>
 </div>
 </div>
 <div class="mt-3 text-xs text-ink-soft flex items-center gap-2 justify-center">
 <span>少</span>
 <div class="w-4 h-4 rounded bg-primary-soft"></div>
 <div class="w-4 h-4 rounded bg-primary"></div>
 <div class="w-4 h-4 rounded bg-secondary"></div>
 <span>多</span>
 </div>
 </section>

 <!-- 分类打卡率 -->
 <section v-if="report.categoryRates.length" class="rounded-2xl bg-surface shadow p-5">
 <h2 class="text-sm font-semibold text-ink-soft mb-3">🎯 分类打卡率</h2>
 <ul class="space-y-3">
 <li v-for="row in report.categoryRates" :key="row.category">
 <div class="flex items-center justify-between text-sm mb-1">
 <span class="flex items-center gap-2">
 <span class="text-base">{{ row.emoji }}</span>
 <span>{{ row.category }}</span>
 </span>
 <span class="text-ink-soft">{{ row.checkedDays }} / {{ row.totalProjects }} 项</span>
 </div>
 <div class="h-2 rounded-full bg-primary-soft overflow-hidden">
 <div
 class="h-full rounded-full bg-secondary transition-all"
 :style="{ width: row.pct + '%' }"
 ></div>
 </div>
 </li>
 </ul>
 </section>

 <!-- 分类统计 -->
 <section class="rounded-2xl bg-surface shadow p-5">
 <h2 class="text-sm font-semibold text-ink-soft mb-3">分类统计</h2>
 <ul class="space-y-2">
 <li
 v-for="row in report.categoryRows"
 :key="row.category"
 class="flex items-center justify-between text-sm"
 >
 <span class="flex items-center gap-2">
 <span class="text-lg">{{ row.emoji }}</span>
 <span>{{ row.category }}</span>
 </span>
 <span :class="['font-semibold', row.points > 0 ? 'text-secondary' : 'text-ink-soft']">
 {{ row.points > 0 ? '+' : '' }}{{ row.points }}
 </span>
 </li>
 </ul>
 </section>

 <!-- 本周最佳 -->
 <section v-if="report.topProject" class="rounded-2xl bg-surface shadow p-5">
 <h2 class="text-sm font-semibold text-ink-soft mb-2">🏆 本周最佳</h2>
 <p class="text-lg font-bold">
 {{ report.topProject.name }}
 <span class="text-sm text-ink-soft font-normal">
 ({{ report.topProject.count }}次 · +{{ report.topProject.points }})
 </span>
 </p>
 </section>

 <!-- 学习效果平均分 -->
 <section v-if="report.ratingAvg !== null" class="rounded-2xl bg-surface shadow p-5">
 <h2 class="text-sm font-semibold text-ink-soft mb-2">📈 学习效果平均</h2>
 <p class="text-2xl font-bold text-secondary">
 {{ report.ratingAvg.toFixed(1) }} / 3
 <span class="text-sm text-ink-soft font-normal">({{ report.ratingCount }}次评分)</span>
 </p>
 </section>

 <!-- 连续打卡项目 -->
 <section v-if="report.projectStreaks.length" class="rounded-2xl bg-surface shadow p-5">
 <h2 class="text-sm font-semibold text-ink-soft mb-3">🔥 本周连续打卡</h2>
 <ul class="space-y-1 text-sm">
 <li v-for="ps in report.projectStreaks" :key="ps.name">
 {{ ps.name }} <span class="text-ink-soft">连续 {{ ps.streak }} 天</span>
 </li>
 </ul>
 </section>

 <!-- 建议 -->
 <section v-if="report.suggestion" class="rounded-2xl bg-primary-soft border border-primary p-4">
 <p class="text-sm">💡 {{ report.suggestion }}</p>
 </section>

 <!-- 复制按钮 -->
 <button
 @click="copyReport"
 class="w-full rounded-2xl bg-secondary hover:opacity-90 text-white font-semibold py-3"
 >
 📋 复制报告到剪贴板
 </button>
 </div>
 </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { getWeekRange, getActiveProjects } from '../services/db.js'

const store = usePointsStore()
const report = ref(null)
const loading = ref(false)
const exporting = ref(false)
const copyToast = ref('')
const reportEl = ref(null)

const CATEGORY_META = {
 饮食: '🍚',
 运动: '🏃',
 学习: '📚',
 生活: '🧹',
 评价: '⭐',
 拨付: '💰'
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

const rangeLabel = computed(() => {
 if (!report.value) return '点击下方按钮生成'
 const r = report.value
 const d = new Date(r.endStr + 'T00:00:00').getDay()
 const dayLabel = DAY_LABS_DAY(d)
 return `${r.startStr} ~ ${r.endStr} (周${dayLabel})`
})

function DAY_LABS_DAY(d) {
 return DAY_LABELS[d === 0 ? 6 : d - 1]
}

async function generate() {
 loading.value = true
 try {
 await store.load()
 const weekDays = getWeekRange(store.today)
 const startStr = weekDays[0]
 const todayIdx = weekDays.indexOf(store.today)
 const endIdx = todayIdx === -1 ? 6 : todayIdx
 const endStr = weekDays[endIdx]
 const activeDays = weekDays.slice(0, endIdx + 1)

 const weekCheckins = store.checkins.filter((c) => activeDays.includes(c.date))
 const weekRequests = store.requests.filter((r) => activeDays.includes(r.date) && r.status === 'approved')

 const weekEarned = weekCheckins.reduce((s, c) => s + (c.pointsEarned || 0), 0)
 const weekSpent = weekRequests.reduce((s, r) => s + (r.pointsCost || 0), 0)

 // 7 天柱状图数据：每天的净增（earned - spent）
 const dailyBars = weekDays.slice(0, endIdx + 1).map((date) => {
 const dayEarned = weekCheckins.filter((c) => c.date === date).reduce((s, c) => s + c.pointsEarned, 0)
 const daySpent = weekRequests.filter((r) => r.date === date).reduce((s, r) => s + r.pointsCost, 0)
 const net = dayEarned - daySpent
 const d = new Date(date + 'T00:00:00').getDay()
 return { date, label: DAY_LABS_DAY(d), net }
 })
 const maxAbs = Math.max(1, ...dailyBars.map((d) => Math.abs(d.net)))
 dailyBars.forEach((d) => { d.heightPct = Math.round((Math.abs(d.net) / maxAbs) * 100) })
 const peakDay = [...dailyBars].sort((a, b) => b.net - a.net)[0] || { net: 0, label: '-' }

 // 7 天打卡日历：按 checkin 数量分 3 档（0/1-2/3+）
 const weeklyCells = weekDays.slice(0, endIdx + 1).map((date) => {
 const count = weekCheckins.filter((c) => c.date === date).length
 const d = new Date(date + 'T00:00:00').getDay()
 let intensity = 0
 if (count >= 3) intensity = 3
 else if (count >= 1) intensity = count
 const net = weekCheckins.filter((c) => c.date === date).reduce((s, c) => s + c.pointsEarned, 0)
 - weekRequests.filter((r) => r.date === date).reduce((s, r) => s + r.pointsCost, 0)
 return { date, label: DAY_LABS_DAY(d), intensity, net }
 })

 // 分类打卡率：从 db.js 拿项目总数
 const projList = (await getActiveProjects()) || []
 const categoryRates = ['饮食', '运动', '学习', '生活', '评价'].map((cat) => {
 const inCat = projList.filter((p) => p.category === cat)
 const checkedIds = new Set(weekCheckins.filter((c) => c.category === cat).map((c) => c.projectId))
 return {
 category: cat,
 emoji: CATEGORY_META[cat],
 totalProjects: inCat.length,
 checkedDays: checkedIds.size,
 pct: inCat.length ? Math.round((checkedIds.size / inCat.length) * 100) : 0
 }
 }).filter((r) => r.totalProjects > 0)

 // 分类统计
 const catMap = new Map()
 for (const c of weekCheckins) {
 const k = c.category || '其他'
 catMap.set(k, (catMap.get(k) || 0) + (c.pointsEarned || 0))
 }
 const categoryRows = [...catMap.entries()]
 .map(([category, points]) => ({ category, points, emoji: CATEGORY_META[category] || '📌' }))
 .sort((a, b) => b.points - a.points)
 if (weekSpent > 0) {
 categoryRows.push({ category: '兑换', points: -weekSpent, emoji: '📺' })
 }

 // 本周最佳
 const projMap = new Map()
 for (const c of weekCheckins) {
 if (!c.projectId) continue
 const k = c.projectId
 if (!projMap.has(k)) projMap.set(k, { name: c.projectName || '未知', points: 0, count: 0 })
 const p = projMap.get(k)
 p.points += c.pointsEarned || 0
 p.count += 1
 }
 const topProject = [...projMap.values()].sort((a, b) => b.points - a.points)[0] || null

 // 学习效果平均
 const ratings = weekCheckins.filter((c) => c.category === '评价' && c.projectName && c.projectName.includes('学习效果'))
 const ratingAvg = ratings.length ? ratings.reduce((s, r) => s + r.pointsEarned, 0) / ratings.length : null
 const ratingCount = ratings.length

 // 连续打卡
 const projDatesMap = new Map()
 for (const c of weekCheckins) {
 if (!c.projectId) continue
 if (!projDatesMap.has(c.projectId)) projDatesMap.set(c.projectId, new Set())
 projDatesMap.get(c.projectId).add(c.date)
 }
 const projectStreaks = [...projDatesMap.entries()]
 .map(([pid, dates]) => ({ name: weekCheckins.find((c) => c.projectId === pid)?.projectName || '未知', streak: dates.size }))
 .filter((p) => p.streak >= 2)
 .sort((a, b) => b.streak - a.streak)
 .slice(0, 5)

 // 建议
 let suggestion = ''
 if (categoryRows.length === 0) {
 suggestion = '本周还没打卡，加油~'
 } else {
 const low = categoryRates.filter((r) => r.pct < 50).sort((a, b) => a.pct - b.pct)[0]
 if (low) {
 suggestion = `${low.category} 打卡率仅 ${low.pct}%，可以多关注一下`
 }
 }

 report.value = {
 startStr,
 endStr,
 weekNet: weekEarned - weekSpent,
 checkinCount: weekCheckins.length,
 weekEarned,
 weekSpent,
 dailyBars,
 peakDay,
 weeklyCells,
 categoryRates,
 categoryRows,
 topProject,
 ratingAvg,
 ratingCount,
 projectStreaks,
 suggestion
 }
 } finally {
 loading.value = false
 }
}

async function copyReport() {
 if (!report.value) return
 const r = report.value
 const lines = []
 lines.push(`📊 皮卡丘本周积分报告（${r.startStr} ~ ${r.endStr}）`)
 lines.push('')
 lines.push(`本周新增: ${r.weekNet >= 0 ? '+' : ''}${r.weekNet}`)
 lines.push(`打卡次数: ${r.checkinCount}`)
 lines.push(`兑换扣分: -${r.weekSpent}`)
 lines.push('')
 lines.push('每日积分:')
 for (const d of r.dailyBars) {
 lines.push(`  周${d.label} (${d.date}): ${d.net >= 0 ? '+' : ''}${d.net}`)
 }
 if (r.topProject) lines.push(`🏆 本周最佳: ${r.topProject.name} (+${r.topProject.points})`)
 if (r.ratingAvg !== null) lines.push(`📈 学习效果平均: ${r.ratingAvg.toFixed(1)}/3`)
 lines.push('')
 lines.push('分类打卡率:')
 for (const row of r.categoryRates) {
 lines.push(`  ${row.emoji} ${row.category}: ${row.checkedDays}/${row.totalProjects} (${row.pct}%)`)
 }
 lines.push('')
 lines.push('分类统计:')
 for (const row of r.categoryRows) {
 lines.push(`  ${row.emoji} ${row.category}: ${row.points > 0 ? '+' : ''}${row.points}`)
 }
 if (r.projectStreaks.length) {
 lines.push('')
 lines.push('🔥 连续打卡:')
 for (const ps of r.projectStreaks) {
 lines.push(`  ${ps.name} 连续 ${ps.streak} 天`)
 }
 }
 if (r.suggestion) {
 lines.push('')
 lines.push(`💡 ${r.suggestion}`)
 }
 const text = lines.join('\n')
 try {
 await navigator.clipboard.writeText(text)
 copyToast.value = '✅ 已复制到剪贴板'
 } catch (e) {
 copyToast.value = '❌ 复制失败：浏览器不允许访问剪贴板'
 }
 setTimeout(() => (copyToast.value = ''), 2000)
}

async function exportImage() {
 if (!reportEl.value) return
 exporting.value = true
 copyToast.value = '正在生成图片...'
 try {
 const html2canvas = (await import('html2canvas')).default
 const canvas = await html2canvas(reportEl.value, {
 backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
 scale: 2,
 useCORS: true
 })
 canvas.toBlob((blob) => {
 if (!blob) {
 copyToast.value = '❌ 生成失败'
 exporting.value = false
 return
 }
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 const r = report.value
 a.href = url
 a.download = `pikachu-report-${r.startStr}-${r.endStr}.png`
 document.body.appendChild(a)
 a.click()
 document.body.removeChild(a)
 URL.revokeObjectURL(url)
 copyToast.value = '✅ 图片已下载'
 exporting.value = false
 setTimeout(() => (copyToast.value = ''), 2000)
 }, 'image/png')
 } catch (e) {
 copyToast.value = '❌ 导出失败: ' + (e.message || e)
 exporting.value = false
 setTimeout(() => (copyToast.value = ''), 3000)
 }
}

onMounted(() => {
 store.load()
 if (window.location.hash.includes('auto=1') || window.location.search.includes('auto=1')) {
 setTimeout(generate, 500)
 }
})
</script>
