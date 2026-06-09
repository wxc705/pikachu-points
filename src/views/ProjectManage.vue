<template>
 <div class="space-y-4 animate-fade-in-up">
    <header class="rounded-2xl text-white shadow p-4 flex items-center justify-between" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent))">
 <div>
 <h1 class="text-lg font-bold">📝 项目管理</h1>
 <p class="text-xs mt-1 opacity-90">共 {{ store.projects.length }} 个项目</p>
 </div>
 <div class="flex gap-2">
 <button
 @click="filterActive = !filterActive"
 :class="['px-3 py-1 rounded-full text-xs font-medium btn-press', filterActive ? 'bg-secondary text-white' : 'bg-primary-soft text-ink']"
 >
 {{ filterActive ? '全部' : '仅启用' }}
 </button>
 <button
 @click="openCreate()"
 class="px-3 py-1 rounded-full bg-secondary text-white text-sm font-semibold btn-press"
 >
 ＋ 新增
 </button>
 </div>
 </header>

 <div
 v-for="cat in categories"
 :key="cat"
 class="rounded-2xl bg-surface shadow-sm p-4 card-lift"
 >
 <h2 class="text-sm font-bold text-ink-soft mb-2">
 {{ CAT_META[cat]?.emoji }} {{ cat }}
 <span class="text-xs text-ink-soft font-normal">({{ visibleProjects(cat).length }})</span>
 </h2>
 <ul v-if="visibleProjects(cat).length" class="divide-y">
 <li
 v-for="p in visibleProjects(cat)"
 :key="p.id"
 class="py-2 flex items-center gap-2 bg-white rounded-xl p-3 mb-1"
 :class="{ 'opacity-50': !p.isActive }"
 >
 <div class="flex-1 min-w-0">
 <p class="font-medium text-sm truncate" :class="{ 'line-through': !p.isActive }">
 {{ p.name }}
 </p>
 <p class="text-xs text-ink-soft">
 <span v-if="p.pointRange">+{{ p.pointRange[0] }}~{{ p.pointRange[1] }} 分</span>
 <span v-else>+{{ p.points }} 分</span>
 <span v-if="!p.isActive" class="text-secondary"> · 已停用</span>
 </p>
 </div>
 <button
 @click="moveSort(p, -1)"
 :disabled="!p.isActive"
 class="w-7 h-7 rounded-full bg-primary-soft text-ink-soft text-xs disabled:opacity-30 btn-press"
 title="上移"
 >
 ↑
 </button>
 <button
 @click="moveSort(p, 1)"
 :disabled="!p.isActive"
 class="w-7 h-7 rounded-full bg-primary-soft text-ink-soft text-xs disabled:opacity-30 btn-press"
 title="下移"
 >
 ↓
 </button>
 <button
 @click="openEdit(p)"
 class="w-7 h-7 rounded-full bg-primary-soft text-secondary text-xs btn-press"
 title="编辑"
 >
 ✎
 </button>
 <button
 @click="onToggle(p)"
 :class="['w-7 h-7 rounded-full text-xs btn-press', p.isActive ? 'bg-primary-soft text-ink-soft' : 'bg-secondary text-white']"
 :title="p.isActive ? '停用' : '启用'"
 >
 {{ p.isActive ? '⏸' : '▶' }}
 </button>
 <button
 @click="onDelete(p)"
 class="w-7 h-7 rounded-full bg-primary-soft text-secondary text-xs btn-press"
 title="删除"
 >
 ✕
 </button>
 </li>
 </ul>
 <p v-else class="text-xs text-ink-soft py-2">暂无项目</p>
 </div>

 <!-- 编辑/新增弹窗 -->
 <div
 v-if="modal.open"
 class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
 @click.self="closeModal"
 >
 <div class="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
 <h3 class="font-semibold text-lg">
 {{ modal.editing ? '编辑项目' : '新增项目' }}
 </h3>

 <div>
 <label class="text-sm text-ink-soft block mb-1">分类</label>
 <div class="grid grid-cols-3 gap-2">
 <button
 v-for="cat in categories"
 :key="cat"
 @click="modal.form.category = cat"
 :class="['py-2 rounded-xl text-sm btn-press', modal.form.category === cat ? 'bg-secondary text-white font-semibold' : 'bg-primary-soft text-ink']"
 >
 {{ CAT_META[cat]?.emoji }} {{ cat }}
 </button>
 </div>
 </div>

 <div>
 <label class="text-sm text-ink-soft block mb-1">项目名称</label>
 <input
 v-model="modal.form.name"
 placeholder="例如：中饭准时"
 class="w-full bg-primary-soft/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>

 <div>
 <label class="text-sm text-ink-soft block mb-1">分值类型</label>
 <div class="flex gap-2">
 <button
 @click="modal.form.mode = 'fixed'"
 :class="['flex-1 py-2 rounded-xl text-sm btn-press', modal.form.mode === 'fixed' ? 'bg-secondary text-white font-semibold' : 'bg-primary-soft text-ink']"
 >
 固定分
 </button>
 <button
 @click="modal.form.mode = 'range'"
 :class="['flex-1 py-2 rounded-xl text-sm btn-press', modal.form.mode === 'range' ? 'bg-secondary text-white font-semibold' : 'bg-primary-soft text-ink']"
 >
 范围分（家长选）
 </button>
 </div>
 </div>

 <div v-if="modal.form.mode === 'fixed'">
 <label class="text-sm text-ink-soft block mb-1">分数</label>
 <input
 v-model.number="modal.form.points"
 type="number"
 min="0"
 max="10"
 class="w-full bg-primary-soft/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>
 <div v-else class="grid grid-cols-2 gap-2">
 <div>
 <label class="text-xs text-ink-soft block mb-1">最小</label>
 <input
 v-model.number="modal.form.rangeMin"
 type="number"
 min="0"
 max="10"
 class="w-full bg-primary-soft/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>
 <div>
 <label class="text-xs text-ink-soft block mb-1">最大</label>
 <input
 v-model.number="modal.form.rangeMax"
 type="number"
 min="0"
 max="10"
 class="w-full bg-primary-soft/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>
 </div>

 <div>
 <label class="text-sm text-ink-soft block mb-1">排序（数字越小越靠前）</label>
 <input
 v-model.number="modal.form.sortOrder"
 type="number"
 class="w-full bg-primary-soft/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>

 <p v-if="modal.error" class="text-sm text-secondary">{{ modal.error }}</p>

 <div class="flex gap-2">
 <button
 @click="closeModal"
 class="flex-1 py-2.5 rounded-xl bg-primary-soft text-ink font-semibold btn-press"
 >
 取消
 </button>
 <button
 @click="onSave"
 :disabled="modal.saving"
 class="flex-1 py-2.5 rounded-xl bg-secondary text-white font-semibold disabled:opacity-50 btn-press"
 >
 {{ modal.saving ? '保存中…' : (modal.editing ? '保存' : '创建') }}
 </button>
 </div>
 </div>
 </div>

 <div
 v-if="deleteConfirm.open"
 class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
 @click.self="deleteConfirm.open = false"
 >
 <div class="bg-surface rounded-2xl p-5 max-w-sm mx-4 space-y-3">
 <h3 class="font-semibold">确认删除</h3>
 <p class="text-sm text-ink-soft">
 确认删除「{{ deleteConfirm.project?.name }}」？此操作会**永久删除项目**（已打卡记录保留）。
 </p>
 <div class="flex gap-2">
 <button
 @click="deleteConfirm.open = false"
 class="flex-1 py-2 rounded-xl bg-primary-soft text-ink font-medium btn-press"
 >
 取消
 </button>
 <button
 @click="confirmDelete"
 class="flex-1 py-2 rounded-xl bg-secondary text-white font-medium btn-press"
 >
 删除
 </button>
 </div>
 </div>
 </div>
 </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'

