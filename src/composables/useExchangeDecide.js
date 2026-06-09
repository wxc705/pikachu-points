import { ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { playSuccess, playError } from '../services/sound.js'
import { pointsToLevel } from '../utils/level.js'

export function useExchangeDecide() {
  const store = usePointsStore()
  const showUltraman = ref(false)
  const ultramanLevel = ref(1)

  // 家长审批：只改状态，不弹动画
  async function decide(id, status) {
    const req = store.requests.find((r) => r.id === id)
    const patch = { status, decidedAt: Date.now() }
    if (status === 'approved') {
      patch.viewed = false
    }
    await store.updateRequest(id, patch)
    if (status === 'rejected') {
      playError()
    }
    // 审批后自动推送（fire-and-forget，不阻塞 UI）
    if (status === 'approved' || status === 'rejected') {
      store.syncPushToCloud().catch(() => {})
    }
  }

  // 孩子端确认查看：弹出动画 + 标记已查看
  async function acknowledge(id) {
    const req = store.requests.find((r) => r.id === id)
    if (!req || req.status !== 'approved') return

    await store.updateRequest(id, { viewed: true })
    ultramanLevel.value = pointsToLevel(req.pointsCost || store.totalPoints)
    playSuccess()
    showUltraman.value = true
  }

  return { showUltraman, ultramanLevel, decide, acknowledge }
}
