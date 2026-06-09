<template>
  <div class="space-y-4 animate-fade-in-up">
    <header
      class="rounded-2xl shadow-sm p-4"
      style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent))"
    >
      <h2 class="text-lg font-bold">学习效果评分</h2>
      <p class="text-sm text-ink-soft mt-1">家长记录皮卡丘今天的学习状态</p>
    </header>

    <section class="rounded-2xl bg-surface shadow-sm card-lift p-5 space-y-4">
      <div>
        <p class="text-sm text-ink-soft mb-2">今日评分</p>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="opt in options"
            :key="opt.score"
            @click="rating = opt.score"
            :class="[
              'rounded-xl p-4 text-center transition btn-press',
              rating === opt.score
                ? 'bg-primary-soft ring-2 ring-primary'
                : 'bg-primary-soft hover:bg-primary'
            ]"
          >
            <div class="text-4xl">{{ opt.emoji }}</div>
            <div class="text-xs mt-1 text-ink">{{ opt.label }} ({{ opt.score }})</div>
          </button>
        </div>
      </div>

      <div>
        <label class="text-sm text-ink-soft block mb-1">备注（可选）</label>
        <textarea
          v-model="note"
          rows="3"
          placeholder="今天表现怎么样？有什么值得记录的？"
          class="w-full rounded-xl bg-primary-soft/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border-0 resize-none"
        ></textarea>
      </div>

      <button
        @click="submit"
        :disabled="!rating || submitting"
        class="w-full rounded-xl bg-primary hover:bg-primary-soft disabled:bg-primary-soft disabled:text-ink-soft text-ink font-semibold py-3 btn-press shadow-sm"
      >
        {{ submitting ? '提交中…' : '提交评分' }}
      </button>
    </section>

    <div
      v-if="toast"
      class="rounded-xl bg-primary-soft text-ink px-4 py-2 text-sm shadow-sm"
    >
      {{ toast }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { playLevelup } from '../services/sound.js'

const store = usePointsStore()
const rating = ref(null)
const note = ref('')
const submitting = ref(false)
const toast = ref('')

const options = [
  { score:1, emoji: '🙁', label: '不太好' },
  { score:2, emoji: '😐', label: '一般' },
  { score:3, emoji: '😊', label: '不错' }
]

function flash(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1500)
}

async function submit() {
  if (!rating.value || submitting.value) return
  submitting.value = true
  await store.addRatingCheckin(rating.value, note.value)
  playLevelup()
  submitting.value = false
  rating.value = null
  note.value = ''
  flash('评分已记录')
}

onMounted(() => {
  store.load()
})
</script>
