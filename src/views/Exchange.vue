<template>
  <div class="space-y-4 animate-fade-in-up">
    <!-- 可用积分 -->
    <section class="rounded-3xl shadow-lg p-6 text-center" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: var(--color-ink)">
      <p class="text-sm font-medium opacity-75">可用积分</p>
      <p class="text-5xl font-extrabold tracking-tight mt-1">{{ store.totalPoints }}</p>
    </section>

    <!-- 申请表单 -->
    <section class="rounded-2xl bg-surface shadow-sm p-5 space-y-3.5">
      <h2 class="font-bold text-lg">🎁 申请兑换</h2>
      <input
        v-model="form.reward"
        placeholder="想要的奖励（例如：冰淇淋）"
        class="w-full bg-primary-soft/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
      />
      <input
        v-model.number="form.pointsCost"
        type="number"
        min="1"
        placeholder="需要多少分"
        class="w-full bg-primary-soft/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
      />
      <textarea
        v-model="form.note"
        rows="2"
        placeholder="备注（可选）"
        class="w-full bg-primary-soft/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all resize-none"
      ></textarea>
      <button
        @click="submit"
        :disabled="!canSubmit"
        class="w-full rounded-xl bg-secondary hover:opacity-90 disabled:opacity-40 text-white font-bold py-3 text-base transition-all btn-press"
      >
        ✨ 提交申请
      </button>
      <p v-if="error" class="text-sm text-secondary text-center font-medium">{{ error }}</p>
    </section>

    <!-- 申请列表 -->
    <section v-if="store.requests.length" class="rounded-2xl bg-surface shadow-sm p-5 space-y-3">
      <h2 class="font-bold text-lg">📋 所有申请</h2>
      <ul class="divide-y divide-primary-soft/50">
        <li
          v-for="r in sortedRequests"
          :key="r.id"
          class="py-3.5 flex items-start justify-between gap-3"
        >
          <div class="flex-1 min-w-0">
            <p class="font-semibold truncate">{{ r.reward }}</p>
            <p class="text-xs text-ink-soft mt-0.5">
              {{ r.date }} · {{ r.pointsCost }} 分
              <span v-if="r.note"> · {{ r.note }}</span>
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span :class="statusBadge(r.status)">{{ statusLabel(r.status) }}</span>
            <!-- 已批准但未查看：显示确认按钮给孩子 -->
            <button
              v-if="r.status === 'approved' && !r.viewed"
              @click="acknowledge(r.id)"
              class="px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-300 to-amber-400 text-ink text-xs font-bold hover:from-yellow-400 hover:to-amber-500 transition-all btn-press shadow-md"
            >
              🎉 查看结果
            </button>
            <template v-if="r.status === 'pending'">
              <button @click="decide(r.id, 'approved')" class="w-9 h-9 rounded-full bg-green-100 text-green-600 hover:bg-green-200 font-bold text-sm transition-colors btn-press">
                ✓
              </button>
              <button @click="decide(r.id, 'rejected')" class="w-9 h-9 rounded-full bg-red-50 text-red-400 hover:bg-red-100 font-bold text-sm transition-colors btn-press">
                ✗
              </button>
            </template>
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
import { playError } from '../services/sound.js'
import { useExchangeDecide } from '../composables/useExchangeDecide.js'
import UltramanEffect from '../components/UltramanEffect.vue'

const store = usePointsStore()
const { showUltraman, ultramanLevel, decide, acknowledge } = useExchangeDecide()
const form = reactive({ reward: '', pointsCost: 1, note: '' })
const error = ref('')

const canSubmit = computed(
  () => form.reward.trim().length > 0 && form.pointsCost > 0
)

const sortedRequests = computed(() =>
  store.requests.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
)

function statusLabel(s) {
  return { pending: '待审核', approved: '✅ 已通过', rejected: '❌ 已拒绝' }[s] || s
}

function statusBadge(s) {
  const map = {
    pending: 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700',
    approved: 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700',
    rejected: 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500'
  }
  return map[s] || ''
}

async function submit() {
  error.value = ''
  if (!canSubmit.value) return
  if (form.pointsCost > store.totalPoints) {
    playError()
    error.value = '积分不足，无法申请'
    return
  }
  await store.addRequest(form.reward.trim(), form.pointsCost, form.note.trim())
  form.reward = ''
  form.pointsCost = 1
  form.note = ''
}

onMounted(async () => {
  await store.load()
  // 自动弹出未查看的审批结果动画
  const unviewed = store.requests.filter((r) => r.status === 'approved' && !r.viewed)
  if (unviewed.length) {
    // 取最新的未查看请求
    const latest = unviewed.sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0))[0]
    acknowledge(latest.id)
  }
})
</script>
