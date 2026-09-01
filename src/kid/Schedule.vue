<template>
  <div class="sch-page">
    <h2 class="sch-title">📅 本周课表</h2>
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
      💡 今天上这些课，记得带好课本！
    </div>
    <div v-else-if="selectedDay === tomorrowWd" class="sch-tip sch-tip-tomorrow">
      🌙 明天的课表，今晚预习一下吧！
    </div>

    <!-- 科目网格 -->
    <div class="sch-grid">
      <div v-for="(subj, i) in todaySubjects" :key="i" class="sch-subj-card">
        <span class="sch-subj-icon">{{ subj.icon }}</span>
        <span class="sch-subj-name">{{ subj.name }}</span>
      </div>
    </div>

    <!-- 课外班 -->
    <div class="sch-extras">
      <h3 class="sch-extras-title">🎒 课外班</h3>
      <div class="sch-extras-grid">
        <div v-for="cls in extracurricular" :key="cls.name" class="sch-extra-card">
          <span class="sch-extra-emoji">{{ cls.emoji }}</span>
          <div class="sch-extra-info">
            <span class="sch-extra-name">{{ cls.name }}</span>
            <span class="sch-extra-when">{{ cls.when }}</span>
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

// 学校课表（纯科目，不含时间和课外班）
const SCHOOL_SUBJECTS = {
  1: [ // 周一
    { name: '晨读', icon: '📖' },
    { name: '语文', icon: '📝' },
    { name: '数学', icon: '🔢' },
    { name: '语文', icon: '📝' },
    { name: '音乐', icon: '🎵' },
    { name: '体育', icon: '⚽' },
    { name: '美术', icon: '🎨' },
    { name: '道法', icon: '📕' }
  ],
  2: [ // 周二
    { name: '晨读', icon: '📖' },
    { name: '数学', icon: '🔢' },
    { name: '语文', icon: '📝' },
    { name: '语文', icon: '📝' },
    { name: '科学', icon: '🔬' },
    { name: '语文', icon: '📝' },
    { name: '劳动', icon: '🧹' },
    { name: '数学', icon: '🔢' }
  ],
  3: [ // 周三
    { name: '晨读', icon: '📖' },
    { name: '语文', icon: '📝' },
    { name: '数学', icon: '🔢' },
    { name: '数学', icon: '🔢' },
    { name: '英语', icon: '🔤' },
    { name: '音乐', icon: '🎵' },
    { name: '体育', icon: '⚽' },
    { name: '语文', icon: '📝' }
  ],
  4: [ // 周四
    { name: '晨读', icon: '📖' },
    { name: '语文', icon: '📝' },
    { name: '数学', icon: '🔢' },
    { name: '数学', icon: '🔢' },
    { name: '语文', icon: '📝' },
    { name: '英语', icon: '🔤' },
    { name: '美术', icon: '🎨' },
    { name: '道法', icon: '📕' }
  ],
  5: [ // 周五
    { name: '晨读', icon: '📖' },
    { name: '语文', icon: '📝' },
    { name: '数学', icon: '🔢' },
    { name: '语文', icon: '📝' },
    { name: '科学', icon: '🔬' },
    { name: '体育', icon: '⚽' },
    { name: '语文', icon: '📝' },
    { name: '数学', icon: '🔢' }
  ],
  6: [ // 周六 — 课外班
    { name: '国象课 ♟️', icon: '♟️' },
    { name: '写字课 ✏️', icon: '🖊️' }
  ],
  7: [ // 周日 — 课外班
    { name: '实验课 🔬', icon: '🧪' },
    { name: '写字练习 ✏️', icon: '🖊️' }
  ]
}

const todaySubjects = computed(() => SCHOOL_SUBJECTS[selectedDay.value] || [])
</script>

<style scoped>
.sch-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.sch-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--tt-text, #1a1a1a);
  text-align: center;
}
.sch-subtitle {
  font-size: 12px;
  color: var(--tt-muted, #9ca3af);
  text-align: center;
  margin-top: -10px;
}

/* 提示 */
.sch-tip {
  text-align: center;
  font-size: 14px;
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

/* 星期 */
.sch-days { display: flex; gap: 6px; justify-content: center; }
.sch-day-btn {
  width: 46px; height: 46px; border-radius: 12px;
  border: 2px solid var(--tt-border, #e5e7eb);
  background: var(--tt-card, #fff);
  font-size: 13px; font-weight: 700;
  color: var(--tt-text, #1a1a1a);
  cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
}
.sch-day-btn.is-today { border-color: #f59e0b; }
.sch-day-btn.is-active { background: #f59e0b; color: #fff; border-color: #f59e0b; }
.sch-day-dot { font-size: 6px; color: #ef4444; }

/* 科目网格 */
.sch-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.sch-subj-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  border-radius: 12px;
  background: var(--tt-card, #fff);
  border: 1.5px solid var(--tt-border, #f0f0f0);
}
.sch-subj-icon { font-size: 28px; }
.sch-subj-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--tt-text, #1a1a1a);
  text-align: center;
}

/* 课外班 */
.sch-extras {
  background: var(--tt-card, #fff);
  border-radius: 16px;
  padding: 14px;
}
.sch-extras-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
}
.sch-extras-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sch-extra-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--tt-bg, #fafafa);
}
.sch-extra-emoji { font-size: 22px; }
.sch-extra-info { display: flex; flex-direction: column; gap: 2px; }
.sch-extra-name { font-size: 14px; font-weight: 700; color: var(--tt-text, #1a1a1a); }
.sch-extra-when { font-size: 11px; color: var(--tt-muted, #9ca3af); }
</style>
