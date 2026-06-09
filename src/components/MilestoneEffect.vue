<template>
  <Teleport to="body">
    <div class="milestone-overlay" @click="onClick">
      <div class="milestone-bg" :style="bgStyle"></div>
      <div class="milestone-trophy-wrap">
        <div class="milestone-trophy">{{ trophyEmoji }}</div>
        <div class="milestone-medal">{{ medalEmoji }}</div>
      </div>
      <div class="milestone-title">🎉 恭喜达到 {{ threshold }} 分！</div>
      <div class="milestone-subtitle">{{ subtitle }}</div>
      <div class="milestone-confetti" aria-hidden="true">
        <span
          v-for="c in confetti"
          :key="c.id"
          class="confetti-piece"
          :style="{
            left: c.x + '%',
            background: c.color,
            animationDelay: c.delay + 's',
            animationDuration: c.duration + 's',
            width: c.size + 'px',
            height: c.size * c.ratio + 'px',
            borderRadius: c.shape === 'circle' ? '50%' : '2px'
          }"
        ></span>
      </div>
      <!-- floating sparkles -->
      <div class="milestone-sparkles" aria-hidden="true">
        <span
          v-for="s in sparkles"
          :key="s.id"
          class="sparkle-dot"
          :style="{
            left: s.x + '%',
            top: s.y + '%',
            animationDelay: s.delay + 's',
            animationDuration: s.duration + 's',
            width: s.size + 'px',
            height: s.size + 'px'
          }"
        ></span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { playMilestone } from '../services/sound.js'

const props = defineProps({
  threshold: { type: Number, required: true }
})
const emit = defineEmits(['done'])

function onClick() {
  emit('done')
}

const trophyEmoji = computed(() => {
  if (props.threshold >= 5000) return '👑'
  if (props.threshold >= 1000) return '🏆'
  if (props.threshold >= 500) return '🌟'
  return '⭐'
})

const medalEmoji = computed(() => {
  if (props.threshold >= 5000) return '🏅'
  if (props.threshold >= 1000) return '🥇'
  if (props.threshold >= 500) return '🥈'
  return '🥉'
})

const subtitle = computed(() => {
  if (props.threshold >= 5000) return '超级皮卡丘！'
  if (props.threshold >= 1000) return '小英雄诞生！'
  if (props.threshold >= 500) return '你真棒！'
  return '继续加油！'
})

const bgStyle = computed(() => {
  if (props.threshold >= 5000)
    return { background: 'linear-gradient(135deg, #fde68a, #f59e0b, #b91c1c)' }
  if (props.threshold >= 1000)
    return { background: 'linear-gradient(135deg, #fef3c7, #fbbf24, #92400e)' }
  if (props.threshold >= 500)
    return { background: 'linear-gradient(135deg, #f1f5f9, #cbd5e1, #475569)' }
  return { background: 'linear-gradient(135deg, #fef3c7, #d97706, #78350f)' }
})

// Random utility
function rand(min, max) {
  return Math.random() * (max - min) + min
}

// 50 confetti pieces with varied shapes
const colors = [
  '#ef4444', '#f59e0b', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#a855f7', '#ec4899',
  '#f97316', '#14b8a6', '#8b5cf6', '#f43f5e'
]
const confetti = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  x: rand(0, 100),
  color: colors[Math.floor(Math.random() * colors.length)],
  delay: rand(0, 1.5),
  duration: rand(2, 4.5),
  size: rand(8, 20),
  ratio: rand(1.2, 2.2),
  shape: Math.random() > 0.4 ? 'rect' : 'circle'
}))

// 30 floating sparkle dots scattered across the screen
const sparkles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: rand(5, 95),
  y: rand(5, 85),
  delay: rand(0, 2.5),
  duration: rand(1.5, 3.5),
  size: rand(3, 8)
}))

let timer = null
onMounted(() => {
  playMilestone()
  timer = setTimeout(() => emit('done'), 5000)
})
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.milestone-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  cursor: pointer;
  backdrop-filter: blur(8px);
  animation: milestone-fade-in 700ms ease-out;
}

@keyframes milestone-fade-in {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

.milestone-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.85;
  animation: milestone-bg-flash 1.5s ease-out;
}

@keyframes milestone-bg-flash {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  50% {
    opacity: 1;
    transform: scale(1.04);
  }
  100% {
    opacity: 0.85;
    transform: scale(1);
  }
}

/* Trophy + medal combo */
.milestone-trophy-wrap {
  display: flex;
  align-items: center;
  gap: 20px;
  animation: milestone-pop 800ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.milestone-trophy {
  font-size: 140px;
  line-height: 1;
  filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))
          drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
  animation: trophy-pulse 1.6s ease-in-out infinite;
}

@keyframes trophy-pulse {
  0%,
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))
            drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
  }
  50% {
    transform: scale(1.12);
    filter: drop-shadow(0 0 40px rgba(255, 215, 0, 1))
            drop-shadow(0 12px 32px rgba(0, 0, 0, 0.5));
  }
}

.milestone-medal {
  font-size: 100px;
  line-height: 1;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.35));
  animation: medal-spin 1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes medal-spin {
  0% {
    transform: scale(0) rotate(-360deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes milestone-pop {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.milestone-title {
  font-size: 56px;
  font-weight: 900;
  color: #fff;
  text-shadow:
    0 4px 12px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(255, 255, 255, 0.6);
  margin-top: 16px;
  animation: milestone-fade-up 700ms ease-out 400ms both;
}

.milestone-subtitle {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  margin-top: 8px;
  animation: milestone-fade-up 700ms ease-out 600ms both;
}

@keyframes milestone-fade-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Confetti */
.milestone-confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  top: -30px;
  opacity: 0.9;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(-30px) rotate(0deg) scale(1);
    opacity: 0.9;
  }
  60% {
    opacity: 0.95;
  }
  100% {
    transform: translateY(115vh) rotate(1080deg) scale(0.6);
    opacity: 0;
  }
}

/* Floating sparkles */
.milestone-sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.sparkle-dot {
  position: absolute;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  animation-name: sparkle-twinkle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
  box-shadow: 0 0 6px 2px rgba(255, 255, 200, 0.6);
}

@keyframes sparkle-twinkle {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.3);
  }
  30% {
    opacity: 0.9;
    transform: scale(1.3);
  }
  60% {
    opacity: 0.4;
    transform: scale(0.8);
  }
}
</style>
