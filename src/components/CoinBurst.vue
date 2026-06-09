<template>
  <Teleport to="body">
    <span
      v-for="coin in coins"
      :key="coin.id"
      class="coin-fly fixed pointer-events-none"
      :style="coinStyle(coin)"
    >
      <span class="coin-disc">¥</span>
    </span>
  </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  count: { type: Number, default: 20 }
})

const emit = defineEmits(['done'])

// Utility: random in range
function rand(min, max) {
  return Math.random() * (max - min) + min
}

// 20 coins burst outward in a fan pattern with natural randomness
const coins = []
const total = props.count
for (let i = 0; i < total; i++) {
  // Base spread angle: distribute evenly across a wide fan (~160°)
  const baseAngle = (i / (total - 1 || 1) - 0.5) * 160 // degrees, from -80 to +80
  // Add slight random jitter to angle
  const angle = baseAngle + rand(-12, 12)
  // Random distance: coins fly 80–160px away
  const distance = rand(100, 170)
  const rad = (angle * Math.PI) / 180
  const tx = Math.sin(rad) * distance
  const ty = -Math.cos(rad) * distance - rand(10, 40)

  coins.push({
    id: i,
    baseX: props.x - 14,
    baseY: props.y - 14,
    tx: Math.round(tx),
    ty: Math.round(ty),
    delay: i * 18,
    duration: rand(650, 1000) // varied speed per coin
  })
}

function coinStyle(c) {
  return {
    left: c.baseX + 'px',
    top: c.baseY + 'px',
    '--tx': c.tx + 'px',
    '--ty': c.ty + 'px',
    animationDelay: c.delay + 'ms',
    animationDuration: c.duration + 'ms'
  }
}

let timer = null
onMounted(() => {
  timer = setTimeout(() => emit('done'), 1400)
})
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.coin-fly {
  width: 28px;
  height: 28px;
  z-index: 50;
  animation: coin-fly 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.coin-disc {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 35% 35%, #fef08a, #facc15, #eab308);
  border: 2px solid #ca8a04;
  border-radius: 50%;
  color: #78350f;
  font-weight: 900;
  font-size: 13px;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.3),
    0 0 12px rgba(250, 204, 21, 0.5);
  filter: drop-shadow(0 0 6px rgba(255, 200, 0, 0.8))
          drop-shadow(0 0 12px rgba(255, 180, 0, 0.5));
}

@keyframes coin-fly {
  0% {
    transform: translate(0, 0) scale(0.4) rotate(0deg);
    opacity: 0;
  }
  15% {
    transform: translate(0, 0) scale(1.1) rotate(0deg);
    opacity: 1;
  }
  25% {
    transform: translate(0, 0) scale(1) rotate(0deg);
    opacity: 1;
  }
  60% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0.5) rotate(360deg);
    opacity: 0;
  }
}
</style>
