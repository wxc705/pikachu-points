<template>
 <div class="space-y-4">
 <header class="rounded-2xl bg-surface shadow p-4">
 <div class="flex items-center justify-between">
 <div>
 <p class="text-xs text-ink-soft">皮卡丘积分</p>
 <p class="text-3xl font-extrabold text-secondary">{{ store.totalPoints }}</p>
 </div>
 <div class="text-right">
 <p class="text-xs text-ink-soft">今日</p>
 <p :class="['text-2xl font-bold', store.todayNet >= 0 ? 'text-secondary' : 'text-secondary']">
 {{ store.todayNet >= 0 ? '+' : '' }}{{ store.todayNet }}
 </p>
 </div>
 </div>
 </header>

 <!-- 云同步面板 -->
 <section class="rounded-2xl bg-surface shadow p-4 space-y-2">
 <div class="flex items-center justify-between">
 <h2 class="font-semibold text-sm flex items-center gap-1.5">
 <Cloud class="w-4 h-4" :stroke-width="2" />
 云同步
 </h2>
 <span v-if="store.lastSyncedAt" class="text-xs text-ink-soft">
 {{ formatTime(store.lastSyncedAt) }}
 </span>
 </div>
 <div class="grid grid-cols-3 gap-2">
 <button
 @click="onPush"
 :disabled="store.isSyncing"
 class="rounded-xl bg-primary hover:bg-primary-soft disabled:bg-primary-soft text-ink text-xs font-medium py-2 flex items-center justify-center gap-1"
 >
 <Upload class="w-4 h-4" :stroke-width="2.5" />
 {{ store.isSyncing ? '…' : '推送' }}
 </button>
 <button
 @click="onPull"
 :disabled="store.isSyncing"
 class="rounded-xl bg-primary hover:bg-primary-soft disabled:bg-primary-soft text-ink text-xs font-medium py-2 flex items-center justify-center gap-1"
 >
 <Download class="w-4 h-4" :stroke-width="2.5" />
 {{ store.isSyncing ? '…' : '拉取' }}
 </button>
 <button
 @click="onSync"
 :disabled="store.isSyncing"
 class="rounded-xl bg-secondary hover:opacity-90 disabled:opacity-50 text-white text-xs font-medium py-2 flex items-center justify-center gap-1"
 >
 <RefreshCw class="w-4 h-4" :stroke-width="2.5" />
 {{ store.isSyncing ? '同步中' : '同步' }}
 </button>
 </div>
 <p v-if="syncMsg" class="text-xs text-center text-secondary">{{ syncMsg }}</p>
 <p v-if="store.lastSyncError" class="text-xs text-center text-secondary">❌ {{ store.lastSyncError }}</p>
 </section>

 <!-- 待确认兑换申请 -->
 <section v-if="pendingRequests.length" class="rounded-2xl bg-surface shadow p-4">
 <div class="flex items-center justify-between mb-2">
 <h2 class="font-semibold text-sm">⏳ 待确认兑换 ({{ pendingRequests.length }})</h2>
 </div>
 <ul class="space-y-2">
 <li
 v-for="r in pendingRequests"
 :key="r.id"
 class="flex items-center justify-between gap-2 p-3 rounded-xl bg-primary-soft"
 >
 <div class="flex-1 min-w-0">
 <p class="font-medium text-sm truncate">{{ r.reward }}</p>
 <p class="text-xs text-ink-soft">申请扣 {{ r.pointsCost }} 分 · {{ r.date }}</p>
 </div>
 <div class="flex gap-1 shrink-0">
 <button
 @click="decide(r.id, 'approved')"
 class="px-3 py-1 rounded-full bg-secondary text-white text-xs font-semibold"
 >
 ✓
 </button>
 <button
 @click="decide(r.id, 'rejected')"
 class="px-3 py-1 rounded-full bg-primary text-ink text-xs font-semibold"
 >
 ✗
 </button>
 </div>
 </li>
 </ul>
 </section>

 <!-- 快捷操作 -->
 <section class="rounded-2xl bg-surface shadow p-4 space-y-3">
 <h2 class="font-semibold text-sm">快捷操作</h2>
 <div class="grid grid-cols-2 gap-3">
 <router-link
 to="/checkin"
 class="rounded-xl bg-primary-soft p-3 text-center hover:bg-primary"
 >
 <CheckCircle2 class="w-7 h-7 mx-auto text-secondary" :stroke-width="2" />
 <div class="text-sm font-medium mt-1">快速打卡</div>
 </router-link>
 <router-link
 to="/rating"
 class="rounded-xl bg-primary-soft p-3 text-center hover:bg-primary"
 >
 <Star class="w-7 h-7 mx-auto text-secondary" :stroke-width="2" />
 <div class="text-sm font-medium mt-1">学习评分</div>
 </router-link>
 <router-link
 to="/exchange"
 class="rounded-xl bg-primary-soft p-3 text-center hover:bg-primary"
 >
 <Gift class="w-7 h-7 mx-auto text-secondary" :stroke-width="2" />
 <div class="text-sm font-medium mt-1">兑换</div>
 </router-link>
 <router-link
 to="/history"
 class="rounded-xl bg-primary-soft p-3 text-center hover:bg-primary"
 >
 <Clock class="w-7 h-7 mx-auto text-secondary" :stroke-width="2" />
 <div class="text-sm font-medium mt-1">历史</div>
 </router-link>
 </div>
 </section>

 <!-- 今日打卡概览 -->
 <section v-if="todayCheckins.length" class="rounded-2xl bg-surface shadow p-4">
 <h2 class="font-semibold text-sm mb-2">今日已打卡 ({{ todayCheckins.length }})</h2>
 <ul class="space-y-1 text-sm">
 <li
 v-for="c in todayCheckins"
 :key="c.id"
 class="flex items-center justify-between"
 >
 <span>{{ c.projectName }}</span>
 <span class="text-secondary font-semibold">+{{ c.pointsEarned }}</span>
 </li>
 </ul>
 </section>

 <!-- 拨付积分 -->
 <section class="rounded-2xl bg-surface shadow p-4 space-y-3">
 <h2 class="font-semibold text-sm">💰 拨付积分</h2>
 <div class="flex items-center gap-2">
 <button
 @click="grantDelta(-10)"
 :disabled="store.isSyncing"
 class="w-9 h-9 rounded-full bg-primary-soft text-secondary text-sm font-bold disabled:opacity-30"
 >
 -10
 </button>
 <input
 v-model.number="grantAmount"
 type="number"
 placeholder="分数"
 class="flex-1 rounded-xl border border-ink-soft px-3 py-2 text-sm focus:outline-none focus:border-primary"
 />
 <button
 @click="grantDelta(10)"
 :disabled="store.isSyncing"
 class="w-9 h-9 rounded-full bg-secondary text-white text-sm font-bold disabled:opacity-30"
 >
 +10
 </button>
 </div>
 <div class="grid grid-cols-4 gap-2">
 <button
 v-for="n in [1, 5, 10, 50]"
 :key="n"
 @click="grantAmount = n"
 class="rounded-lg bg-primary-soft text-ink text-xs font-medium py-1"
 >
 +{{ n }}
 </button>
 </div>
 <input
 v-model="grantReason"
 placeholder="原因（如：表现好、帮忙做家务）"
 class="w-full rounded-xl border border-ink-soft px-3 py-2 text-sm focus:outline-none focus:border-primary"
 />
 <button
 @click="onGrant"
 :disabled="!grantAmount || store.isSyncing"
 class="w-full py-2 rounded-2xl bg-secondary text-white font-semibold disabled:opacity-50"
 >
 确认拨付
 </button>
 <p v-if="grantError" class="text-xs text-secondary">{{ grantError }}</p>
 </section>
 <UltramanEffect v-if="showUltraman" :level="ultramanLevel" @done="showUltraman = false" />
 </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { playSuccess, playError, playCoin } from '../services/sound.js'
