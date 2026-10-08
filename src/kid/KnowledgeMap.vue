<template>
  <div class="kg-page">
    <header class="kg-header">
      <button class="kg-back" @click="goBack">← 返回</button>
      <div class="kg-title-wrap">
        <h1 class="kg-title">🗺️ 冒险地图</h1>
        <p class="kg-sub">皮卡丘的知识图谱 · 学到哪了，一眼看清</p>
      </div>
    </header>

    <div v-if="loading" class="kg-state" aria-label="加载中">⏳ 地图加载中…</div>
    <div v-else-if="errorMsg" class="kg-state is-err">❌ {{ errorMsg }}</div>

    <template v-else>
      <!-- 学科 Tab -->
      <nav class="kg-tabs">
        <button
          v-for="(sub, key) in graph.subjects"
          :key="key"
          class="kg-tab"
          :class="{ 'is-on': subject === key }"
          @click="selectSubject(key)"
        >
          {{ sub.icon }} {{ sub.name }}
        </button>
      </nav>

      <!-- 顶部进度（按已掌握节点数） -->
      <div class="kg-stats">
        <span class="kg-stat-label">{{ current.icon }} {{ current.name }}进度</span>
        <div class="kg-stat-bar"><div class="kg-stat-fill" :style="{ width: masteredPct + '%' }"></div></div>
        <span class="kg-stat-num">已掌握 {{ masteredCount }}/{{ totalCount }}</span>
      </div>

      <!-- 图例 -->
      <div class="kg-legend">
        <span class="lg is-mastered">🟢 已掌握</span>
        <span class="lg is-learning">🔵 学习中</span>
        <span class="lg is-weak">🟡 薄弱</span>
        <span class="lg is-not_started">⚪ 未开始</span>
        <span class="lg is-locked">🔒 未解锁</span>
      </div>

      <!-- 树状图 -->
      <section class="kg-tree" data-testid="kg-tree">
        <div v-for="node in current.nodes" :key="node.id" class="kg-branch">
          <button class="kg-node" :class="'is-' + node.status" @click="toggle(node.id)">
            <span class="kg-node-dot"></span>
            <span class="kg-node-name">{{ node.name }}</span>
            <span class="kg-node-status">{{ label(node.status) }}</span>
            <span class="kg-node-arrow">{{ selected === node.id ? '▾' : '▸' }}</span>
          </button>

          <div v-if="selected === node.id" class="kg-detail">
            <div class="kg-detail-title">{{ node.name }} · {{ label(node.status) }}</div>
            <div class="kg-rows">
              <div class="kg-row"><span>掌握度</span><b class="kg-v-mastery">{{ pct(node.mastery) }}</b></div>
              <div class="kg-row"><span>练习数</span><b class="kg-v-practice">{{ num(node.practice_count, '次') }}</b></div>
              <div class="kg-row"><span>错题数</span><b class="kg-v-error">{{ num(node.error_count, '题') }}</b></div>
            </div>
            <div class="kg-detail-hint" v-if="!node.children || !node.children.length">子知识点：数据维护中（待每日复盘补充）</div>
          </div>

          <div v-if="node.children && node.children.length" class="kg-kids">
            <template v-for="kid in node.children" :key="kid.id">
              <button class="kg-node kg-kid" :class="'is-' + kid.status" @click="toggle(kid.id)">
                <span class="kg-node-dot"></span>
                <span class="kg-node-name">{{ kid.name }}</span>
                <span class="kg-node-status">{{ label(kid.status) }}</span>
                <span class="kg-node-arrow">{{ selected === kid.id ? '▾' : '▸' }}</span>
              </button>
              <div v-if="selected === kid.id" class="kg-detail kg-detail--kid">
                <div class="kg-detail-title">{{ kid.name }} · {{ label(kid.status) }}</div>
                <div class="kg-rows">
                  <div class="kg-row"><span>掌握度</span><b class="kg-v-mastery">{{ pct(kid.mastery) }}</b></div>
                  <div class="kg-row"><span>练习数</span><b class="kg-v-practice">{{ num(kid.practice_count, '次') }}</b></div>
                  <div class="kg-row"><span>错题数</span><b class="kg-v-error">{{ num(kid.error_count, '题') }}</b></div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </section>

      <p class="kg-foot">数据由家长/每日复盘维护 · 只读地图，改动请到家长端</p>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const errorMsg = ref('')
const graph = ref({ subjects: {} })
const subject = ref('chinese')
const selected = ref(null)

const current = computed(() => graph.value.subjects[subject.value] || { name: '', icon: '', nodes: [] })
const totalCount = computed(() => current.value.nodes.length)
const masteredCount = computed(() => current.value.nodes.filter((n) => n.status === 'mastered').length)
const masteredPct = computed(() => (totalCount.value ? Math.round((masteredCount.value / totalCount.value) * 100) : 0))

function label(status) {
  const m = graph.value.statusLabels || {}
  return m[status] || status
}
function pct(v) {
  return v === null || v === undefined ? '—（待维护）' : v + '%'
}
function num(v, unit) {
  return v === null || v === undefined ? '—（待维护）' : v + unit
}
function selectSubject(key) {
  subject.value = key
  selected.value = null
}
function toggle(id) {
  selected.value = selected.value === id ? null : id
}
function goBack() {
  const back = router.options.history.state && router.options.history.state.back
  if (back) router.back()
  else router.push('/kid/today')
}

onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL || './'
    const res = await fetch(base + 'knowledge-graph.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    if (!data || !data.subjects || !data.subjects.chinese || !data.subjects.math) {
      throw new Error('数据格式不对')
    }
    graph.value = data
  } catch (e) {
    console.warn('[kg] load knowledge graph failed:', e)
    errorMsg.value = '地图数据加载失败：' + (e && e.message ? e.message : e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.kg-page { max-width: 980px; margin: 0 auto; padding: 20px 16px 40px; display: flex; flex-direction: column; gap: 16px; }

.kg-header { display: flex; align-items: center; gap: 12px; }
.kg-back { border: none; background: rgba(255, 255, 255, 0.9); border-radius: 14px; padding: 10px 14px; font-size: 15px; font-weight: 800; color: #4f46e5; cursor: pointer; font-family: inherit; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.12); }
.kg-back:active { transform: translateY(1px); }
.kg-title { font-size: 26px; font-weight: 900; color: #1e293b; margin: 0; }
.kg-sub { font-size: 14px; color: #64748b; margin: 2px 0 0; }

.kg-state { text-align: center; font-size: 18px; font-weight: 700; color: #64748b; padding: 48px 0; }
.kg-state.is-err { color: #dc2626; }

.kg-tabs { display: flex; gap: 10px; }
.kg-tab { flex: 1; max-width: 220px; border: 2px solid #e0e7ff; background: rgba(255, 255, 255, 0.85); border-radius: 16px; padding: 12px; font-size: 17px; font-weight: 800; color: #64748b; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.kg-tab.is-on { background: #4f46e5; border-color: #4f46e5; color: #fff; }

.kg-stats { display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.85); border: 2px solid #e0e7ff; border-radius: 16px; padding: 12px 16px; }
.kg-stat-label { font-size: 15px; font-weight: 800; color: #1e293b; white-space: nowrap; }
.kg-stat-bar { flex: 1; height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
.kg-stat-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #4ade80); border-radius: 999px; transition: width 0.3s; }
.kg-stat-num { font-size: 14px; font-weight: 800; color: #4f46e5; white-space: nowrap; }

.kg-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 13px; font-weight: 700; color: #64748b; }

.kg-tree { display: flex; flex-direction: column; gap: 14px; }
.kg-branch { background: rgba(255, 255, 255, 0.88); border: 2px solid #e0e7ff; border-radius: 20px; padding: 12px; box-shadow: 0 2px 10px rgba(79, 70, 229, 0.05); }

.kg-node { display: flex; align-items: center; gap: 10px; width: 100%; border: 2px solid #e2e8f0; background: #f8fafc; border-radius: 14px; padding: 12px 14px; font-family: inherit; font-size: 17px; font-weight: 800; color: #1e293b; cursor: pointer; text-align: left; transition: all 0.15s; }
.kg-node:active { transform: translateY(1px); }
.kg-node-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; background: #cbd5e1; }
.kg-node-name { flex: 1; }
.kg-node-status { font-size: 13px; font-weight: 800; color: #64748b; }
.kg-node-arrow { color: #94a3b8; font-size: 14px; }

.kg-node.is-mastered { border-color: #22c55e; background: #f0fdf4; }
.kg-node.is-mastered .kg-node-dot { background: #22c55e; }
.kg-node.is-mastered .kg-node-status { color: #16a34a; }
.kg-node.is-learning { border-color: #3b82f6; background: #eff6ff; }
.kg-node.is-learning .kg-node-dot { background: #3b82f6; }
.kg-node.is-learning .kg-node-status { color: #2563eb; }
.kg-node.is-weak { border-color: #f59e0b; background: #fffbeb; }
.kg-node.is-weak .kg-node-dot { background: #f59e0b; }
.kg-node.is-weak .kg-node-status { color: #d97706; }
.kg-node.is-not_started { border-color: #e2e8f0; background: #f8fafc; }
.kg-node.is-not_started .kg-node-dot { background: #cbd5e1; }
.kg-node.is-locked { border-color: #cbd5e1; background: #f1f5f9; opacity: 0.75; }
.kg-node.is-locked .kg-node-dot { background: #94a3b8; }

.kg-kids { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-left: 26px; border-left: 3px solid #e0e7ff; margin-left: 8px; }
.kg-kid { font-size: 15px; padding: 9px 12px; }

.kg-detail { margin-top: 10px; background: #f8fafc; border: 2px dashed #c7d2fe; border-radius: 14px; padding: 12px 14px; }
.kg-detail--kid { margin-top: 6px; margin-bottom: 4px; }
.kg-detail-title { font-size: 15px; font-weight: 900; color: #4f46e5; margin-bottom: 8px; }
.kg-rows { display: flex; flex-wrap: wrap; gap: 8px 18px; }
.kg-row { font-size: 15px; color: #475569; display: flex; gap: 6px; align-items: baseline; }
.kg-row span { color: #64748b; font-weight: 700; }
.kg-row b { color: #1e293b; font-weight: 900; }
.kg-detail-hint { margin-top: 8px; font-size: 13px; color: #94a3b8; }

.kg-foot { text-align: center; font-size: 12px; color: #94a3b8; margin: 4px 0 0; }

@media (max-width: 768px) {
  .kg-title { font-size: 22px; }
  .kg-stats { flex-wrap: wrap; }
  .kg-kids { padding-left: 14px; }
}
</style>
