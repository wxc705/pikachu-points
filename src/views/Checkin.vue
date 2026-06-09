<template>
  <div class="space-y-4">
    <header class="rounded-2xl bg-surface shadow-sm p-4 flex items-center justify-between card-lift">
      <div>
        <p class="text-xs text-ink-soft">今日获得</p>
        <p class="text-3xl font-bold text-secondary">+{{ store.todayEarned }}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-ink-soft">总积分</p>
        <p class="text-2xl font-semibold">{{ store.totalPoints }}</p>
      </div>
    </header>

    <!-- Toast -->
    <Transition name="page">
      <div v-if="toast" class="rounded-xl bg-secondary/10 text-secondary px-4 py-2.5 text-sm font-medium text-center">
        {{ toast }}
      </div>
    </Transition>

    <!-- 今日推荐 -->
    <section v-if="store.todayRecommended.length" class="rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-200/70 shadow-sm p-4 animate-fade-in-up">
      <h2 class="text-sm font-bold mb-2.5 flex items-center gap-1">
        <span>🌟 今日推荐</span>
        <span class="text-xs text-ink-soft font-normal">（家长端配置）</span>
      </h2>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="p in store.todayRecommended"
          :key="'rec-'+p.id"
          @click="onTap(p, $event)"
          :disabled="isChecked(p)"
          :class="[
            'rounded-xl p-3 text-left text-sm font-medium shadow-sm transition-all duration-200 btn-press',
            isChecked(p)
              ? 'bg-surface text-ink-soft opacity-60'
              : 'bg-surface hover:shadow-md text-ink'
          ]"
        >
          <span class="block text-xl">{{ categoryEmoji(p.category) }}</span>
          <span class="block" :class="isChecked(p) ? 'line-through' : ''">{{ p.name }}</span>
          <span class="block text-xs text-ink-soft mt-0.5">
            {{ p.pointRange ? `${p.pointRange[0]}-${p.pointRange[1]}` : `+${p.points || 0}` }}
          </span>
        </button>
      </div>
    </section>

    <!-- 无计划引导 -->
    <section v-else class="rounded-2xl bg-surface shadow-sm p-4 text-center">
      <p class="text-sm text-ink-soft mb-2">🌟 本周还没有配置学习计划</p>
      <router-link
        to="/weekly-plan"
        class="inline-block px-5 py-2 rounded-full bg-primary text-ink text-sm font-medium hover:bg-primary-soft transition-colors"
      >
        📅 去配置本周计划
      </router-link>
    </section>

    <!-- 分类打卡区 -->
    <div v-for="group in groupedProjects" :key="group.category" class="animate-fade-in-up">
      <h2
        class="text-sm font-bold mb-2.5 px-3 py-1.5 rounded-full inline-block"
        :style="{ background: catBg(group.category), color: 'var(--color-ink)' }"
      >
        {{ categoryEmoji(group.category) }} {{ group.category }}
      </h2>
      <div class="grid grid-cols-2 gap-2.5 mt-2">
        <button
          v-for="p in group.items"
          :key="p.id"
          @click="onTap(p, $event)"
          :disabled="isChecked(p)"
          :class="[
            'rounded-2xl shadow-sm transition-all duration-200 p-4 text-left btn-press',
            isChecked(p)
              ? 'bg-primary-soft/80 text-ink-soft cursor-not-allowed'
              : 'bg-surface hover:shadow-md'
          ]"
        >
          <div class="font-medium flex items-center gap-1.5">
            <span v-if="isChecked(p)" class="check-pop inline-block">✅</span>
            <span :class="isChecked(p) ? 'line-through' : ''">{{ p.name }}</span>
            <span v-if="isChecked(p) && (store.todayProjectCounts.get(p.id) || 0) > 1" class="text-xs text-ink-soft ml-auto">
              ×{{ store.todayProjectCounts.get(p.id) }}
            </span>
          </div>
          <div class="text-xs mt-1.5 text-ink-soft">
            <span v-if="p.pointRange">+{{ p.pointRange[0] }}~{{ p.pointRange[1] }} 分</span>
            <span v-else>+{{ p.points }} 分</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Range 选择器 -->
    <Teleport to="body">
      <Transition name="page">
        <div
          v-if="picker.open"
          class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
          @click.self="picker.open = false"
        >
          <div class="bg-surface w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 space-y-4 shadow-2xl">
            <h3 class="font-bold text-lg">{{ picker.project?.name }}</h3>
            <p class="text-sm text-ink-soft">选择本次奖励的积分</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="n in picker.options"
                :key="n"
                @click="pickAndAdd(n)"
                class="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-soft font-bold text-lg transition-colors btn-press"
              >
                +{{ n }}
              </button>
            </div>
            <button @click="picker.open = false" class="w-full text-sm text-ink-soft py-2 hover:text-ink transition-colors">
              取消
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

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
import { categoryEmoji } from '../utils/emoji.js'
import CoinBurst from '../components/CoinBurst.vue'

const store = usePointsStore()
const toast = ref('')
const picker = reactive({ open: false, project: null, options: [], button: null })
const coinBurst = ref(null)

const projects = computed(() => store.projects.filter((p) => p.isActive !== false))

const CAT_BG = {
  饮食: 'var(--cat-eating)',
  运动: 'var(--cat-sport)',
  学习: 'var(--cat-study)',
  生活: 'var(--cat-life)',
  评价: 'var(--cat-review)'
}
function catBg(cat) {
  return CAT_BG[cat] || 'var(--color-primary-soft)'
}

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
      const items = map.get(cat).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      groups.push({ category: cat, items })
      map.delete(cat)
    }
  }
  for (const [cat, items] of map) {
    groups.push({ category: cat, items: items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) })
  }
  return groups
})

function flash(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1800)
}

function isChecked(project) {
  return store.todayCheckedProjectIds.has(project.id)
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
  flash(`✅ ${project.name} +${points}`)
  if (buttonEl) {
    const rect = buttonEl.getBoundingClientRect()
    coinBurst.value = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  }
}

onMounted(async () => {
  await store.load()
})
</script>
