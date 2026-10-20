<template>
  <Teleport to="body">
    <Transition name="ki-fade">
      <div
        v-if="visible"
        class="ki-overlay"
        data-testid="kid-intro"
        :data-char="char.key"
        :data-media="mode"
        aria-hidden="true"
      >
        <div class="ki-media" :class="'is-' + mode">
          <img
            v-if="mode === 'morph' && mediaReady"
            class="ki-gif"
            :src="src"
            alt=""
            draggable="false"
          />
          <div
            v-else-if="mode === 'wall' && mediaReady"
            class="ki-wall"
            :style="{ backgroundImage: `url(${src})` }"
          ></div>
          <div v-else class="ki-css-fallback">⚡</div>
        </div>
        <div class="ki-caption">{{ char.name }} 登场！</div>
        <button class="ki-skip" type="button" data-testid="kid-intro-skip" @click.stop="finish">
          跳过
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
// C1：儿童端一次性入场动画（/kid 与 /kid/today 共用）
// - 每次会话最多 1 次（sessionStorage），不重复骚扰
// - 从 6 个既有角色里随机挑 1 个，只用该角色的 morph.gif 或 wall
// - new Image() 只预载选中的那一个；失败/超时静默降级为纯 CSS 淡入
// - 覆盖层 pointer-events:none，不挡操作；右下角「跳过」可点；1s 后自动消失
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ULTRA_CHARS } from '../services/ultraSeq.js'

const SESSION_KEY = 'pikachu-points:intro-played'
const visible = ref(false)
const mediaReady = ref(false)
const mode = ref('wall') // 'morph' | 'wall'
const char = ref(ULTRA_CHARS[0])
const src = ref('')
let _timer = null

function finish() {
  visible.value = false
  if (_timer) {
    clearTimeout(_timer)
    _timer = null
  }
}

onMounted(() => {
  // 同一次会话已经播过 → 静默跳过
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch (_) {
    // sessionStorage 不可用（隐私模式）时仍播放，但只影响本页
  }

  char.value = ULTRA_CHARS[Math.floor(Math.random() * ULTRA_CHARS.length)] || ULTRA_CHARS[0]
  mode.value = Math.random() < 0.5 ? 'morph' : 'wall'
  const file = mode.value === 'morph' ? 'morph.gif' : (char.value.wall || 'wall.jpg')
  src.value = `./ultraman/seq/${char.value.key}/${file}`
  visible.value = true

  // 关键：只预载当前随机选中的素材，绝不批量加载 6 个 morph.gif
  try {
    const img = new Image()
    img.onload = () => {
      if (visible.value) mediaReady.value = true
    }
    img.onerror = () => {
      mediaReady.value = false // 静默降级为 CSS 淡入
    }
    img.src = src.value
    if (img.complete && img.naturalWidth > 0) mediaReady.value = true
  } catch (_) {
    mediaReady.value = false
  }

  // 入场总时长 1s（≤1.2s），不管素材有没有加载完都会自动让开
  _timer = setTimeout(finish, 1000)
})

onBeforeUnmount(() => {
  if (_timer) {
    clearTimeout(_timer)
    _timer = null
  }
})
</script>

<style>
/* 全局样式：Teleport 到 body 后 scoped 选择器不生效，统一 ki- 前缀隔离 */
.ki-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  pointer-events: none; /* 不挡任何操作 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: radial-gradient(ellipse at 50% 42%, rgba(79, 70, 229, 0.55), rgba(15, 15, 35, 0.82) 70%);
  animation: ki-in 260ms ease-out both;
}
.ki-media {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ki-zoom 900ms cubic-bezier(0.22, 1.4, 0.36, 1) both;
}
.ki-wall {
  width: min(84vw, 880px);
  height: min(66vh, 560px);
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  border-radius: 32px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45), 0 0 0 4px rgba(255, 255, 255, 0.14);
  opacity: 0.92;
}
.ki-gif {
  display: block;
  max-width: min(78vw, 760px);
  max-height: 66vh;
  border-radius: 28px;
  background: #0a0a1a;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
}
.ki-css-fallback {
  font-size: 128px;
  line-height: 1;
  filter: drop-shadow(0 8px 32px rgba(251, 191, 36, 0.7));
  animation: ki-pulse 700ms ease-in-out infinite alternate;
}
.ki-caption {
  font-family: 'DM Sans', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 32px;
  font-weight: 900;
  color: #fff;
  letter-spacing: 2px;
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
}
.ki-skip {
  position: absolute;
  right: 24px;
  bottom: 24px;
  min-width: 96px;
  min-height: 56px;
  padding: 10px 26px;
  border-radius: 18px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-family: inherit;
  font-size: 26px;
  font-weight: 800;
  cursor: pointer;
  pointer-events: auto; /* 只有「跳过」可点，其余区域透传 */
  backdrop-filter: blur(8px);
}
.ki-skip:active {
  transform: scale(0.94);
  background: rgba(255, 255, 255, 0.3);
}
.ki-fade-leave-active {
  animation: ki-out 180ms ease-in both;
}
@keyframes ki-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes ki-out {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes ki-zoom {
  0% { opacity: 0; transform: scale(0.82); }
  100% { opacity: 1; transform: scale(1.03); }
}
@keyframes ki-pulse {
  0% { transform: scale(0.94); opacity: 0.75; }
  100% { transform: scale(1.06); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ki-media { animation: none; }
  .ki-css-fallback { animation: none; }
}
</style>
