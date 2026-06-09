<template>
 <div class="space-y-4">
 <header class="rounded-2xl bg-surface shadow p-4">
 <h1 class="text-lg font-bold">⚙️ 设置</h1>
 <p class="text-sm text-ink-soft mt-1">个性化你的皮卡丘积分</p>
 </header>

 <section class="rounded-2xl bg-surface shadow p-4 space-y-3">
 <h2 class="font-semibold">🎨 主题</h2>
 <p class="text-xs text-ink-soft">点击切换主题，立刻生效</p>
 <div class="grid grid-cols-1 gap-3">
 <button
 v-for="t in themes"
 :key="t.id"
 @click="select(t)"
 :disabled="t.disabled"
 :class="[
 'rounded-2xl p-4 text-left transition border-2',
 currentId === t.id ? 'border-secondary ring-2 ring-secondary' : 'border-transparent',
 t.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-soft cursor-pointer'
]"
 :style="{ background: 'var(--color-surface)' }"
 >
 <div class="flex items-center gap-3">
 <div
 class="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow"
 :style="{ background: t.colors.primary }"
 >
 {{ t.emoji }}
 </div>
 <div class="flex-1">
 <p class="font-semibold">{{ t.name }}
 <span v-if="currentId === t.id" class="text-xs text-secondary ml-2">✓ 当前</span>
 </p>
 <p class="text-xs text-ink-soft mt-1">{{ t.description }}</p>
 </div>
 <div v-if="t.disabled" class="text-xs text-ink-soft bg-primary-soft px-2 py-1 rounded">
 即将推出
 </div>
 </div>
 <div class="flex gap-1 mt-3">
 <div class="w-6 h-6 rounded" :style="{ background: t.colors.primary }" title="主色"></div>
 <div class="w-6 h-6 rounded" :style="{ background: t.colors.secondary }" title="次色"></div>
 <div class="w-6 h-6 rounded" :style="{ background: t.colors.accent }" title="强调色"></div>
 <div class="w-6 h-6 rounded border border-ink-soft" :style="{ background: t.colors.bg }" title="背景"></div>
 </div>
 </button>
 </div>
 </section>

 <section class="rounded-2xl bg-surface shadow p-4 space-y-2">
 <h2 class="font-semibold">📦 数据</h2>
 <div class="flex justify-between text-sm">
 <span class="text-ink-soft">打卡记录</span>
 <span>{{ store.checkins.length }} 条</span>
 </div>
 <div class="flex justify-between text-sm">
 <span class="text-ink-soft">兑换申请</span>
 <span>{{ store.requests.length }} 条</span>
 </div>
 <div class="flex justify-between text-sm">
 <span class="text-ink-soft">当前主题</span>
 <span>{{ currentTheme?.name || '-' }}</span>
 </div>
 </section>

 <button
 v-if="copyToast"
 class="w-full rounded-2xl bg-primary-soft text-ink font-semibold py-2"
 >
 {{ copyToast }}
 </button>
 </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { THEMES, getTheme } from '../themes/index.js'

const store = usePointsStore()
const themes = THEMES
const copyToast = ref('')

const currentId = computed(() => store.currentThemeId)
const currentTheme = computed(() => getTheme(currentId.value))

function select(t) {
 if (t.disabled) return
 store.setTheme(t.id)
 copyToast.value = `已切换到 ${t.name} 主题`
 setTimeout(() => (copyToast.value = ''), 2000)
}
</script>
