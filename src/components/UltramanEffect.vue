<template>
  <Teleport to="body">
    <div class="ultraman-overlay" :class="'rays-' + rayStyle" @click="onClick">
      <div class="ultraman-rays"></div>
      <div class="ultraman-rays-2"></div>
      <div class="ultraman-particles" aria-hidden="true">
        <span
          v-for="p in particles"
          :key="p.id"
          class="ultraman-particle"
          :style="{
            left: p.x + '%',
            top: p.y + '%',
            animationDelay: p.delay + 's',
            animationDuration: p.duration + 's',
            width: p.size + 'px',
            height: p.size + 'px',
            background: p.color,
            boxShadow: '0 0 ' + (p.size * 2) + 'px ' + (p.size * 0.8) + 'px ' + p.color
          }"
        ></span>
      </div>
      <img
        class="ultraman-image"
        :src="imgSrc"
        :alt="`奥特曼 Lv.${level}`"
        @click.stop
        @error="onImgError"
      />
      <div class="ultraman-text" :class="'glow-' + glowStyle">{{ message }}</div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { playSuccess } from '../services/sound.js'

const props = defineProps({
  level: { type: Number, default: 1, validator: (v) => v >= 1 && v <= 5 }
})
const emit = defineEmits(['done'])

// ---- 随机消息池 ----
const MESSAGES = [
  '兑换成功！', '太棒了！🎉', '恭喜你！🌟', '超级厉害！💪',
  '愿望实现！✨', '继续加油！🔥', '你是最棒的！👑', '好开心呀！😆',
  '努力有回报！🏆', '皮卡皮卡！⚡'
]
const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]

// ---- 随机光效风格 (rays) ----
const RAY_STYLES = ['gold', 'rainbow', 'blue', 'pink', 'green']
const rayStyle = RAY_STYLES[Math.floor(Math.random() * RAY_STYLES.length)]

// ---- 随机文字发光 ----
const GLOW_STYLES = ['gold', 'rainbow', 'blue']
const glowStyle = GLOW_STYLES[Math.floor(Math.random() * GLOW_STYLES.length)]

// ---- 随机粒子色板 ----
const PALETTES = [
  ['#ffd700', '#ffec8b', '#ffa500', '#ffeb3b'],           // 金色系
  ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b'], // 五彩系
  ['#a78bfa', '#818cf8', '#c084fc', '#e879f9'],            // 紫色系
  ['#22d3ee', '#38bdf8', '#0ea5e9', '#7dd3fc'],            // 蓝色系
]
const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]

// ---- 生成随机粒子 ----
function rand(min, max) { return Math.random() * (max - min) + min }
const particleCount = Math.floor(rand(22, 38))
const particles = Array.from({ length: particleCount }, (_, i) => ({
  id: i,
  x: rand(5, 95),
  y: rand(55, 95),
  delay: rand(0, 2.5),
  duration: rand(1, 3.5),
  size: rand(3, 8),
  color: palette[Math.floor(Math.random() * palette.length)]
}))

// ---- 图片 ----
const imgSrc = computed(() => {
  const lv = Math.min(5, Math.max(1, props.level || 1))
  return `./ultraman/level${lv}.png`
})

const imgErrored = ref(false)
function onImgError() { imgErrored.value = true }
function onClick() { emit('done') }

let timer = null
onMounted(() => {
  playSuccess()
  timer = setTimeout(() => emit('done'), 2500)
})
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<style scoped>
.ultraman-overlay {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center; flex-direction: column;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(3px);
  overflow: hidden; cursor: pointer;
  animation: u-fade-in 400ms ease-out;
}
@keyframes u-fade-in { from { opacity: 0 } to { opacity: 1 } }

/* ---- 光效基础 ---- */
.ultraman-rays, .ultraman-rays-2 {
  position: absolute; width: 200vmax; height: 200vmax; pointer-events: none;
}
.ultraman-rays  { animation: u-spin 10s linear infinite; filter: blur(2px); }
.ultraman-rays-2 { animation: u-spin-rev 14s linear infinite; filter: blur(1.5px); }
@keyframes u-spin     { to { transform: rotate(360deg) } }
@keyframes u-spin-rev { to { transform: rotate(-360deg) } }