import { pointsToLevel } from '../utils/level.js'
import { CheckCircle2, Star, Gift, Clock, Upload, Download, RefreshCw, Cloud } from 'lucide-vue-next'
import UltramanEffect from '../components/UltramanEffect.vue'

const store = usePointsStore()
const syncMsg = ref('')
const showUltraman = ref(false)
const ultramanLevel = ref(1)
const grantAmount = ref(null)
const grantReason = ref('')
const grantError = ref('')

const pendingRequests = computed(() =>
 store.requests.filter((r) => r.status === 'pending')
)

const todayCheckins = computed(() =>
 store.checkins.filter((c) => c.date === store.today)
)

function formatTime(iso) {
 if (!iso) return ''
 const d = new Date(iso)
 const now = new Date()
 const diff = (now - d) / 1000
 if (diff < 60) return '刚刚'
 if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
 if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
 return d.getMonth() + 1 + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

async function onPush() {
 syncMsg.value = ''
 try {
 const r = await store.syncPushToCloud()
 syncMsg.value = `✅ 推送 ${r.pushed} 条`
 setTimeout(() => (syncMsg.value = ''), 3000)
 } catch (e) {
 syncMsg.value = '❌ 推送失败'
 }
}

async function onPull() {
 syncMsg.value = ''
 try {
 const r = await store.syncPullFromCloud()
 if (r.pulled > 0) {
 syncMsg.value = `✅ 拉取 ${r.pulled} 条`
 } else {
 syncMsg.value = '云端无新数据'
 }
 setTimeout(() => (syncMsg.value = ''), 3000)
 } catch (e) {
 syncMsg.value = '❌ 拉取失败'
 }
}

async function onSync() {
 syncMsg.value = ''
 try {
 const r = await store.syncBothWays()
 syncMsg.value = `✅ 推 ${r.pushed} / 拉 ${r.pulled}`
 setTimeout(() => (syncMsg.value = ''), 3000)
 } catch (e) {
 syncMsg.value = '❌ 同步失败'
 }
}

async function decide(id, status) {
 await store.updateRequest(id, { status, decidedAt: Date.now() })
 if (status === 'approved') {
 // 批准后总积分扣分，按当前积分决定奥特曼等级
 ultramanLevel.value = pointsToLevel(store.totalPoints)
 playSuccess()
 showUltraman.value = true
 } else {
 playError()
 }
}

function grantDelta(delta) {
 grantAmount.value = (grantAmount.value || 0) + delta
}

async function onGrant() {
 grantError.value = ''
 const pts = Number(grantAmount.value)
 if (!pts || isNaN(pts)) {
 playError()
 grantError.value = '请输入分数'
 return
 }
 if (pts < 0 && store.totalPoints + pts < 0) {
 playError()
 grantError.value = '积分不够扣，会变负数'
 return
 }
 try {
 await store.addGrantPoints(pts, grantReason.value)
 if (pts > 0) {
 playCoin()
 } else {
 playError()
 }
 grantAmount.value = null
 grantReason.value = ''
 } catch (e) {
 playError()
 grantError.value = '拨付失败'
 }
}

onMounted(() => {
 store.load()
})
</script>
