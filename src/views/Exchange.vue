<template>
 <div class="space-y-4">
 <section class="rounded-2xl bg-surface shadow p-4 text-center">
 <p class="text-xs text-ink-soft">可用积分</p>
 <p class="text-4xl font-extrabold text-secondary">{{ store.totalPoints }}</p>
 </section>

 <section class="rounded-2xl bg-surface shadow p-4 space-y-3">
 <h2 class="font-semibold">申请兑换</h2>
 <input
 v-model="form.reward"
 placeholder="想要的奖励(例如:冰淇淋)"
 class="w-full border border-ink-soft rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 />
 <input
 v-model.number="form.pointsCost"
 type="number"
 min="1"
 placeholder="需要多少分"
 class="w-full border border-ink-soft rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 />
 <textarea
 v-model="form.note"
 rows="2"
 placeholder="备注(可选)"
 class="w-full border border-ink-soft rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 ></textarea>
 <button
 @click="submit"
 :disabled="!canSubmit"
 class="w-full rounded-lg bg-primary hover:bg-primary-soft disabled:bg-primary-soft disabled:text-ink-soft text-ink font-semibold py-2"
 >
 提交申请
 </button>
 <p v-if="error" class="text-sm text-secondary">{{ error }}</p>
 </section>

 <section v-if="store.requests.length" class="rounded-2xl bg-surface shadow p-4 space-y-3">
 <h2 class="font-semibold">所有申请</h2>
 <ul class="divide-y">
 <li
 v-for="r in sortedRequests"
 :key="r.id"
 class="py-3 flex items-start justify-between gap-3"
 >
 <div class="flex-1 min-w-0">
 <p class="font-medium truncate">{{ r.reward }}</p>
 <p class="text-xs text-ink-soft">
 {{ r.date }} · {{ r.pointsCost }} 分
 <span v-if="r.note"> · {{ r.note }}</span>
 </p>
 <p class="text-xs mt-0.5">
 <span :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span>
 </p>
 </div>
 <div v-if="r.status === 'pending'" class="flex gap-2 shrink-0">
 <button
 @click="decide(r.id, 'approved')"
 class="px-3 py-1 rounded-full bg-primary-soft text-secondary text-xs font-medium hover:bg-primary"
 >
 通过
 </button>
 <button
 @click="decide(r.id, 'rejected')"
 class="px-3 py-1 rounded-full bg-primary-soft text-ink-soft text-xs font-medium hover:bg-primary"
 >
 拒绝
 </button>
 </div>
 </li>
 </ul>
 </section>
 <UltramanEffect v-if="showUltraman" :level="ultramanLevel" @done="showUltraman = false" />
 </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { playSuccess, playError } from '../services/sound.js'
import { pointsToLevel } from '../utils/level.js'
import UltramanEffect from '../components/UltramanEffect.vue'

const store = usePointsStore()
const form = reactive({ reward: '', pointsCost: 1, note: '' })
const error = ref('')
const showUltraman = ref(false)
const ultramanLevel = ref(1)

const canSubmit = computed(
 () => form.reward.trim().length > 0 && form.pointsCost > 0
)

const sortedRequests = computed(() =>
 store.requests.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
)

function statusLabel(s) {
 return { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[s] || s
}

function statusClass(s) {
 return {
 pending: 'text-secondary',
 approved: 'text-ink',
 rejected: 'text-ink-soft'
 }[s] || ''
}

async function submit() {
 error.value = ''
 if (!canSubmit.value) return
 if (form.pointsCost > store.totalPoints) {
 playError()
 error.value = '积分不足,无法申请'
 return
 }
 await store.addRequest(form.reward.trim(), form.pointsCost, form.note.trim())
 form.reward = ''
 form.pointsCost = 1
 form.note = ''
}

async function decide(id, status) {
 await store.updateRequest(id, { status, decidedAt: Date.now() })
 if (status === 'approved') {
 // 兑换后总积分扣分，按当前积分决定奥特曼等级
 ultramanLevel.value = pointsToLevel(store.totalPoints)
 playSuccess()
 showUltraman.value = true
 } else {
 playError()
 }
}

onMounted(() => {
 store.load()
})
</script>
