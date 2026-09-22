<template>
  <header class="hero">
    <div class="hero-chip hero-date">
      <span class="hero-icon">📅</span>
      <div class="hero-col">
        <span class="hero-sub">{{ wdLabel }}</span>
        <span class="hero-label">{{ mdLabel }}</span>
      </div>
    </div>
    <div class="hero-chip hero-points">
      <span class="hero-icon">⭐</span>
      <div class="hero-col">
        <span class="hero-label">积分</span>
        <span class="hero-num">{{ totalPointsText }}</span>
        <span class="hero-today">今日 +{{ todayEarned }}</span>
      </div>
    </div>
    <div class="hero-chip hero-streak">
      <span class="hero-icon">🔥</span>
      <div class="hero-col">
        <span class="hero-label">连续</span>
        <span class="hero-num">{{ streak }}天</span>
        <span class="hero-level" v-if="levelLabel">{{ levelLabel }}</span>
      </div>
    </div>
    <!-- 升级进度条（每周：连续天数 → 下一等级，常显） -->
    <div class="hero-progress">
      <div class="hero-progress-bar">
        <div class="hero-progress-fill" :style="{ width: levelProgress + '%' }"></div>
      </div>
      <span class="hero-progress-text">{{ levelNextDays }}</span>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { WEEKDAYS } from '../utils/weekday.js'

const props = defineProps({
  date: { type: String, required: true },
  totalPoints: { type: Number, default: 0 },
  todayEarned: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  levelLabel: { type: String, default: '' },
  levelProgress: { type: Number, default: 0 },
  levelNextDays: { type: String, default: '' }
})

const wdLabel = computed(() => {
  const [y, m, d] = props.date.split('-').map(Number)
  const wd = new Date(y, m - 1, d).getDay()
  const mapped = wd === 0 ? 7 : wd
  const info = WEEKDAYS.find((w) => w.n === mapped) || WEEKDAYS[0]
  return info.short
})

const mdLabel = computed(() => {
  const [, m, d] = props.date.split('-')
  return `${Number(m)}.${Number(d)}`
})

const totalPointsText = computed(() => props.totalPoints.toLocaleString('en-US'))
</script>

<style scoped>
.hero {
  display: flex; align-items: stretch; gap: 14px;
  padding: 20px 20px 12px; flex-wrap: wrap;
}
.hero-chip {
  flex: 1; min-width: 160px;
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-radius: 24px;
  background: rgba(255,255,255,.85); border: 2px solid #e0e7ff;
  box-shadow: 0 4px 16px rgba(79,70,229,.08);
  backdrop-filter: blur(8px);
}
.hero-icon { font-size: 34px; line-height: 1; flex: 0 0 auto; }
.hero-col { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
/* 设计稿 hlabel：小号灰色大写字距 */
.hero-label { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
.hero-sub { font-size: 22px; font-weight: 900; color: #1a1a2e; line-height: 1.1; }
/* 设计稿 hn：靛蓝数字（积分卡内由 .hero-points 覆盖为白） */
.hero-num { font-size: 28px; font-weight: 900; color: #4f46e5; line-height: 1.1; font-variant-numeric: tabular-nums; }
/* 设计稿 .ht：绿字浅绿底 pill（积分卡内覆盖白字） */
.hero-today {
  font-size: 12px; font-weight: 800; color: #10b981;
  background: rgba(16,185,129,.1);
  padding: 4px 12px; border-radius: 999px; margin-top: 4px;
}
/* 设计稿 streak卡形态小字：靛蓝紫 */
.hero-level { font-size: 13px; font-weight: 900; color: #6366f1; }
.hero-points { background: linear-gradient(135deg,#ffb627,#ff8a00); border-color: #fff3c4; }
.hero-points .hero-label, .hero-points .hero-num { color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.12); }
.hero-points .hero-today { color: #fff; background: rgba(255,255,255,0.25); }

/* 等级进度条 */
.hero-progress {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 0 20px 8px;
}
.hero-progress-bar {
  flex: 1; height: 10px; background: #eee; border-radius: 999px; overflow: hidden;
}
.hero-progress-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #ffb627, #ff8a00);
  transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1);
}
.hero-progress-text { font-size: 14px; font-weight: 700; color: #8a7a5a; white-space: nowrap; }
</style>