/* 金色光线 */
.rays-gold  .ultraman-rays  { background: conic-gradient(from 0deg, transparent 0deg, rgba(255,220,50,.18) 8deg, transparent 16deg, transparent 30deg, rgba(255,220,50,.18) 38deg, transparent 46deg, transparent 60deg, rgba(255,220,50,.18) 68deg, transparent 76deg, transparent 90deg, rgba(255,220,50,.18) 98deg, transparent 106deg, transparent 120deg, rgba(255,220,50,.18) 128deg, transparent 136deg, transparent 150deg, rgba(255,220,50,.18) 158deg, transparent 166deg, transparent 180deg, rgba(255,220,50,.18) 188deg, transparent 196deg, transparent 210deg, rgba(255,220,50,.18) 218deg, transparent 226deg, transparent 240deg, rgba(255,220,50,.18) 248deg, transparent 256deg, transparent 270deg, rgba(255,220,50,.18) 278deg, transparent 286deg, transparent 300deg, rgba(255,220,50,.18) 308deg, transparent 316deg, transparent 330deg, rgba(255,220,50,.18) 338deg, transparent 346deg, transparent 360deg); }
.rays-gold  .ultraman-rays-2 { background: conic-gradient(from 15deg, transparent 0deg, rgba(255,200,30,.1) 4deg, transparent 10deg, transparent 24deg, rgba(255,200,30,.1) 28deg, transparent 34deg, transparent 48deg, rgba(255,200,30,.1) 52deg, transparent 58deg, transparent 72deg, rgba(255,200,30,.1) 76deg, transparent 82deg, transparent 96deg, rgba(255,200,30,.1) 100deg, transparent 106deg, transparent 120deg, rgba(255,200,30,.1) 124deg, transparent 130deg, transparent 144deg, rgba(255,200,30,.1) 148deg, transparent 154deg, transparent 168deg, rgba(255,200,30,.1) 172deg, transparent 178deg, transparent 192deg, rgba(255,200,30,.1) 196deg, transparent 202deg, transparent 216deg, rgba(255,200,30,.1) 220deg, transparent 226deg, transparent 240deg, rgba(255,200,30,.1) 244deg, transparent 250deg, transparent 264deg, rgba(255,200,30,.1) 268deg, transparent 274deg, transparent 288deg, rgba(255,200,30,.1) 292deg, transparent 298deg, transparent 312deg, rgba(255,200,30,.1) 316deg, transparent 322deg, transparent 336deg, rgba(255,200,30,.1) 340deg, transparent 346deg, transparent 360deg); }

/* 彩虹光线 */
.rays-rainbow .ultraman-rays { background: conic-gradient(from 0deg, transparent 0deg, rgba(255,0,0,.12) 30deg, rgba(255,165,0,.12) 60deg, transparent 90deg, rgba(0,255,0,.12) 120deg, transparent 150deg, rgba(0,100,255,.12) 180deg, transparent 210deg, rgba(128,0,255,.12) 240deg, transparent 270deg, rgba(255,0,128,.12) 300deg, transparent 330deg, transparent 360deg); }
.rays-rainbow .ultraman-rays-2 { background: conic-gradient(from 20deg, transparent 0deg, rgba(255,100,100,.08) 20deg, transparent 50deg, rgba(100,255,100,.08) 80deg, transparent 110deg, rgba(100,100,255,.08) 140deg, transparent 170deg, rgba(255,100,255,.08) 200deg, transparent 230deg, rgba(255,255,100,.08) 260deg, transparent 290deg, rgba(100,255,255,.08) 320deg, transparent 350deg, transparent 360deg); }

