<template>
  <div class="sch-page">
    <h2 class="sch-title">📅 本周课表</h2>
    <p class="sch-subtitle">皮卡丘 · 和畅实验小学一年级(10)班</p>

    <!-- 星期选择 -->
    <div class="sch-days">
      <button
        v-for="d in weekDays"
        :key="d.n"
        class="sch-day-btn"
        :class="{ 'is-active': selectedDay === d.n, 'is-today': d.n === todayWd }"
        @click="selectedDay = d.n"
      >
        <span class="sch-day-short">{{ d.short }}</span>
        <span v-if="d.n === todayWd" class="sch-day-dot">●</span>
      </button>
    </div>

    <!-- 课表内容 -->
    <div class="sch-timeline">
      <div
        v-for="(item, i) in todaySchedule"
        :key="i"
        class="sch-row"
        :class="{
          'is-class': item.isClass,
          'is-break': item.isBreak,
          'is-past': item.isPast,
          'is-now': item.isNow
        }"
      >
        <div class="sch-time">{{ item.time }}</div>
        <div class="sch-dot" :class="{ 'dot-class': item.isClass }"></div>
        <div class="sch-content">
          <span class="sch-name">{{ item.name }}</span>
          <span v-if="item.isClass" class="sch-badge">课外班</span>
          <span v-if="item.points" class="sch-pts">+{{ item.points }}分</span>
        </div>
      </div>
    </div>

    <!-- 课外班汇总 -->
    <div class="sch-summary">
      <h3 class="sch-sum-title">🏫 本周课外班</h3>
      <div class="sch-sum-grid">
        <div v-for="cls in extracurricular" :key="cls.name" class="sch-sum-card">
          <span class="sch-sum-emoji">{{ cls.emoji }}</span>
          <span class="sch-sum-name">{{ cls.name }}</span>
          <span class="sch-sum-when">{{ cls.when }}</span>
          <span class="sch-sum-pts">{{ cls.points }}分</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { dateToWeekday, WEEKDAYS } from '../utils/weekday.js'

const store = usePointsStore()
const todayWd = dateToWeekday()
const selectedDay = ref(todayWd)
const weekDays = WEEKDAYS

// 课外班数据（带具体时间）
const extracurricular = [
  { name: '写字课', emoji: '✏️', when: '周二/周四 18:00-19:00', points: 2 },
  { name: '体能课', emoji: '💪', when: '周五 17:00-18:00', points: 2 },
  { name: '国象课', emoji: '♟️', when: '周六 9:30-11:20', points: 2 }
]

// 每日时间表（含课外班标记）
const SCHEDULE_DATA = {
  1: [ // 周一
    { time: '早晨', name: '多邻国1-2单元', points: 1 },
    { time: '16:30', name: '思维', points: 1 },
    { time: '18:00', name: '语文预习', points: 1 },
    { time: '18:00', name: '英语', points: 1 },
    { time: '18:30', name: '思维', points: 1 },
    { time: '19:00', name: '编程40min', points: 1 },
    { time: '19:00', name: '国象15min', points: 1 },
    { time: '20:30', name: '阅读15min', points: 1 }
  ],
  2: [ // 周二
    { time: '早晨', name: '多邻国1-2单元', points: 1 },
    { time: '16:00', name: '语文预习', points: 1 },
    { time: '16:00', name: '语文阅读', points: 1 },
    { time: '16:30', name: '思维', points: 1 },
    { time: '18:00', name: '✏️ 写字课', points: 2, isClass: true },
    { time: '20:30', name: '阅读15min', points: 1 }
  ],
  3: [ // 周三
    { time: '早晨', name: '多邻国1-2单元', points: 1 },
    { time: '18:00', name: '语文预习', points: 1 },
    { time: '18:00', name: '英语', points: 1 },
    { time: '18:30', name: '思维', points: 1 },
    { time: '19:00', name: '乐高40min', points: 1 },
    { time: '19:00', name: '国象15min', points: 1 },
    { time: '20:30', name: '阅读15min', points: 1 }
  ],
  4: [ // 周四
    { time: '早晨', name: '多邻国1-2单元', points: 1 },
    { time: '16:00', name: '语文预习', points: 1 },
    { time: '16:00', name: '语文阅读', points: 1 },
    { time: '16:30', name: '思维', points: 1 },
    { time: '18:00', name: '✏️ 写字课', points: 2, isClass: true },
    { time: '20:30', name: '阅读15min', points: 1 }
  ],
  5: [ // 周五
    { time: '早晨', name: '多邻国1-2单元', points: 1 },
    { time: '16:30', name: '思维', points: 1 },
    { time: '17:00', name: '💪 体能课', points: 2, isClass: true },
    { time: '18:30', name: '游戏', points: 1 },
    { time: '19:00', name: '国象15min', points: 1 },
    { time: '19:30', name: '游戏', points: 1 },
    { time: '20:30', name: '阅读15min', points: 1 }
  ],
  6: [ // 周六
    { time: '8:00', name: '多邻国1-2单元', points: 1 },
    { time: '9:30', name: '♟️ 国象课', points: 2, isClass: true },
    { time: '13:00', name: '语文阅读', points: 1 },
    { time: '13:00', name: '诗歌二首', points: 1 },
    { time: '15:00', name: '思维', points: 1 },
    { time: '15:00', name: '英语', points: 1 },
    { time: '19:00', name: '写字15min', points: 2 },
    { time: '20:30', name: '阅读15min', points: 1 }
  ],
  7: [ // 周日
    { time: '8:00', name: '多邻国1-2单元', points: 1 },
    { time: '16:00', name: '实验课', points: 1 },
    { time: '18:00', name: '写字15min', points: 2 },
    { time: '18:00', name: '国象15min', points: 1 },
    { time: '19:00', name: '语文预习', points: 1 },
    { time: '20:30', name: '阅读15min', points: 1 }
  ]
}

