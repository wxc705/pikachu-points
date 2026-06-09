<template>
  <div class="space-y-4 animate-fade-in-up">
    <!-- 积分概览 -->
    <section class="rounded-3xl shadow-lg p-5" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: var(--color-ink)">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-medium opacity-75">⚡ 皮卡丘积分</p>
          <p class="text-4xl font-extrabold tracking-tight mt-0.5">{{ store.totalPoints }}</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-medium opacity-75">今日</p>
          <p class="text-3xl font-bold">{{ store.todayNet >= 0 ? '+' : '' }}{{ store.todayNet }}</p>
        </div>
      </div>
    </section>

    <!-- 云同步 -->
    <section class="rounded-2xl bg-surface shadow-sm p-4 space-y-2.5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-sm flex items-center gap-1.5">
          <Cloud class="w-4 h-4" :stroke-width="2" /> 云同步
        </h2>
        <span v-if="store.lastSyncedAt" class="text-xs text-ink-soft">{{ formatTime(store.lastSyncedAt) }}</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button @click="onPush" :disabled="store.isSyncing" class="rounded-xl bg-primary hover:bg-primary-soft disabled:opacity-50 text-ink text-xs font-semibold py-2.5 flex items-center justify-center gap-1 transition-colors btn-press">
          <Upload class="w-4 h-4" :stroke-width="2.5" /> {{ store.isSyncing ? '…' : '推送' }}
        </button>
        <button @click="onPull" :disabled="store.isSyncing" class="rounded-xl bg-primary hover:bg-primary-soft disabled:opacity-50 text-ink text-xs font-semibold py-2.5 flex items-center justify-center gap-1 transition-colors btn-press">
          <Download class="w-4 h-4" :stroke-width="2.5" /> {{ store.isSyncing ? '…' : '拉取' }}
        </button>
        <button @click="onSync" :disabled="store.isSyncing" class="rounded-xl bg-secondary hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold py-2.5 flex items-center justify-center gap-1 transition-all btn-press">
          <RefreshCw class="w-4 h-4" :stroke-width="2.5" /> {{ store.isSyncing ? '同步中' : '同步' }}
        </button>
      </div>
      <p v-if="syncMsg" class="text-xs text-center font-medium text-secondary">{{ syncMsg }}</p>
      <p v-if="store.lastSyncError" class="text-xs text-center text-red-500">❌ {{ store.lastSyncError }}</p>
    </section>

    <!-- 待确认兑换 -->
    <section v-if="pendingRequests.length" class="rounded-2xl bg-red-50/50 border border-red-100 shadow-sm p-4">
      <h2 class="font-bold text-sm mb-3 flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        ⏳ 待确认兑换（{{ pendingRequests.length }}）
      </h2>
      <ul class="space-y-2">
        <li v-for="r in pendingRequests" :key="r.id" class="flex items-center justify-between gap-2 p-3 rounded-xl bg-white shadow-sm">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate">{{ r.reward }}</p>
            <p class="text-xs text-ink-soft">扣 {{ r.pointsCost }} 分 · {{ r.date }}</p>
          </div>
          <div class="flex gap-1.5 shrink-0">
            <button @click="decide(r.id, 'approved')" class="w-10 h-10 rounded-full bg-green-500 text-white font-bold hover:bg-green-600 transition-colors btn-press">✓</button>
            <button @click="decide(r.id, 'rejected')" class="w-10 h-10 rounded-full bg-gray-200 text-gray-500 font-bold hover:bg-gray-300 transition-colors btn-press">✗</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 快捷操作 -->
    <section class="rounded-2xl bg-surface shadow-sm p-4">
      <h2 class="font-bold text-sm mb-3">⚡ 快捷操作</h2>
      <div class="grid grid-cols-2 gap-2.5">
        <router-link v-for="act in quickActions" :key="act.to" :to="act.to" class="rounded-xl bg-primary-soft/70 p-4 text-center hover:bg-primary-soft transition-colors card-lift btn-press">
          <component :is="act.icon" class="w-8 h-8 mx-auto text-secondary" :stroke-width="1.5" />
          <div class="text-sm font-semibold mt-1.5">{{ act.label }}</div>
        </router-link>
      </div>
    </section>

    <!-- 今日打卡 -->
    <section v-if="todayCheckins.length" class="rounded-2xl bg-surface shadow-sm p-4">
      <h2 class="font-bold text-sm mb-2.5">✅ 今日已打卡（{{ todayCheckins.length }} 项）</h2>
      <ul class="space-y-1.5 text-sm">
        <li v-for="c in todayCheckins" :key="c.id" class="flex items-center justify-between py-1">
          <span class="text-ink-soft">{{ c.projectName }}</span>
          <span class="text-secondary font-bold">+{{ c.pointsEarned }}</span>
        </li>
      </ul>
    </section>

    <!-- 拨付积分 -->
    <section class="rounded-2xl bg-surface shadow-sm p-4 space-y-3">
      <h2 class="font-bold text-sm">💰 拨付积分</h2>
      <div class="flex items-center gap-2">
        <button @click="grantDelta(-10)" :disabled="store.isSyncing" class="w-10 h-10 rounded-full bg-red-100 text-red-500 font-bold hover:bg-red-200 disabled:opacity-30 transition-colors btn-press">-10</button>
        <input v-model.number="grantAmount" type="number" placeholder="输入分数" class="flex-1 rounded-xl bg-primary-soft/50 px-4 py-2.5 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
        <button @click="grantDelta(10)" :disabled="store.isSyncing" class="w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold hover:bg-green-200 disabled:opacity-30 transition-colors btn-press">+10</button>
      </div>
      <div class="grid grid-cols-4 gap-2">
        <button v-for="n in [1, 5, 10, 50]" :key="n" @click="grantAmount = n" class="rounded-lg bg-primary-soft/70 text-ink text-xs font-semibold py-2 hover:bg-primary transition-colors btn-press">+{{ n }}</button>
      </div>
      <input v-model="grantReason" placeholder="原因（如：表现好、帮忙做家务）" class="w-full rounded-xl bg-primary-soft/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
      <button @click="onGrant" :disabled="!grantAmount || store.isSyncing" class="w-full py-3 rounded-xl bg-secondary text-white font-bold hover:opacity-90 disabled:opacity-40 transition-all btn-press">
        ✨ 确认拨付
      </button>
      <p v-if="grantError" class="text-xs text-red-500 text-center font-medium">{{ grantError }}</p>
    </section>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { playError, playCoin } from '../services/sound.js'
