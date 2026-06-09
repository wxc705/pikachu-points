<template>
  <div class="space-y-4 animate-fade-in-up">
    <header
      class="rounded-2xl shadow-sm card-lift p-4 grid grid-cols-3 text-center"
      style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent))"
    >
      <div>
        <p class="text-xs text-ink-soft">总获得</p>
        <p class="text-lg font-bold text-secondary">+{{ store.totalEarned }}</p>
      </div>
      <div>
        <p class="text-xs text-ink-soft">总兑换</p>
        <p class="text-lg font-bold text-secondary">-{{ store.totalSpent }}</p>
      </div>
      <div>
        <p class="text-xs text-ink-soft">结余</p>
        <p class="text-lg font-bold">{{ store.totalPoints }}</p>
      </div>
    </header>

    <div v-if="!store.checkins.length && !store.requests.length" class="text-center text-ink-soft py-12">
      还没有记录
    </div>

    <section v-for="day in grouped" :key="day.date" class="rounded-2xl bg-surface shadow-sm card-lift p-4">
      <h3 class="text-sm font-bold text-ink-soft mb-2">{{ day.date }}</h3>
      <ul class="space-y-2">
        <li
          v-for="item in day.items"
          :key="item._k"
          class="bg-white rounded-xl p-3 flex items-center justify-between gap-3"
        >
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ item.title }}</p>
            <p class="text-xs text-ink-soft">{{ item.sub }}</p>
          </div>
          <p
            class="font-semibold text-sm whitespace-nowrap"
            :class="item.tone"
          >
            {{ item.delta }}
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { usePointsStore } from '../stores/points.js'

const store = usePointsStore()

const CAT_EMOJI = {
  饮食: '🍚',
  运动: '🏃',
  学习: '📚',
  生活: '🧹',
  评价: '⭐',
  拨付: '💰'
}

function formatCategory(c) {
  if (!c) return ''
  return `${CAT_EMOJI[c] || ''} ${c}`
}

const merged = computed(() => {
  const items = []
  for (const c of store.checkins) {
    items.push({
      _k: `c-${c.id}`,
      date: c.date,
      ts: c.createdAt || 0,
      title: c.projectName || '打卡',
      sub: formatCategory(c.category),
      delta: (c.pointsEarned >= 0 ? '+' : '') + (c.pointsEarned || 0),
      tone: c.pointsEarned >= 0 ? 'text-secondary' : 'text-secondary'
    })
  }
  for (const r of store.requests) {
    if (r.status !== 'approved') continue
    items.push({
      _k: `r-${r.id}`,
      date: r.date,
      ts: r.createdAt || 0,
      title: `兑换: ${r.reward}`,
      sub: r.note || '',
      delta: `-${r.pointsCost || 0}`,
      tone: 'text-secondary'
    })
  }
  return items
})

const grouped = computed(() => {
  const map = new Map()
  for (const it of merged.value) {
    if (!map.has(it.date)) map.set(it.date, [])
    map.get(it.date).push(it)
  }
  const days = []
  for (const [date, items] of map) {
    items.sort((a, b) => b.ts - a.ts)
    days.push({ date, items })
  }
  days.sort((a, b) => (a.date < b.date ? 1 : -1))
  return days
})

onMounted(() => {
  store.load()
})
</script>
