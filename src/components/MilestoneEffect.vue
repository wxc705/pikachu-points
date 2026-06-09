<template>
  <Teleport to="body">
    <div class="milestone-overlay" @click="onClick">
      <div class="milestone-bg" :style="bgStyle"></div>
      <div class="milestone-medal">{{ medalEmoji }}</div>
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
            animationDuration: c.duration + 's'
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

const medalEmoji = computed(() => {
  if (props.threshold >= 5000) return '👑'
  if (props.threshold >= 1000) return '🥇'
  if (props.threshold >= 500)  return '🥈'
  return '🥉'
})
const subtitle = computed(() => {
  if (props.threshold >= 5000) return '超级皮卡丘！'
  if (props.threshold >= 1000) return '小英雄诞生！'
  if (props.threshold >= 500)  return '你真棒！'
  return '继续加油！'
})
const bgStyle = computed(() => {
  if (props.threshold >= 5000) return { background: 'linear-gradient(135deg, #fde68a, #f59e0b, #b91c1c)' }
  if (props.threshold >= 1000) return { background: 'linear-gradient(135deg, #fef3c7, #fbbf24, #92400e)' }
  if (props.threshold >= 500)  return { background: 'linear-gradient(135deg, #f1f5f9, #cbd5e1, #475569)' }
  return { background: 'linear-gradient(135deg, #fef3c7, #d97706, #78350f)' }
})

// 30 个彩色纸屑
const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899']
function rand(min, max) { return Math.random() * (max - min) + min }
const confetti = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: rand(0, 100),
  color: colors[Math.floor(Math.random() * colors.length)],
  delay: rand(0, 1.2),
  duration: rand(2.2, 3.6)
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
  animation: milestone-fade-in 500ms ease-out;
}
@keyframes milestone-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.milestone-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.85;
  animation: milestone-bg-flash 1.5s ease-out;
}
@keyframes milestone-bg-flash {
  0%   { opacity: 0;   transform: scale(0.9); }
  60%  { opacity: 1;   transform: scale(1.05); }
  100% { opacity: 0.85; transform: scale(1); }
}

.milestone-medal {
  font-size: 200px;
  line-height: 1;
  filter: drop-shadow(0 8px 20px rgba(0,0,0,0.3));
  animation: milestone-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes milestone-pop {
  0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg);    opacity: 1; }
}

.milestone-title {
  font-size: 56px;
  font-weight: 900;
  color: #fff;
  text-shadow:
    0 4px 12px rgba(0,0,0,0.5),
    0 0 40px rgba(255,255,255,0.6);
  margin-top: 12px;
  animation: milestone-fade-up 700ms ease-out 300ms both;
}
.milestone-subtitle {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0,0,0,0.4);
  margin-top: 8px;
  animation: milestone-fade-up 700ms ease-out 500ms both;
}
@keyframes milestone-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 纸屑 */
.milestone-confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.confetti-piece {
  position: absolute;
  top: -20px;
  width: 12px;
  height: 18px;
  border-radius: 2px;
  opacity: 0.9;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
}
@keyframes confetti-fall {
  0%   { transform: translateY(-30px) rotate(0deg);   opacity: 0.9; }
  85%  { opacity: 0.9; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0;   }
}
</style>
