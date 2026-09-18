<template>
  <Teleport to="body">
    <Transition name="alldone">
      <div v-if="show" class="ad-overlay" @click.self="onClose">
        <div class="ad-card">
          <!-- 粒子效果容器 -->
          <div class="ad-particles">
            <span v-for="i in 20" :key="i" class="ad-particle" :style="particleStyle(i)"></span>
          </div>
          <!-- 大 emoji 组合 -->
          <div class="ad-emojis">
            <span class="ad-emoji-main">🏆</span>
            <span class="ad-emoji-float" style="--delay:0s;--x:-40px;--y:-30px">⭐</span>
            <span class="ad-emoji-float" style="--delay:0.2s;--x:40px;--y:-20px">🎉</span>
            <span class="ad-emoji-float" style="--delay:0.4s;--x:-30px;--y:20px">👑</span>
            <span class="ad-emoji-float" style="--delay:0.6s;--x:35px;--y:30px">🎆</span>
          </div>
          <div class="ad-title">🎉 全勤达成！</div>
          <div class="ad-subtitle">你是今天的超级英雄！</div>
          <div class="ad-score">今日获得 <strong>{{ totalEarned }}</strong> 分</div>
          <button class="ad-close" @click="onClose">太棒啦！</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  totalEarned: { type: Number, default: 0 }
})
const emit = defineEmits(['close'])

function onClose() {
  emit('close')
}

function particleStyle(i) {
  const angle = (i / 20) * 360
  const dist = 80 + Math.random() * 120
  const x = Math.cos(angle * Math.PI / 180) * dist
  const y = Math.sin(angle * Math.PI / 180) * dist
  return {
    '--i': i,
    '--rx': x + 'px',
    '--ry': y + 'px',
    left: '50%',
    top: '50%',
    animationDelay: (Math.random() * 0.5) + 's',
    background: `hsl(${i * 18}, 90%, 60%)`
  }
}
</script>

<style>
/* 全局样式（Teleport 到 body） */
.ad-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
}
.ad-card {
  position: relative;
  background: linear-gradient(160deg, #fff9ec, #fff3dd);
  border-radius: 32px; padding: 48px 40px; text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: ad-pop 600ms cubic-bezier(0.34,1.56,0.64,1);
  overflow: hidden;
}
.ad-emojis { position: relative; height: 80px; margin-bottom: 16px; }
.ad-emoji-main { font-size: 72px; animation: ad-bounce 1s ease-in-out infinite; }
.ad-emoji-float {
  position: absolute; font-size: 32px;
  left: 50%; top: 50%;
  animation: ad-float 1.5s var(--delay) ease-out infinite;
}
.ad-title { font-size: 36px; font-weight: 900; color: #222; margin: 8px 0; }
.ad-subtitle { font-size: 22px; font-weight: 600; color: #666; margin-bottom: 16px; }
.ad-score { font-size: 24px; font-weight: 800; color: #ea580c; margin-bottom: 24px; }
.ad-score strong { font-size: 32px; }
.ad-close {
  padding: 14px 48px; border-radius: 999px; border: none;
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  color: #fff; font-size: 22px; font-weight: 800;
  box-shadow: 0 4px 16px rgba(255,138,0,0.4);
  cursor: pointer; transition: transform 0.15s;
}
.ad-close:active { transform: scale(0.95); }

/* 粒子 */
.ad-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.ad-particle {
  position: absolute; width: 8px; height: 8px; border-radius: 50%;
  animation: ad-scatter 2s ease-out infinite;
}

/* 动画 */
@keyframes ad-pop { 0% { transform: scale(0.3); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes ad-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes ad-float {
  0% { transform: translate(-50%,-50%) scale(0); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.2); opacity: 0; }
}
@keyframes ad-scatter {
  0% { transform: translate(50%,50%) scale(0); opacity: 1; }
  100% { transform: translate(calc(50% + var(--rx, 100px)), calc(50% + var(--ry, -100px))) scale(0); opacity: 0; }
}
.alldone-enter-active { animation: ad-pop 600ms; }
.alldone-leave-active { animation: ad-fade-out 400ms ease-in; }
@keyframes ad-fade-out { 0% { opacity: 1; } 100% { opacity: 0; } }
</style>