const store = usePointsStore()
const filterActive = ref(false)

const CAT_META = {
 饮食: { emoji: '🍚' },
 运动: { emoji: '🏃' },
 学习: { emoji: '📚' },
 生活: { emoji: '🧹' },
 评价: { emoji: '⭐' }
}

const categories = ['饮食', '运动', '学习', '生活', '评价']

function visibleProjects(cat) {
 const all = store.projectsByCategory.get(cat) || []
 if (filterActive.value) return all.filter((p) => p.isActive !== false)
 return all
}

const modal = reactive({
 open: false,
 editing: null,
 saving: false,
 error: '',
 form: {
 category: '饮食',
 name: '',
 mode: 'fixed',
 points: 1,
 rangeMin: 1,
 rangeMax: 3,
 sortOrder: 100
 }
})

function resetForm() {
 modal.editing = null
 modal.error = ''
 modal.form = {
 category: '饮食',
 name: '',
 mode: 'fixed',
 points: 1,
 rangeMin: 1,
 rangeMax: 3,
 sortOrder: 100
 }
}

function openCreate() {
 resetForm()
 modal.open = true
}

function openEdit(p) {
 modal.editing = p
 modal.error = ''
 modal.form = {
 category: p.category,
 name: p.name,
 mode: p.pointRange ? 'range' : 'fixed',
 points: p.points || 1,
 rangeMin: p.pointRange ? p.pointRange[0] : 1,
 rangeMax: p.pointRange ? p.pointRange[1] : 3,
 sortOrder: p.sortOrder || 100
 }
 modal.open = true
}

