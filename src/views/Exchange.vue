<template>
  <div class="space-y-4 animate-fade-in-up">
    <!-- 可用积分 -->
    <section class="rounded-3xl shadow-lg p-6 text-center" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: var(--color-ink)">
      <p class="text-sm font-medium opacity-75">可用积分</p>
      <p class="text-5xl font-extrabold tracking-tight mt-1">{{ store.totalPoints }}</p>
    </section>

    <!-- 奖品库（家长录商城兑换奖品 → 儿童端商城展示，数据源 projects.category=兑换） -->
    <section class="rounded-2xl bg-surface shadow-sm p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-lg">🎁 奖品库</h2>
        <span v-if="editingId" class="text-xs font-semibold text-secondary">✏️ 编辑中</span>
      </div>
      <p class="text-xs text-ink-soft -mt-2">家长在这里录入奖品，儿童端「商城」按分值展示</p>
      <div class="flex gap-2">
        <input
          v-model="rwForm.name"
          placeholder="奖品名（例如：贴纸）"
          class="flex-1 min-w-0 bg-primary-soft/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
        />
        <input
          v-model.number="rwForm.points"
          type="number"
          min="1"
          placeholder="几分"
          class="w-24 bg-primary-soft/50 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
        />
        <button
          @click="saveReward"
          :disabled="!rwForm.name.trim() || !(rwForm.points > 0)"
          class="rounded-xl bg-secondary hover:opacity-90 disabled:opacity-40 text-white font-bold px-4 text-sm transition-all btn-press"
        >{{ editingId ? '保存' : '添加' }}</button>
        <button
          v-if="editingId"
          @click="cancelEdit"
          class="rounded-xl bg-primary-soft/50 text-ink-soft font-medium px-3 text-sm transition-all"
        >取消</button>
      </div>
      <p v-if="rwMsg" class="text-sm text-center font-medium">{{ rwMsg }}</p>
      <ul v-if="rewards.length" class="divide-y divide-primary-soft/50">
        <li v-for="r in rewards" :key="r.id" class="py-2.5 flex items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="font-semibold truncate">🎁 {{ r.name }}</p>
            <p class="text-xs text-ink-soft mt-0.5">{{ r.points }} 分<span v-if="r.isActive === false"> · 已下架</span></p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button @click="editReward(r)" title="编辑" class="w-9 h-9 rounded-full bg-primary-soft/60 hover:bg-primary-soft text-sm transition-colors btn-press">✏️</button>
            <button @click="removeReward(r)" title="删除" class="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-sm transition-colors btn-press">🗑️</button>
          </div>
        </li>
      </ul>
      <p v-else class="text-sm text-ink-soft text-center py-2">还没有奖品，添加第一个吧 🎈</p>
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

// 🎁 奖品库（家长录入 → store.projects category=兑换 → 儿童端商城直出）
const rwForm = reactive({ name: '', points: 10 })
const editingId = ref(null)
const rwMsg = ref('')
const rewards = computed(() => store.projects.filter((p) => p.category === '兑换'))

function rwToast(msg) {
  rwMsg.value = msg
  setTimeout(() => { rwMsg.value = '' }, 3000)
}

async function saveReward() {
  const name = rwForm.name.trim()
  if (!name || !(rwForm.points > 0)) return
  try {
    if (editingId.value) {
      await store.updateProjectItem(editingId.value, { name, points: Number(rwForm.points) })
      rwToast('✅ 已保存')
    } else {
      await store.addProjectItem({ category: '兑换', name, points: Number(rwForm.points) })
      rwToast('✅ 已加入奖品库（儿童端商城刷新可见）')
    }
    rwForm.name = ''
    rwForm.points = 10
    editingId.value = null
  } catch (e) {
    console.warn('[exchange] save reward failed:', e)
    rwToast('❌ 保存失败：' + (e && e.message ? e.message : '未知错误'))
  }
}

function editReward(r) {
  editingId.value = r.id
  rwForm.name = r.name
  rwForm.points = r.points || 1
}

function cancelEdit() {
  editingId.value = null
  rwForm.name = ''
  rwForm.points = 10
}

async function removeReward(r) {
  if (!window.confirm(`删除奖品「${r.name}」？儿童端商城将不再显示。`)) return
  try {
    await store.deleteProjectItem(r.id)
    if (editingId.value === r.id) cancelEdit()
    rwToast('🗑️ 已删除')
  } catch (e) {
    console.warn('[exchange] delete reward failed:', e)
    rwToast('❌ 删除失败：' + (e && e.message ? e.message : '未知错误'))
  }
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
