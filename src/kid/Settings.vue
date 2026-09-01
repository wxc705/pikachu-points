<template>
  <div class="set-page">
    <!-- 主题选择 -->
    <section class="set-section">
      <h2 class="set-title">🎨 选择主题</h2>
      <div class="set-themes">
        <button
          v-for="t in themes"
          :key="t.id"
          class="set-theme-card"
          :class="{ 'is-active': currentTheme === t.id }"
          @click="pickTheme(t.id)"
        >
          <span class="set-theme-emoji">{{ t.emoji }}</span>
          <span class="set-theme-name">{{ t.name }}</span>
          <span class="set-theme-desc">{{ t.description }}</span>
          <!-- 色条预览 -->
          <div class="set-theme-colors">
            <span class="set-color-dot" :style="{ background: t.colors.primary }"></span>
            <span class="set-color-dot" :style="{ background: t.colors.secondary }"></span>
            <span class="set-color-dot" :style="{ background: t.colors.accent }"></span>
          </div>
        </button>
      </div>
    </section>

    <!-- 返回家长端 -->
    <section class="set-section">
      <a class="set-link" href="#/">👨‍👩‍👧 返回家长端</a>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { THEMES, getTheme } from '../themes/index.js'
import { applyTheme } from '../stores/points.js'

const STORAGE_KEY = 'pikachu-points:theme-id'
const currentTheme = ref(localStorage.getItem(STORAGE_KEY) || 'ultraman')
const themes = THEMES

function pickTheme(id) {
  currentTheme.value = id
  localStorage.setItem(STORAGE_KEY, id)
  applyTheme(getTheme(id))
}
</script>

<style scoped>
.set-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.set-section {
  background: var(--tt-card, #fff);
  border-radius: 20px;
  padding: 16px;
}
.set-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--tt-text, #1a1a1a);
  margin-bottom: 12px;
}
.set-themes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.set-theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 10px;
  border-radius: 16px;
  border: 3px solid transparent;
  background: var(--tt-bg, #fafafa);
  cursor: pointer;
  transition: all 0.2s;
}
.set-theme-card:active {
  transform: scale(0.96);
}
.set-theme-card.is-active {
  border-color: var(--tt-primary, #facc15);
  background: var(--tt-bg-active, #fef9c3);
  box-shadow: 0 0 0 2px var(--tt-primary, #facc15);
}
.set-theme-emoji {
  font-size: 36px;
  line-height: 1;
}
.set-theme-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--tt-text, #1a1a1a);
}
.set-theme-desc {
  font-size: 10px;
  color: var(--tt-muted, #9ca3af);
  text-align: center;
  line-height: 1.2;
}
.set-theme-colors {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.set-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid rgba(0,0,0,0.1);
}
.set-link {
  display: block;
  text-align: center;
  padding: 14px;
  font-size: 16px;
  font-weight: 700;
  color: var(--tt-primary, #facc15);
  text-decoration: none;
  border-radius: 12px;
  background: var(--tt-bg, #fafafa);
}
</style>
