<template>
  <Teleport to="body">
    <Transition name="mc-pop">
      <div v-if="show" class="mc-effect-overlay" @click="done">
        <!-- XP瓶飞出 -->
        <div class="mc-xp-bottle">
          <img src="/mc/xp-bottle.png" class="mc-xp-img" />
          <span class="mc-xp-text">+{{ points }} XP</span>
        </div>
        <!-- 钻石闪烁（高分奖励） -->
        <div v-if="points >= 2" class="mc-diamond">
          <img src="/mc/diamond.png" class="mc-diamond-img" />
        </div>
        <!-- 粒子效果 -->
        <div class="mc-particles">
          <span v-for="i in 8" :key="i" class="mc-particle" :style="particleStyle(i)">✦</span>
        </div>
        <!-- 完成文字 -->
        <div class="mc-done-text">{{ message }}</div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  points: { type: Number, default: 1 },
  message: { type: String, default: '任务完成！' }
})

const emit = defineEmits(['done'])

function done() {
  emit('done')
}

function particleStyle(i) {
  const angle = (i / 8) * 360
  const delay = (i * 0.05).toFixed(2)
  const distance = 60 + Math.random() * 40
  return {
    '--angle': `${angle}deg`,
    '--delay': `${delay}s`,
    '--distance': `${distance}px`
  }
}

// 自动消失
let timer = null
watch(() => props.show, (v) => {
  if (timer) clearTimeout(timer)
  if (v) {
    timer = setTimeout(() => emit('done'), 1800)
  }
})
</script>

<style scoped>
.mc-effect-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

/* XP瓶 */
.mc-xp-bottle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: mc-fly-up 0.6s ease-out;
}
.mc-xp-img {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 12px rgba(93, 140, 46, 0.8));
}
.mc-xp-text {
  font-size: 28px;
  font-weight: 900;
  color: #5decf5;
  text-shadow: 2px 2px 0 #1a1a1a, -1px -1px 0 #1a1a1a;
  font-family: monospace;
}

/* 钻石 */
.mc-diamond {
  position: absolute;
  top: 30%;
  right: 25%;
  animation: mc-sparkle 0.8s ease-in-out infinite alternate;
}
.mc-diamond-img {
  width: 48px;
  height: 48px;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 8px rgba(93, 236, 245, 0.8));
}

/* 粒子 */
.mc-particles {
  position: absolute;
  top: 50%;
  left: 50%;
}
.mc-particle {
  position: absolute;
  font-size: 16px;
  color: #fbbf24;
  animation: mc-particle-burst 0.8s ease-out var(--delay) both;
  text-shadow: 1px 1px 0 #1a1a1a;
}

/* 完成文字 */
.mc-done-text {
  margin-top: 20px;
  font-size: 22px;
  font-weight: 800;
  color: #5d8c2e;
  text-shadow: 2px 2px 0 #f4f1de;
  font-family: monospace;
  animation: mc-fade-in 0.4s ease-out 0.3s both;
}

/* 动画 */
@keyframes mc-fly-up {
  0% { transform: translateY(40px) scale(0.5); opacity: 0; }
  60% { transform: translateY(-10px) scale(1.1); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes mc-sparkle {
  0% { transform: scale(1) rotate(0deg); }
  100% { transform: scale(1.2) rotate(15deg); }
}
@keyframes mc-particle-burst {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% {
    transform: translate(
      calc(cos(var(--angle)) * var(--distance)),
      calc(sin(var(--angle)) * var(--distance))
    ) scale(0);
    opacity: 0;
  }
}
@keyframes mc-fade-in {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* 出入场 */
.mc-pop-enter-active { animation: mc-overlay-in 0.3s ease-out; }
.mc-pop-leave-active { animation: mc-overlay-out 0.3s ease-in; }
@keyframes mc-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes mc-overlay-out { from { opacity: 1; } to { opacity: 0; } }
</style>
