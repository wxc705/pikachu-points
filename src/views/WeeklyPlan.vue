<template>
 <div class="space-y-4 animate-fade-in-up">
    <header class="rounded-2xl text-white shadow p-4" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent))">
 <h1 class="text-lg font-bold">📅 每周学习计划</h1>
 <p class="text-xs mt-1 opacity-90">为每天配推荐项目，孩子在打卡页会看到"今日推荐"</p>
 </header>

 <!-- weekday tabs -->
 <div class="flex gap-1 overflow-x-auto pb-1">
 <button
 v-for="d in WEEKDAYS"
 :key="d.n"
 @click="activeWeekday = d.n"
 :class="[
  'px-3 py-2.5 rounded-full text-sm font-medium shrink-0 transition btn-press',
  activeWeekday === d.n
 ? 'bg-primary text-ink shadow'
 : 'bg-surface text-ink-soft hover:bg-primary-soft'
 ]"
 >
 {{ d.emoji }} {{ d.short }}
 </button>
 </div>

 <!-- 当前日 panel -->
 <section class="rounded-2xl bg-surface shadow-sm p-4 space-y-3 card-lift">
 <div class="flex items-center justify-between">
 <h2 class="font-bold">
 {{ currentWeekday.emoji }} {{ currentWeekday.long }}
 <span class="text-xs text-ink-soft ml-1">({{ recommendedProjects.length }} 项)</span>
 </h2>
 <button
 v-if="selectedIds.size > 0"
 @click="onClear"
 class="text-xs text-ink-soft hover:text-secondary underline"
 >
 清空
 </button>
 </div>

 <div v-if="store.projects.length === 0" class="text-sm text-ink-soft py-4 text-center">
 请先去"项目"页添加打卡项目
 </div>

 <div v-else class="space-y-1.5 max-h-96 overflow-y-auto">
 <label
 v-for="p in store.projects"
 :key="p.id"
 class="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-primary-soft bg-white"
 :class="selectedIds.has(p.id) ? 'bg-primary-soft' : ''"
 >
 <input
 type="checkbox"
 :checked="selectedIds.has(p.id)"
 @change="toggle(p.id)"
 :disabled="!p.isActive || p.isActive === false"
 class="w-4 h-4 accent-secondary"
 />
 <span class="text-base">{{ categoryEmoji(p.category) }}</span>
 <span class="text-sm flex-1">{{ p.name }}</span>
 <span class="text-xs text-ink-soft">
 {{ p.pointRange ? `${p.pointRange[0]}-${p.pointRange[1]}` : `+${p.points || 0}` }}
 </span>
 <span v-if="!p.isActive || p.isActive === false" class="text-xs text-ink-soft">(停用)</span>
 </label>
 </div>

 <div class="flex gap-2 pt-2">
 <button
 @click="onSave"
 :disabled="saving"
 class="flex-1 rounded-xl bg-primary hover:bg-primary-soft text-ink font-semibold py-2.5 text-sm disabled:opacity-50 btn-press"
 >
 {{ saving ? '保存中…' : '保存' }}
 </button>
 </div>
 <p v-if="msg" class="text-xs text-center text-secondary">{{ msg }}</p>
 </section>

 <!-- 一周概览 -->
 <section class="rounded-2xl bg-surface shadow-sm p-4 card-lift">
      <h3 class="font-bold text-sm mb-2">📋 本周已配置 ({{ configuredCount }}/7)</h3>
 <div class="grid grid-cols-7 gap-1">
 <div
 v-for="d in WEEKDAYS"
 :key="d.n"
 :class="[
  'text-center text-xs py-1 rounded',
  getPlan(d.n).length > 0 ? 'bg-primary text-ink font-bold' : 'bg-primary-soft text-ink-soft'
 ]"
 :title="getPlan(d.n).join('、')"
 >
 {{ d.short.replace('周', '') }}
 </div>
 </div>
 </section>
 </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { WEEKDAYS } from '../utils/weekday.js'
import { categoryEmoji } from '../utils/emoji.js'
import { playCoin } from '../services/sound.js'

const store = usePointsStore()
const activeWeekday = ref(new Date().getDay() === 0 ? 7 : new Date().getDay())
const selectedIds = ref(new Set())
const saving = ref(false)
const msg = ref('')

const currentWeekday = computed(() =>
 WEEKDAYS.find((d) => d.n === activeWeekday.value) || WEEKDAYS[0]
)

const recommendedProjects = computed(() => {
 return store.projects.filter((p) => selectedIds.value.has(p.id))
})

function getPlan(weekday) {
 const plan = store.weeklyPlans.find((w) => w.weekday === weekday)
 if (!plan) return []
 return plan.projectIds.map((id) => {
 const p = store.projects.find((x) => x.id === id)
 return p ? p.name : null
 }).filter(Boolean)
}

const configuredCount = computed(() =>
 store.weeklyPlans.filter((w) => w.projectIds && w.projectIds.length > 0).length
)

// 切到某日时，load 已有计划
function loadFor(weekday) {
 const plan = store.weeklyPlans.find((w) => w.weekday === weekday)
 selectedIds.value = new Set(plan ? plan.projectIds : [])
}

watch(activeWeekday, (n) => loadFor(n))

function toggle(id) {
 const next = new Set(selectedIds.value)
 if (next.has(id)) next.delete(id)
 else next.add(id)
 selectedIds.value = next
}

async function onSave() {
 saving.value = true
 msg.value = ''
 try {
 await store.setWeeklyPlanItem(activeWeekday.value, [...selectedIds.value])
 msg.value = `✅ 已保存 ${currentWeekday.value.long}（${selectedIds.value.size} 项）`
 playCoin()
 } catch (e) {
 msg.value = '❌ 保存失败'
 } finally {
 saving.value = false
 }
}

async function onClear() {
 saving.value = true
 msg.value = ''
 try {
 await store.clearWeeklyPlanItem(activeWeekday.value)
 selectedIds.value = new Set()
 msg.value = `✅ 已清空 ${currentWeekday.value.long}`
 playCoin()
 } catch (e) {
 msg.value = '❌ 清空失败'
 } finally {
 saving.value = false
 }
}

onMounted(async () => {
 await store.load()
 loadFor(activeWeekday.value)
})
</script>
