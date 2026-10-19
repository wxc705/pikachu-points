<template>
  <div class="space-y-4 animate-fade-in-up">
    <header
      class="rounded-2xl shadow-sm p-4"
      style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent))"
    >
      <h1 class="text-lg font-bold">⚙️ 设置</h1>
      <p class="text-sm text-ink-soft mt-1">个性化你的皮卡丘积分</p>
    </header>

    <section class="rounded-2xl bg-surface shadow-sm card-lift p-4 space-y-3">
      <h2 class="font-bold text-sm">🎨 主题</h2>
      <p class="text-xs text-ink-soft">点击切换主题，立刻生效</p>
      <div class="grid grid-cols-1 gap-3">
        <button
          v-for="t in themes"
          :key="t.id"
          @click="select(t)"
          :disabled="t.disabled"
          :class="[
            'rounded-xl p-4 text-left transition border-2 btn-press',
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

    <section class="rounded-2xl bg-surface shadow-sm card-lift p-4 space-y-2">
      <h2 class="font-bold text-sm">📦 数据</h2>
      <ul class="space-y-2">
        <li class="bg-white rounded-xl p-3 flex justify-between text-sm">
          <span class="text-ink-soft">打卡记录</span>
          <span>{{ store.checkins.length }} 条</span>
        </li>
        <li class="bg-white rounded-xl p-3 flex justify-between text-sm">
          <span class="text-ink-soft">兑换申请</span>
          <span>{{ store.requests.length }} 条</span>
        </li>
        <li class="bg-white rounded-xl p-3 flex justify-between text-sm">
          <span class="text-ink-soft">当前主题</span>
          <span>{{ currentTheme?.name || '-' }}</span>
        </li>
      </ul>
    </section>

    <!-- t019 云同步密钥：运行时读 localStorage `pk_gh_token`，token 永不进构建产物
         （烤进公开仓 dist 的密钥会被 GitHub secret scanning 数十秒内自动吊销 → 线上恒 401） -->
    <section v-if="engineGithub" class="rounded-2xl bg-surface shadow-sm card-lift p-4 space-y-3">
      <h2 class="font-bold text-sm">🔐 云同步密钥</h2>
      <p class="text-xs text-ink-soft">粘贴 GitHub 访问密钥，只保存在本机浏览器（不进安装包、不上传）</p>
      <div class="flex gap-2">
        <input
          id="gh-token-input"
          v-model="ghTokenInput"
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder="粘贴密钥后点保存"
          class="flex-1 min-w-0 rounded-xl border border-ink-soft/20 bg-white px-3 py-2.5 text-sm"
        />
        <button data-testid="gh-token-save" @click="saveGhToken" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold btn-press">保存</button>
      </div>
      <div class="flex items-center justify-between text-xs">
        <span class="text-ink-soft">
          <template v-if="ghTokenLen">已保存：<code>••••••••</code>（长度 {{ ghTokenLen }}）</template>
          <template v-else>未保存 —— 未录入时点同步会提示先来这里</template>
        </span>
        <button v-if="ghTokenLen" @click="clearGhToken" class="text-red-500 font-semibold">清除</button>
      </div>
    </section>

    <button
      v-if="copyToast"
      class="w-full rounded-xl bg-primary-soft text-ink font-semibold py-2.5 btn-press shadow-sm"
    >
      {{ copyToast }}
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { THEMES, getTheme } from '../themes/index.js'
import { SYNC_ENGINE, getGithubToken, setGithubToken, clearGithubToken } from '../services/githubSync.js'

const store = usePointsStore()
const themes = THEMES
const copyToast = ref('')

const currentId = computed(() => store.currentThemeId)
const currentTheme = computed(() => getTheme(currentId.value))

function toast(msg) {
  copyToast.value = msg
  setTimeout(() => (copyToast.value = ''), 2500)
}

function select(t) {
  if (t.disabled) return
  store.setTheme(t.id)
  copyToast.value = `已切换到 ${t.name} 主题`
  setTimeout(() => (copyToast.value = ''), 2000)
}

// ---- t019 云同步密钥（GitHub 引擎专属）----
// token 运行时存 localStorage `pk_gh_token`，githubSync 每次请求现读 → 保存后立即可用、无需刷新。
// 绝不写进构建产物：公开仓里的密钥会被 GitHub secret scanning 自动吊销。
const engineGithub = SYNC_ENGINE === 'github'
const ghTokenInput = ref('')
const ghTokenLen = ref(engineGithub ? (getGithubToken() || '').length : 0)

function saveGhToken() {
  const v = (ghTokenInput.value || '').trim()
  if (!v) {
    toast('⚠️ 密钥为空，未保存')
    return
  }
  setGithubToken(v) // 输入框 type=password + 只回显长度，明文不留痕
  ghTokenLen.value = v.length
  ghTokenInput.value = ''
  toast('✅ 云同步密钥已保存（仅本机浏览器），现在可以直接同步')
}

function clearGhToken() {
  clearGithubToken()
  ghTokenLen.value = 0
  toast('🧹 云同步密钥已清除')
}
</script>
