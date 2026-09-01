<template>
  <div class="sch-page">
    <h2 class="sch-title">🏫 本周课表</h2>
    <p class="sch-subtitle">和畅实验小学 一年级(10)班</p>

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

    <!-- 今日提示 -->
    <div v-if="selectedDay === todayWd" class="sch-tip">
      💡 今天上这些课，记得带好课本哦！
    </div>
    <div v-else-if="selectedDay === tomorrowWd" class="sch-tip sch-tip-tomorrow">
      🌙 明天的课表，今晚预习一下吧！
    </div>

    <!-- 课表内容 -->
    <div class="sch-timeline">
      <div
        v-for="(item, i) in todaySchedule"
        :key="i"
        class="sch-row"
        :class="{
          'is-now': item.isNow,
          'is-break': item.isBreak,
          'is-prepare': item.isPrepare
        }"
      >
        <div class="sch-time">{{ item.time }}</div>
        <div class="sch-dot" :class="{ 'dot-class': item.isMain, 'dot-break': item.isBreak }"></div>
        <div class="sch-content">
          <span class="sch-icon" :class="'sch-icon-' + item.type">{{ item.icon }}</span>
          <div class="sch-text">
            <span class="sch-name">{{ item.name }}</span>
            <span v-if="item.tip" class="sch-tip-text">{{ item.tip }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 课外班汇总 -->
    <div class="sch-summary">
      <h3 class="sch-sum-title">🎒 课外班</h3>
      <div class="sch-sum-grid">
        <div v-for="cls in extracurricular" :key="cls.name" class="sch-sum-card">
          <span class="sch-sum-emoji">{{ cls.emoji }}</span>
          <div class="sch-sum-info">
            <span class="sch-sum-name">{{ cls.name }}</span>
            <span class="sch-sum-when">{{ cls.when }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { dateToWeekday, WEEKDAYS } from '../utils/weekday.js'

const todayWd = dateToWeekday()
const tomorrowWd = todayWd >= 7 ? 1 : todayWd + 1
const selectedDay = ref(todayWd)
const weekDays = WEEKDAYS

// 课外班
const extracurricular = [
  { name: '写字课', emoji: '✏️', when: '周二/周四 18:00-19:00' },
  { name: '体能课', emoji: '💪', when: '周五 17:00-18:00' },
  { name: '国象课', emoji: '♟️', when: '周六 9:30-11:20' }
]

// 学校课表（每天的课程安排）
const SCHOOL_SCHEDULE = {
  1: [ // 周一
    { time: '8:20', name: '晨读', icon: '📖', type: 'routine' },
    { time: '8:30', name: '语文', icon: '📝', type: 'main', tip: '带语文书+练习册' },
    { time: '9:15', name: '数学', icon: '🔢', type: 'main', tip: '带数学书' },
    { time: '10:00', name: '课间操', icon: '🏃', type: 'break' },
    { time: '10:20', name: '语文', icon: '📝', type: 'main' },
    { time: '11:00', name: '音乐', icon: '🎵', type: 'main', tip: '带音乐书' },
    { time: '11:40', name: '午餐', icon: '🍚', type: 'break' },
    { time: '12:20', name: '多邻国', icon: '🔤', type: 'prepare', tip: '午间10分钟' },
    { time: '12:30', name: '午休', icon: '😴', type: 'break' },
    { time: '13:30', name: '体育', icon: '⚽', type: 'main', tip: '穿运动鞋' },
    { time: '14:15', name: '美术', icon: '🎨', type: 'main', tip: '带彩笔' },
    { time: '15:00', name: '道法', icon: '📖', type: 'main' },
    { time: '15:20', name: '国象练习', icon: '♟️', type: 'prepare', tip: '教室里练' },
    { time: '15:40', name: '延时服务', icon: '📚', type: 'break', tip: '做作业' },
    { time: '17:30', name: '放学', icon: '🏠', type: 'break' }
  ],
  2: [ // 周二
    { time: '8:20', name: '晨读', icon: '📖', type: 'routine' },
    { time: '8:30', name: '数学', icon: '🔢', type: 'main', tip: '带数学书+口算本' },
    { time: '9:15', name: '语文', icon: '📝', type: 'main', tip: '带语文书' },
    { time: '10:00', name: '课间操', icon: '🏃', type: 'break' },
    { time: '10:20', name: '语文', icon: '📝', type: 'main' },
    { time: '11:00', name: '科学', icon: '🔬', type: 'main', tip: '带科学材料' },
    { time: '11:40', name: '午餐', icon: '🍚', type: 'break' },
    { time: '12:20', name: '多邻国', icon: '🔤', type: 'prepare', tip: '午间10分钟' },
    { time: '12:30', name: '午休', icon: '😴', type: 'break' },
    { time: '13:30', name: '语文', icon: '📝', type: 'main' },
    { time: '14:15', name: '劳动', icon: '🧹', type: 'main', tip: '值日' },
    { time: '15:00', name: '数学', icon: '🔢', type: 'main' },
    { time: '15:20', name: '国象练习', icon: '♟️', type: 'prepare' },
    { time: '15:40', name: '延时服务', icon: '📚', type: 'break', tip: '做作业' },
    { time: '17:30', name: '放学', icon: '🏠', type: 'break' },
    { time: '18:00', name: '✏️ 写字课', icon: '🖊️', type: 'extra', tip: '课外班·带字帖' }
  ],
  3: [ // 周三
    { time: '8:20', name: '晨读', icon: '📖', type: 'routine' },
    { time: '8:30', name: '语文', icon: '📝', type: 'main', tip: '带语文书+生字本' },
    { time: '9:15', name: '数学', icon: '🔢', type: 'main' },
    { time: '10:00', name: '课间操', icon: '🏃', type: 'break' },
    { time: '10:20', name: '数学', icon: '🔢', type: 'main' },
    { time: '11:00', name: '英语', icon: '🔤', type: 'main', tip: '带英语书' },
    { time: '11:40', name: '午餐', icon: '🍚', type: 'break' },
    { time: '12:20', name: '多邻国', icon: '🔤', type: 'prepare', tip: '午间10分钟' },
    { time: '12:30', name: '午休', icon: '😴', type: 'break' },
    { time: '13:30', name: '音乐', icon: '🎵', type: 'main' },
    { time: '14:15', name: '体育', icon: '⚽', type: 'main', tip: '穿运动鞋' },
    { time: '15:00', name: '语文', icon: '📝', type: 'main' },
    { time: '15:20', name: '国象练习', icon: '♟️', type: 'prepare' },
    { time: '15:40', name: '延时服务', icon: '📚', type: 'break', tip: '做作业' },
    { time: '17:30', name: '放学', icon: '🏠', type: 'break' }
  ],
  4: [ // 周四
    { time: '8:20', name: '晨读', icon: '📖', type: 'routine' },
    { time: '8:30', name: '语文', icon: '📝', type: 'main', tip: '带语文书' },
    { time: '9:15', name: '数学', icon: '🔢', type: 'main' },
    { time: '10:00', name: '课间操', icon: '🏃', type: 'break' },
    { time: '10:20', name: '数学', icon: '🔢', type: 'main', tip: '带口算本' },
    { time: '11:00', name: '语文', icon: '📝', type: 'main' },
    { time: '11:40', name: '午餐', icon: '🍚', type: 'break' },
    { time: '12:20', name: '多邻国', icon: '🔤', type: 'prepare', tip: '午间10分钟' },
    { time: '12:30', name: '午休', icon: '😴', type: 'break' },
    { time: '13:30', name: '英语', icon: '🔤', type: 'main', tip: '带英语书' },
    { time: '14:15', name: '美术', icon: '🎨', type: 'main' },
    { time: '15:00', name: '道法', icon: '📖', type: 'main' },
    { time: '15:20', name: '国象练习', icon: '♟️', type: 'prepare' },
    { time: '15:40', name: '延时服务', icon: '📚', type: 'break', tip: '做作业' },
    { time: '17:30', name: '放学', icon: '🏠', type: 'break' },
    { time: '18:00', name: '✏️ 写字课', icon: '🖊️', type: 'extra', tip: '课外班·带字帖' }
  ],
  5: [ // 周五
    { time: '8:20', name: '晨读', icon: '📖', type: 'routine' },
    { time: '8:30', name: '语文', icon: '📝', type: 'main', tip: '带语文书' },
    { time: '9:15', name: '数学', icon: '🔢', type: 'main' },
    { time: '10:00', name: '课间操', icon: '🏃', type: 'break' },
    { time: '10:20', name: '语文', icon: '📝', type: 'main' },
    { time: '11:00', name: '科学', icon: '🔬', type: 'main' },
    { time: '11:40', name: '午餐', icon: '🍚', type: 'break' },
    { time: '12:20', name: '多邻国', icon: '🔤', type: 'prepare', tip: '午间10分钟' },
    { time: '12:30', name: '午休', icon: '😴', type: 'break' },
    { time: '13:30', name: '体育', icon: '⚽', type: 'main', tip: '穿运动鞋' },
    { time: '14:15', name: '语文', icon: '📝', type: 'main' },
    { time: '15:00', name: '数学', icon: '🔢', type: 'main' },
    { time: '15:20', name: '国象练习', icon: '♟️', type: 'prepare' },
    { time: '15:40', name: '延时服务', icon: '📚', type: 'break', tip: '做作业' },
    { time: '17:30', name: '放学', icon: '🏠', type: 'break' },
    { time: '17:30', name: '💪 体能课', icon: '🏋️', type: 'extra', tip: '课外班·穿运动服' }
  ],
  6: [ // 周六 — 不上学，课外班
    { time: '9:30', name: '♟️ 国象课', icon: '♟️', type: 'extra', tip: '课外班·带棋盘' },
    { time: '11:30', name: '回家', icon: '🏠', type: 'break' },
    { time: '13:00', name: '语文阅读', icon: '📖', type: 'prepare', tip: '在家阅读' },
    { time: '15:00', name: '思维/英语', icon: '🧠', type: 'prepare' },
    { time: '16:00', name: '亲子活动', icon: '👨‍👦', type: 'break' }
  ],
  7: [ // 周日 — 不上学，课外班
    { time: '9:30', name: '多邻国', icon: '🔤', type: 'prepare' },
    { time: '10:30', name: '写字练习', icon: '✏️', type: 'prepare' },
    { time: '14:00', name: '🔬 实验课', icon: '🧪', type: 'extra', tip: '课外班·带材料' },
    { time: '16:00', name: '亲子活动', icon: '👨‍👦', type: 'break' }
  ]
}

function parseTime(str) {
  if (!str) return 0
  const [h, m] = str.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const todaySchedule = computed(() => {
  const items = SCHOOL_SCHEDULE[selectedDay.value] || []
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return items.map((item, i) => {
    const t = parseTime(item.time)
    const nextItem = items[i + 1]
    const endMin = nextItem ? parseTime(nextItem.time) : t + 45
    return {
      ...item,
      isNow: nowMin >= t && nowMin < endMin
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

/* 今日提示 */
.sch-tip {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #059669;
  background: #ecfdf5;
  padding: 8px 12px;
  border-radius: 10px;
}
.sch-tip-tomorrow {
  color: #7c3aed;
  background: #f5f3ff;
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
}
.sch-day-btn.is-today { border-color: #f59e0b; }
.sch-day-btn.is-active {
  background: #f59e0b;
  color: #fff;
  border-color: #f59e0b;
}
.sch-day-dot { font-size: 6px; color: #ef4444; }

/* 时间线 */
.sch-timeline { display: flex; flex-direction: column; gap: 0; padding: 0 8px; }
.sch-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid var(--tt-border, #f0f0f0);
}
.sch-row.is-now {
  background: rgba(245, 158, 11, 0.12);
  border-radius: 8px; padding: 10px 8px;
  box-shadow: inset 3px 0 0 #f59e0b;
}
.sch-row.is-extra {
  background: rgba(93, 140, 46, 0.08);
}
.sch-time {
  width: 48px; font-size: 12px; font-weight: 600;
  color: var(--tt-muted, #9ca3af); text-align: right; flex-shrink: 0;
}
.sch-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--tt-border, #d1d5db); flex-shrink: 0;
}
.sch-dot.dot-class { background: #3b82f6; }
.sch-dot.dot-break { background: #d1d5db; }
.sch-content {
  display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;
}
.sch-icon { font-size: 20px; flex-shrink: 0; }
.sch-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sch-name {
  font-size: 15px; font-weight: 700; color: var(--tt-text, #1a1a1a);
}
.sch-tip-text {
  font-size: 11px; color: #f59e0b; font-weight: 600;
}

/* 课外班汇总 */
.sch-summary {
  background: var(--tt-card, #fff); border-radius: 16px; padding: 14px; margin-top: 4px;
}
.sch-sum-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
.sch-sum-grid { display: flex; flex-direction: column; gap: 8px; }
.sch-sum-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px; background: var(--tt-bg, #fafafa);
}
.sch-sum-emoji { font-size: 22px; }
.sch-sum-info { display: flex; flex-direction: column; gap: 2px; }
.sch-sum-name { font-size: 13px; font-weight: 700; color: var(--tt-text, #1a1a1a); }
.sch-sum-when { font-size: 11px; color: var(--tt-muted, #9ca3af); }
</style>