/* 蓝色光线 */
.rays-blue .ultraman-rays { background: conic-gradient(from 0deg, transparent 0deg, rgba(59,130,246,.18) 8deg, transparent 16deg, transparent 30deg, rgba(59,130,246,.18) 38deg, transparent 46deg, transparent 60deg, rgba(96,165,250,.18) 68deg, transparent 76deg, transparent 90deg, rgba(59,130,246,.18) 98deg, transparent 106deg, transparent 120deg, rgba(147,197,253,.18) 128deg, transparent 136deg, transparent 150deg, rgba(59,130,246,.18) 158deg, transparent 166deg, transparent 180deg, rgba(96,165,250,.18) 188deg, transparent 196deg, transparent 210deg, rgba(59,130,246,.18) 218deg, transparent 226deg, transparent 240deg, rgba(147,197,253,.18) 248deg, transparent 256deg, transparent 270deg, rgba(59,130,246,.18) 278deg, transparent 286deg, transparent 300deg, rgba(96,165,250,.18) 308deg, transparent 316deg, transparent 330deg, rgba(59,130,246,.18) 338deg, transparent 346deg, transparent 360deg); }
.rays-blue .ultraman-rays-2 { background: conic-gradient(from 10deg, transparent 0deg, rgba(37,99,235,.1) 4deg, transparent 10deg, transparent 24deg, rgba(37,99,235,.1) 28deg, transparent 34deg, transparent 48deg, rgba(59,130,246,.1) 52deg, transparent 58deg, transparent 72deg, rgba(37,99,235,.1) 76deg, transparent 82deg, transparent 96deg, rgba(59,130,246,.1) 100deg, transparent 106deg, transparent 120deg, rgba(37,99,235,.1) 124deg, transparent 130deg, transparent 144deg, rgba(59,130,246,.1) 148deg, transparent 154deg, transparent 168deg, rgba(37,99,235,.1) 172deg, transparent 178deg, transparent 192deg, rgba(59,130,246,.1) 196deg, transparent 202deg, transparent 216deg, rgba(37,99,235,.1) 220deg, transparent 226deg, transparent 240deg, rgba(59,130,246,.1) 244deg, transparent 250deg, transparent 264deg, rgba(37,99,235,.1) 268deg, transparent 274deg, transparent 288deg, rgba(59,130,246,.1) 292deg, transparent 298deg, transparent 312deg, rgba(37,99,235,.1) 316deg, transparent 322deg, transparent 336deg, rgba(59,130,246,.1) 340deg, transparent 346deg, transparent 360deg); }

/* 粉色光线 */
.rays-pink .ultraman-rays { background: conic-gradient(from 0deg, transparent 0deg, rgba(236,72,153,.18) 8deg, transparent 16deg, transparent 30deg, rgba(236,72,153,.18) 38deg, transparent 46deg, transparent 60deg, rgba(244,114,182,.18) 68deg, transparent 76deg, transparent 90deg, rgba(236,72,153,.18) 98deg, transparent 106deg, transparent 120deg, rgba(251,207,232,.18) 128deg, transparent 136deg, transparent 150deg, rgba(236,72,153,.18) 158deg, transparent 166deg, transparent 180deg, rgba(244,114,182,.18) 188deg, transparent 196deg, transparent 210deg, rgba(236,72,153,.18) 218deg, transparent 226deg, transparent 240deg, rgba(251,207,232,.18) 248deg, transparent 256deg, transparent 270deg, rgba(236,72,153,.18) 278deg, transparent 286deg, transparent 300deg, rgba(244,114,182,.18) 308deg, transparent 316deg, transparent 330deg, rgba(236,72,153,.18) 338deg, transparent 346deg, transparent 360deg); }
.rays-pink .ultraman-rays-2 { background: conic-gradient(from 10deg, transparent 0deg, rgba(219,39,119,.1) 4deg, transparent 10deg, transparent 24deg, rgba(219,39,119,.1) 28deg, transparent 34deg, transparent 48deg, rgba(236,72,153,.1) 52deg, transparent 58deg, transparent 72deg, rgba(219,39,119,.1) 76deg, transparent 82deg, transparent 96deg, rgba(236,72,153,.1) 100deg, transparent 106deg, transparent 120deg, rgba(219,39,119,.1) 124deg, transparent 130deg, transparent 144deg, rgba(236,72,153,.1) 148deg, transparent 154deg, transparent 168deg, rgba(219,39,119,.1) 172deg, transparent 178deg, transparent 192deg, rgba(236,72,153,.1) 196deg, transparent 202deg, transparent 216deg, rgba(219,39,119,.1) 220deg, transparent 226deg, transparent 240deg, rgba(236,72,153,.1) 244deg, transparent 250deg, transparent 264deg, rgba(219,39,119,.1) 268deg, transparent 274deg, transparent 288deg, rgba(236,72,153,.1) 292deg, transparent 298deg, transparent 312deg, rgba(219,39,119,.1) 316deg, transparent 322deg, transparent 336deg, rgba(236,72,153,.1) 340deg, transparent 346deg, transparent 360deg); }

