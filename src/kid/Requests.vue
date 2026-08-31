<template>
  <div class="req-page">
    <!-- 顶部：可用积分 -->
    <header class="req-header">
      <div class="req-hd-chip">
        <span class="req-hd-icon">⭐</span>
        <div class="req-hd-col">
          <span class="req-hd-label">可用积分</span>
          <span class="req-hd-num">{{ totalPointsText }}</span>
        </div>
      </div>
    </header>

    <!-- 申请表单 -->
    <section class="req-form-card">
      <h2 class="req-card-title">🎁 申请兑换</h2>
      <div class="req-form-row">
        <input
          v-model="form.reward"
          placeholder="想要的奖励（例如：冰淇淋）"
          class="req-input req-input-lg"
        />
        <input
          v-model.number="form.pointsCost"
          type="number"
          min="1"
          placeholder="几分"
          class="req-input req-input-sm"
        />
      </div>
      <div class="req-form-row">
        <input
          v-model="form.note"
          placeholder="备注（可选）"
          class="req-input req-input-full"
        />
        <button
          @click="submit"
          :disabled="!canSubmit || submitting"
          class="req-btn-submit"
        >
          {{ submitting ? '⏳' : '✨' }} 提交
        </button>
      </div>
      <p v-if="error" class="req-error">{{ error }}</p>
    </section>

    <!-- 申请列表 -->
    <section v-if="sortedRequests.length" class="req-list-card">
      <h2 class="req-card-title">📋 我的申请</h2>
      <ul class="req-list">
        <li v-for="r in sortedRequests" :key="r.id" class="req-item">
          <div class="req-item-left">
            <span class="req-item-reward">{{ r.reward }}</span>
            <span class="req-item-meta">
              {{ r.pointsCost }}分 · {{ formatDate(r.createdAt) }}
              <span v-if="r.note"> · {{ r.note }}</span>
            </span>
          </div>
          <div class="req-item-right">
            <span :class="statusBadge(r.status)">{{ statusLabel(r.status) }}</span>
            <button
              v-if="r.status === 'approved' && !r.viewed"
              @click="acknowledge(r.id)"
              class="req-btn-ack"
            >
              🎉 确认
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 空状态 -->
    <section v-else class="req-empty">
      <div class="req-empty-emoji">📝</div>
      <div class="req-empty-text">还没有申请记录</div>
      <div class="req-empty-hint">完成任务攒积分，然后在这里兑换奖励！</div>
    </section>

    <UltramanEffect v-if="showUltraman" :level="ultramanLevel" @done="showUltraman = false" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { useExchangeDecide } from '../composables/useExchangeDecide.js'
import UltramanEffect from '../components/UltramanEffect.vue'

const store = usePointsStore()
const { showUltraman, ultramanLevel, acknowledge } = useExchangeDecide()

const form = reactive({ reward: '', pointsCost: 1, note: '' })
const error = ref('')
const submitting = ref(false)

const canSubmit = computed(() => form.reward.trim().length > 0 && form.pointsCost > 0)
const totalPointsText = computed(() => store.totalPoints.toLocaleString('en-US'))

const sortedRequests = computed(() =>
  store.requests.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
)

function statusLabel(s) {
  return { pending: '⏳ 待审核', approved: '✅ 已通过', rejected: '❌ 已拒绝' }[s] || s
}
function statusBadge(s) {
  const map = {
    pending: 'req-badge req-badge-pending',
    approved: 'req-badge req-badge-approved',
    rejected: 'req-badge req-badge-rejected'
  }
  return map[s] || ''
}
function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function submit() {
  error.value = ''
  if (!canSubmit.value) return
  if (form.pointsCost > store.totalPoints) {
    error.value = '积分不够哦！'
    return
  }
  submitting.value = true
  try {
    await store.addRequest(form.reward.trim(), form.pointsCost, form.note.trim())
    form.reward = ''
    form.pointsCost = 1
    form.note = ''
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  store.load()
})
</script>

<style scoped>
.req-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 顶部积分 */
.req-header {
  display: flex;
  justify-content: center;
}
.req-hd-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #451a03;
  border-radius: 16px;
  padding: 10px 24px;
}
.req-hd-icon { font-size: 24px; }
.req-hd-col { display: flex; flex-direction: column; }
.req-hd-label { font-size: 11px; opacity: 0.8; }
.req-hd-num { font-size: 28px; font-weight: 800; line-height: 1; }

/* 表单卡片 */
.req-form-card {
  background: var(--tt-card, #fff);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.req-card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--tt-text, #1a1a1a);
}
.req-form-row {
  display: flex;
  gap: 8px;
}
.req-input {
  border: 1.5px solid var(--tt-border, #e5e7eb);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: var(--tt-bg, #fafafa);
  color: var(--tt-text, #1a1a1a);
  outline: none;
  transition: border-color 0.2s;
}
.req-input:focus {
  border-color: #f59e0b;
}
.req-input-lg { flex: 1; }
.req-input-sm { width: 70px; text-align: center; }
.req-input-full { flex: 1; }
.req-btn-submit {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #451a03;
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}
.req-btn-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.req-error {
  font-size: 12px;
  color: #ef4444;
  text-align: center;
}

/* 申请列表 */
.req-list-card {
  background: var(--tt-card, #fff);
  border-radius: 16px;
  padding: 14px 16px;
}
.req-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.req-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--tt-border, #f0f0f0);
}
.req-item:last-child { border-bottom: none; }
.req-item-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.req-item-reward {
  font-size: 14px;
  font-weight: 600;
  color: var(--tt-text, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.req-item-meta {
  font-size: 11px;
  color: var(--tt-muted, #9ca3af);
}
.req-item-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.req-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 99px;
}
.req-badge-pending { background: #fef3c7; color: #92400e; }
.req-badge-approved { background: #d1fae5; color: #065f46; }
.req-badge-rejected { background: #f3f4f6; color: #6b7280; }
.req-btn-ack {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #451a03;
  border: none;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

/* 空状态 */
.req-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 8px;
}
.req-empty-emoji { font-size: 48px; }
.req-empty-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--tt-text, #1a1a1a);
}
.req-empty-hint {
  font-size: 12px;
  color: var(--tt-muted, #9ca3af);
  text-align: center;
}
</style>