// 课外班时间映射（用于高亮）
const CLASS_TIMES = {
  2: { '18:00': true },  // 周二写字课
  4: { '18:00': true },  // 周四写字课
  5: { '17:00': true },  // 周五体能课
  6: { '9:30': true }    // 周六国象课
}

function parseTime(str) {
  if (str === '早晨') return 7 * 60
  const [h, m] = str.replace('-', '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const todaySchedule = computed(() => {
  const items = SCHEDULE_DATA[selectedDay.value] || []
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return items.map((item) => {
    const t = parseTime(item.time)
    return {
      ...item,
      isClass: item.isClass || (CLASS_TIMES[selectedDay.value] && CLASS_TIMES[selectedDay.value][item.time]),
      isPast: nowMin > t + 60,
      isNow: nowMin >= t && nowMin < t + 60
    }
  })
})
</script>

<style scoped>
.sch-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.sch-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--tt-text, #1a1a1a);
  text-align: center;
}
.sch-subtitle {
  font-size: 11px;
  color: var(--tt-muted, #9ca3af);
  text-align: center;
  margin-top: -8px;
}

/* 星期选择 */
.sch-days {
  display: flex;
  gap: 6px;
  justify-content: center;
}
.sch-day-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px solid var(--tt-border, #e5e7eb);
  background: var(--tt-card, #fff);
  font-size: 12px;
  font-weight: 700;
  color: var(--tt-text, #1a1a1a);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.2s;
}
.sch-day-btn.is-today {
  border-color: var(--tt-primary, #facc15);
}
.sch-day-btn.is-active {
  background: var(--tt-primary, #facc15);
  color: #451a03;
  border-color: var(--tt-primary, #facc15);
}
.sch-day-dot {
  font-size: 6px;
  color: #ef4444;
}

/* 时间线 */
.sch-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 8px;
}
.sch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--tt-border, #f0f0f0);
  transition: background 0.2s;
}
.sch-row.is-now {
  background: rgba(250, 204, 21, 0.15);
  border-radius: 8px;
  padding: 10px 8px;
}
.sch-row.is-past {
  opacity: 0.45;
}
.sch-row.is-class {
  background: rgba(93, 140, 46, 0.08);
  border-radius: 8px;
  padding: 10px 8px;
}
.sch-time {
  width: 50px;
  font-size: 12px;
  font-weight: 600;
  color: var(--tt-muted, #9ca3af);
  text-align: right;
  flex-shrink: 0;
}
.sch-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tt-border, #d1d5db);
  flex-shrink: 0;
}
.sch-dot.dot-class {
  background: #5d8c2e;
  width: 10px;
  height: 10px;
}
.sch-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.sch-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--tt-text, #1a1a1a);
}
.sch-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #5d8c2e;
  color: #f4f1de;
  white-space: nowrap;
}
.sch-pts {
  font-size: 11px;
  font-weight: 700;
  color: #f59e0b;
}

/* 课外班汇总 */
.sch-summary {
  background: var(--tt-card, #fff);
  border-radius: 16px;
  padding: 14px;
  margin-top: 4px;
}
.sch-sum-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 10px;
}
.sch-sum-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sch-sum-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--tt-bg, #fafafa);
}
.sch-sum-emoji { font-size: 20px; }
.sch-sum-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--tt-text, #1a1a1a);
}
.sch-sum-when {
  font-size: 11px;
  color: var(--tt-muted, #9ca3af);
  flex: 1;
}
.sch-sum-pts {
  font-size: 12px;
  font-weight: 800;
  color: #f59e0b;
}
</style>