/* 绿色光线 */
.rays-green .ultraman-rays { background: conic-gradient(from 0deg, transparent 0deg, rgba(34,197,94,.18) 8deg, transparent 16deg, transparent 30deg, rgba(34,197,94,.18) 38deg, transparent 46deg, transparent 60deg, rgba(74,222,128,.18) 68deg, transparent 76deg, transparent 90deg, rgba(34,197,94,.18) 98deg, transparent 106deg, transparent 120deg, rgba(187,247,208,.18) 128deg, transparent 136deg, transparent 150deg, rgba(34,197,94,.18) 158deg, transparent 166deg, transparent 180deg, rgba(74,222,128,.18) 188deg, transparent 196deg, transparent 210deg, rgba(34,197,94,.18) 218deg, transparent 226deg, transparent 240deg, rgba(187,247,208,.18) 248deg, transparent 256deg, transparent 270deg, rgba(34,197,94,.18) 278deg, transparent 286deg, transparent 300deg, rgba(74,222,128,.18) 308deg, transparent 316deg, transparent 330deg, rgba(34,197,94,.18) 338deg, transparent 346deg, transparent 360deg); }
.rays-green .ultraman-rays-2 { background: conic-gradient(from 10deg, transparent 0deg, rgba(22,163,74,.1) 4deg, transparent 10deg, transparent 24deg, rgba(22,163,74,.1) 28deg, transparent 34deg, transparent 48deg, rgba(34,197,94,.1) 52deg, transparent 58deg, transparent 72deg, rgba(22,163,74,.1) 76deg, transparent 82deg, transparent 96deg, rgba(34,197,94,.1) 100deg, transparent 106deg, transparent 120deg, rgba(22,163,74,.1) 124deg, transparent 130deg, transparent 144deg, rgba(34,197,94,.1) 148deg, transparent 154deg, transparent 168deg, rgba(22,163,74,.1) 172deg, transparent 178deg, transparent 192deg, rgba(34,197,94,.1) 196deg, transparent 202deg, transparent 216deg, rgba(22,163,74,.1) 220deg, transparent 226deg, transparent 240deg, rgba(34,197,94,.1) 244deg, transparent 250deg, transparent 264deg, rgba(22,163,74,.1) 268deg, transparent 274deg, transparent 288deg, rgba(34,197,94,.1) 292deg, transparent 298deg, transparent 312deg, rgba(22,163,74,.1) 316deg, transparent 322deg, transparent 336deg, rgba(34,197,94,.1) 340deg, transparent 346deg, transparent 360deg); }

/* ---- 粒子 ---- */
.ultraman-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.ultraman-particle {
  position: absolute; border-radius: 50%;
  animation-name: p-float; animation-timing-function: ease-in-out;
  animation-iteration-count: infinite; animation-fill-mode: both;
}
@keyframes p-float {
  0%   { opacity: 0;   transform: translateY(0)    scale(0.3); }
  20%  { opacity: 1;   transform: translateY(-16px) scale(1.3); }
  50%  { opacity: 0.6; transform: translateY(-36px) scale(0.7); }
  80%  { opacity: 0.15;transform: translateY(-56px) scale(1.5); }
  100% { opacity: 0;   transform: translateY(-76px) scale(0.1); }
}

/* ---- 图片 ---- */
.ultraman-image {
  position: relative; z-index: 1;
  max-width: 58vw; max-height: 55vh; object-fit: contain;
  filter: drop-shadow(0 0 30px rgba(255,220,50,.6));
  animation: u-pop 700ms cubic-bezier(.34,1.56,.64,1) both;
  pointer-events: none;
}
@keyframes u-pop {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

/* ---- 文字 ---- */
.ultraman-text {
  position: relative; z-index: 1; margin-top: 20px;
  font-size: 52px; font-weight: 900; letter-spacing: 6px;
  animation: u-text-in 600ms ease-out 300ms both; pointer-events: none;
}
@keyframes u-text-in {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

/* 金色发光 */
.glow-gold { color: #ffd700; text-shadow: 0 0 10px #fff8dc, 0 0 30px #ffeb3b, 0 0 60px #ff9800, 0 0 90px #ff5722, 0 0 120px #c0392b, 0 4px 12px rgba(0,0,0,.7); }

/* 彩虹发光 */
.glow-rainbow { color: #fff; text-shadow: 0 0 8px #ff0000, 0 0 16px #ff8800, 0 0 24px #ffff00, 0 0 32px #00ff00, 0 0 40px #0088ff, 0 0 48px #8800ff, 0 4px 12px rgba(0,0,0,.7); }

/* 蓝色电光 */
.glow-blue { color: #7dd3fc; text-shadow: 0 0 8px #bae6fd, 0 0 20px #38bdf8, 0 0 40px #0ea5e9, 0 0 60px #0284c7, 0 0 80px #0369a1, 0 4px 12px rgba(0,0,0,.7); }
</style>