function closeModal() {
 modal.open = false
}

async function onSave() {
 modal.error = ''
 if (!modal.form.name.trim()) {
 modal.error = '请输入项目名称'
 return
 }
 if (modal.form.mode === 'fixed' && (modal.form.points < 0 || modal.form.points > 10)) {
 modal.error = '分值必须在 0-10 之间'
 return
 }
 if (modal.form.mode === 'range') {
 if (modal.form.rangeMin < 0 || modal.form.rangeMin > 10 || modal.form.rangeMax < 0 || modal.form.rangeMax > 10) {
 modal.error = '范围分值必须在 0-10 之间'
 return
 }
 if (modal.form.rangeMax < modal.form.rangeMin) {
 modal.error = '最大分不能小于最小分'
 return
 }
 }
 modal.saving = true
 try {
 const pointRange = modal.form.mode === 'range' ? [modal.form.rangeMin, modal.form.rangeMax] : null
 const points = modal.form.mode === 'fixed' ? modal.form.points : null
 if (modal.editing) {
 await store.updateProjectItem(modal.editing.id, {
 category: modal.form.category,
 name: modal.form.name,
 points,
 pointRange,
 sortOrder: modal.form.sortOrder
 })
 } else {
 await store.addProjectItem({
 category: modal.form.category,
 name: modal.form.name,
 points,
 pointRange,
 sortOrder: modal.form.sortOrder
 })
 }
 closeModal()
 } catch (e) {
 modal.error = '保存失败: ' + (e.message || e)
 } finally {
 modal.saving = false
 }
}

const deleteConfirm = reactive({ open: false, project: null })

function onDelete(p) {
 deleteConfirm.project = p
 deleteConfirm.open = true
}

async function confirmDelete() {
 const p = deleteConfirm.project
 deleteConfirm.open = false
 if (p) await store.deleteProjectItem(p.id)
}

async function onToggle(p) {
 await store.toggleProjectActive(p.id)
}

async function moveSort(p, dir) {
 // 找同 category 内相邻的 active 项目，交换 sortOrder
 const list = (store.projectsByCategory.get(p.category) || []).filter((x) => x.isActive !== false)
 const idx = list.findIndex((x) => x.id === p.id)
 const swapIdx = idx + dir
 if (swapIdx < 0 || swapIdx >= list.length) return
 const a = list[idx]
 const b = list[swapIdx]
 const aSort = a.sortOrder || 0
 const bSort = b.sortOrder || 0
 await store.updateProjectItem(a.id, { sortOrder: bSort })
 await store.updateProjectItem(b.id, { sortOrder: aSort })
}

onMounted(() => {
 store.load()
})
</script>