import { useExchangeDecide } from '../composables/useExchangeDecide.js'
import { CheckCircle2, Star, Gift, Clock, Upload, Download, RefreshCw, Cloud } from 'lucide-vue-next'

const store = usePointsStore()
const { decide } = useExchangeDecide()
const syncMsg = ref('')
const grantAmount = ref(null)
const grantReason = ref('')
const grantError = ref('')

const pendingRequests = computed(() => store.requests.filter((r) => r.status === 'pending'))
const todayCheckins = computed(() => store.checkins.filter((c) => c.date === store.today))

const quickActions = [
  { to: '/checkin', label: '快速打卡', icon: CheckCircle2 },
  { to: '/rating', label: '学习评分', icon: Star },
  { to: '/exchange', label: '兑换管理', icon: Gift },
  { to: '/history', label: '历史记录', icon: Clock }
]

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
  } catch (e) { syncMsg.value = '❌ 推送失败' }
}
async function onPull() {
  syncMsg.value = ''
  try {
    const r = await store.syncPullFromCloud()
    syncMsg.value = r.pulled > 0 ? `✅ 拉取 ${r.pulled} 条` : '云端无新数据'
    setTimeout(() => (syncMsg.value = ''), 3000)
  } catch (e) { syncMsg.value = '❌ 拉取失败' }
}
async function onSync() {
  syncMsg.value = ''
  try {
    const r = await store.syncBothWays()
    syncMsg.value = `✅ 推 ${r.pushed} / 拉 ${r.pulled}`
    setTimeout(() => (syncMsg.value = ''), 3000)
  } catch (e) { syncMsg.value = '❌ 同步失败' }
}

function grantDelta(delta) { grantAmount.value = (grantAmount.value || 0) + delta }

async function onGrant() {
  grantError.value = ''
  const pts = Number(grantAmount.value)
  if (!pts || isNaN(pts)) { playError(); grantError.value = '请输入分数'; return }
  if (pts < 0 && store.totalPoints + pts < 0) { playError(); grantError.value = '积分不够扣'; return }
  try {
    await store.addGrantPoints(pts, grantReason.value)
    pts > 0 ? playCoin() : playError()
    grantAmount.value = null; grantReason.value = ''
  } catch (e) { playError(); grantError.value = '拨付失败' }
}

onMounted(() => { store.load() })
</script>
