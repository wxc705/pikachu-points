<template>
 <div class="space-y-4">
 <header class="rounded-2xl bg-surface shadow p-4 flex items-center justify-between">
 <div>
 <p class="text-xs text-ink-soft">今日获得</p>
 <p class="text-2xl font-bold text-secondary">+{{ store.todayEarned }}</p>
 </div>
 <div class="text-right">
 <p class="text-xs text-ink-soft">总积分</p>
 <p class="text-xl font-semibold">{{ store.totalPoints }}</p>
 </div>
 </header>

 <div v-if="toast" class="rounded-xl bg-primary-soft text-ink px-4 py-2 text-sm">
 {{ toast }}
 </div>

 <!-- 今日推荐（来自家长端每周计划） -->
 <section v-if="store.todayRecommended.length" class="rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-200 shadow p-4">
 <h2 class="text-sm font-bold mb-2 flex items-center gap-1">
 <span>🌟 今日推荐</span>
 <span class="text-xs text-ink-soft font-normal">（来自家长端每周计划）</span>
 </h2>
 <div class="grid grid-cols-2 gap-2">
 <button
 v-for="p in store.todayRecommended"
 :key="'rec-'+p.id"
 @click="openPicker(p, $event)"
 :disabled="isChecked(p)"
 :class="[
  'rounded-xl p-3 text-left text-sm font-medium shadow transition',
  isChecked(p)
 ? 'bg-surface text-ink-soft opacity-60 line-through'
 : 'bg-surface hover:bg-primary-soft text-ink'
 ]"
 >
 <span class="block text-lg">{{ categoryEmoji(p.category) }}</span>
 <span class="block">{{ p.name }}</span>
 <span class="block text-xs text-ink-soft mt-0.5">
 {{ p.pointRange ? `${p.pointRange[0]}-${p.pointRange[1]}` : `+${p.points || 0}` }}
 </span>
 </button>
 </div>
 </section>

 <div v-for="group in groupedProjects" :key="group.category">
 <h2 class="text-sm font-semibold text-ink-soft mb-2 px-1">
 {{ group.category }}
 </h2>
 <div class="grid grid-cols-2 gap-3">
 <button
 v-for="p in group.items"
 :key="p.id"
 @click="onTap(p, $event)"
 :disabled="isChecked(p)"
 :class="[
 'rounded-2xl shadow transition p-4 text-left',
 isChecked(p)
 ? 'bg-primary-soft text-ink-soft cursor-not-allowed'
 : 'bg-surface hover:bg-primary-soft active:scale-95'
]"
 >
 <div class="font-medium flex items-center gap-1">
 <span v-if="isChecked(p)">✅</span>
 <span>{{ p.name }}</span>
 <span v-if="isChecked(p) && (store.todayProjectCounts.get(p.id) ||0) >1" class="text-xs text-ink-soft">
 ×{{ store.todayProjectCounts.get(p.id) }}
 </span>
 </div>
 <div class="text-xs mt-1" :class="isChecked(p) ? 'text-ink-soft' : 'text-ink-soft'">
 <span v-if="p.pointRange">+{{ p.pointRange[0] }}~{{ p.pointRange[1] }} 分</span>
 <span v-else>+{{ p.points }} 分</span>
 </div>
 </button>
 </div>
 </div>

 <div
 v-if="picker.open"
 class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
 @click.self="picker.open = false"
 >
 <div class="bg-surface w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 space-y-4">
 <h3 class="font-semibold text-lg">{{ picker.project?.name }}</h3>
 <p class="text-sm text-ink-soft">选择本次奖励的积分</p>
 <div class="flex flex-wrap gap-2">
 <button
 v-for="n in picker.options"
 :key="n"
 @click="pickAndAdd(n)"
 class="px-4 py-2 rounded-full bg-primary-soft hover:bg-primary font-medium"
 >
 +{{ n }}
 </button>
 </div>
 <button
 @click="picker.open = false"
 class="w-full text-sm text-ink-soft py-2"
 >
 取消
 </button>
 </div>
 </div>

 <CoinBurst
 v-if="coinBurst"
 :x="coinBurst.x"
 :y="coinBurst.y"
 @done="coinBurst = null"
 />
 </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { playCoin } from '../services/sound.js'
import CoinBurst from '../components/CoinBurst.vue'

const store = usePointsStore()
const toast = ref('')
const picker = reactive({ open: false, project: null, options: [], button: null })
const coinBurst = ref(null)

const projects = computed(() => store.projects.filter((p) => p.isActive !== false))

const groupedProjects = computed(() => {
 const order = ['饮食', '运动', '学习', '生活', '评价']
 const map = new Map()
 for (const p of projects.value) {
 if (!map.has(p.category)) map.set(p.category, [])
 map.get(p.category).push(p)
 }
 const groups = []
 for (const cat of order) {
 if (map.has(cat)) {
 const items = map.get(cat).slice().sort((a, b) => (a.sortOrder ||0) - (b.sortOrder ||0))
 groups.push({ category: cat, items })
 map.delete(cat)
 }
 }
 for (const [cat, items] of map) {
 groups.push({ category: cat, items: items.sort((a, b) => (a.sortOrder ||0) - (b.sortOrder ||0)) })
 }
 return groups
})

function flash(msg) {
 toast.value = msg
 setTimeout(() => (toast.value = ''), 1500)
}

function isChecked(project) {
 return store.todayCheckedProjectIds.has(project.id)
}

function categoryEmoji(cat) {
 return { 饮食: '🍚', 运动: '🏃', 学习: '📚', 生活: '🧹', 评价: '⭐' }[cat] || '📌'
}

function onTap(project, event) {
 const button = event?.currentTarget
 if (project.pointRange && project.pointRange[1] > project.pointRange[0]) {
 picker.project = project
 picker.button = button
 picker.options = []
 for (let n = project.pointRange[0]; n <= project.pointRange[1]; n++) {
 picker.options.push(n)
 }
 picker.open = true
 return
 }
 addNow(project, project.points, button)
}

async function pickAndAdd(n) {
 const project = picker.project
 const button = picker.button
 picker.open = false
 await addNow(project, n, button)
}

async function addNow(project, points, buttonEl) {
 const entry = { ...project, _pickedPoints: points }
 await store.addCheckin(entry)
 playCoin()
 flash(`已打卡: ${project.name} +${points}`)
 if (buttonEl) {
 const rect = buttonEl.getBoundingClientRect()
 coinBurst.value = {
 x: rect.left + rect.width /2,
 y: rect.top + rect.height /2
 }
 }
}

onMounted(async () => {
 await store.load()
})
</script>
