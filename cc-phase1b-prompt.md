# Phase 1b — 新组件（voice.js + SpeechBubble + AllDoneEffect + HeroSection）

## 项目信息
- 绝对路径: `C:\Users\Windows\projects\pikachu-points`
- 技术栈: Vue 3 + Vite + Pinia + IndexedDB (idb)
- 设计文档: `D:\syncthing\obsidian-vault\团队\Agent配置\设计文档-皮卡丘工作台v4.md`

## 任务概述
新建 4 个文件，为 iPad 儿童端 v4 提供新能力。共 4 个新文件，0 个修改。

---

## 文件 1: `C:\Users\Windows\projects\pikachu-points\src\services\voice.js`

### 功能
TTS 语音鼓励服务，基于 Web Speech API (SpeechSynthesis)。零依赖，浏览器原生。

### 完整代码规格

```js
// voice.js — TTS 语音鼓励服务
// 使用 Web Speech API，零依赖

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

// 鼓励语库（中英文混合，6 岁孩子听得懂）
const ENCOURAGEMENTS = [
  '太棒了！', '真厉害！', '好样的！', '你做到了！', '超级棒！',
  '厉害了我的宝！', '你是小天才！', '完美！',
  '挖到钻石了！', '经验值加一！', '升级啦！', '获得成就！',
  '奥特曼为你骄傲！', '能量满满！', '战斗力提升！',
  'Excellent!', 'Amazing!', 'Super star!', 'You rock!',
  'Level up!', 'So cool!', 'Wonderful!'
]

const ALL_DONE = [
  '全部完成！你就是今天的超级英雄！',
  '太厉害了！所有任务都完成了！',
  '全勤达成！你是最棒的小朋友！',
  '恭喜通关！今天的表现一百分！',
  '完美全勤！奥特曼都为你鼓掌！',
  'All tasks done! You are incredible!'
]

// 已说过的语句索引（避免连续重复）
let _lastIdx = -1
let _lastAllDoneIdx = -1

function pickRandom(arr, excludeIdx) {
  if (arr.length === 0) return { text: '', idx: -1 }
  if (arr.length === 1) return { text: arr[0], idx: 0 }
  let idx
  do {
    idx = Math.floor(Math.random() * arr.length)
  } while (idx === excludeIdx)
  return { text: arr[idx], idx }
}

function speak(text) {
  if (!synth || !text) return
  synth.cancel() // 取消上一条，防止语音叠加
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 1.1    // 稍快，孩子注意力短
  utter.pitch = 1.3   // 稍高音，更活泼
  utter.volume = 1.0
  synth.speak(utter)
}

// 预热引擎（首次用户交互时调用，解锁 iOS Safari）
export function warmUpVoice() {
  if (!synth) return
  // Safari 需要先 utter 一个空串来解锁
  const utter = new SpeechSynthesisUtterance('')
  utter.volume = 0
  synth.speak(utter)
}

// 打卡鼓励：随机选一条，返回文字（供气泡显示）
export function speakEncouragement() {
  const { text, idx } = pickRandom(ENCOURAGEMENTS, _lastIdx)
  _lastIdx = idx
  speak(text)
  return text
}

// 全勤鼓励：随机选全勤语，返回文字
export function speakAllDone() {
  const { text, idx } = pickRandom(ALL_DONE, _lastAllDoneIdx)
  _lastAllDoneIdx = idx
  speak(text)
  return text
}

// 播报自定义文字
export function speakText(text) {
  speak(text)
}
```

### 要求
- 导出 4 个函数：`warmUpVoice`, `speakEncouragement`, `speakAllDone`, `speakText`
- `speakEncouragement` 和 `speakAllDone` 返回 string（实际播报的文字）
- 不要引入任何 npm 依赖
- 不要修改 `sound.js`（两套系统并行）

---

## 文件 2: `C:\Users\Windows\projects\pikachu-points\src\components\SpeechBubble.vue`

### 功能
角色说话气泡组件。打卡成功后屏幕顶部弹出白底气泡，2 秒后自动消失。

### Props
```js
defineProps({
  text: { type: String, default: '' },
  emoji: { type: String, default: '⭐' },
  trigger: { type: Number, default: 0 },  // 变化时显示
  duration: { type: Number, default: 2000 } // 显示时长 ms
})
```

### 模板结构
```html
<template>
  <Teleport to="body">
    <Transition name="bubble">
      <div v-if="visible" class="speech-bubble">
        <span class="sb-emoji">{{ emoji }}</span>
        <span class="sb-text">{{ text }}</span>
        <div class="sb-tail"></div>
      </div>
    </Transition>
  </Teleport>
</template>
```

### 样式规格（全局样式，不用 scoped，因为 Teleport 到 body）
```css
.speech-bubble {
  position: fixed;
  top: 12%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: #ffffff;
  border: 3px solid #ffb627;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(255, 183, 39, 0.25);
  font-family: 'DM Sans', system-ui, sans-serif;
  pointer-events: none;
}
.sb-emoji { font-size: 36px; line-height: 1; }
.sb-text { font-size: 22px; font-weight: 700; color: #222; white-space: nowrap; }
.sb-tail {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 12px solid #ffb627;
}

/* 进退场动画 */
.bubble-enter-active { animation: bubble-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1); }
.bubble-leave-active { animation: bubble-out 300ms ease-in; }
@keyframes bubble-in {
  0% { opacity: 0; transform: translateX(-50%) scale(0.3) translateY(20px); }
  100% { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
}
@keyframes bubble-out {
  0% { opacity: 1; transform: translateX(-50%) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) scale(0.8) translateY(-10px); }
}
```

### 逻辑
- watch `trigger`：变化时设 `visible = true`，`duration` ms 后设 `visible = false`
- 组件内管理 visible 状态，外部只管传 trigger 值

---

## 文件 3: `C:\Users\Windows\projects\pikachu-points\src\components\AllDoneEffect.vue`

### 功能
全勤庆祝动画。当天所有任务完成时全屏弹出，5 秒后可点击关闭。

### Props
```js
defineProps({
  show: { type: Boolean, default: false },
  totalEarned: { type: Number, default: 0 } // 今日获得总积分
})
defineEmits(['close'])
```

### 模板结构
```html
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
```

### 样式规格
```css
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
  background: hsl(calc(var(--i) * 36), 90%, 60%);
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
```

### 逻辑
- `particleStyle(i)` 函数：为每个粒子生成随机方向和颜色
  ```js
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
  ```
- `onClose()` emit close 事件

---

## 文件 4: `C:\Users\Windows\projects\pikachu-points\src\components\HeroSection.vue`

### 功能
iPad 横版页面顶部英雄区。显示日期、总积分、今日已获、连续天数、等级标签、等级进度条。

### Props
```js
defineProps({
  date: { type: String, required: true },        // '2026-09-18'
  totalPoints: { type: Number, default: 0 },
  todayEarned: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  level: { type: Number, default: 1 },            // 1-5
  levelLabel: { type: String, default: '' },       // '奥特曼 Lv.3'
  levelProgress: { type: Number, default: 0 },     // 0-100 百分比
  levelNextDays: { type: String, default: '' }     // '差 2 天升级'
})
```

### 模板结构
```html
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
    <!-- 等级进度条 -->
    <div class="hero-progress" v-if="levelProgress > 0">
      <div class="hero-progress-bar">
        <div class="hero-progress-fill" :style="{ width: levelProgress + '%' }"></div>
      </div>
      <span class="hero-progress-text">{{ levelNextDays }}</span>
    </div>
  </header>
</template>
```

### 计算属性（script setup 内）
```js
import { computed } from 'vue'
import { WEEKDAYS } from '../utils/weekday.js'

const props = defineProps({ /* 如上 */ })

const wdLabel = computed(() => {
  const [y, m, d] = props.date.split('-').map(Number)
  const wd = new Date(y, m - 1, d).getDay() // 0=Sun
  const mapped = wd === 0 ? 7 : wd // 1=Mon...7=Sun
  const info = WEEKDAYS.find((w) => w.n === mapped) || WEEKDAYS[0]
  return info.short
})

const mdLabel = computed(() => {
  const [, m, d] = props.date.split('-')
  return `${Number(m)}.${Number(d)}`
})

const totalPointsText = computed(() => props.totalPoints.toLocaleString('en-US'))
```

### 样式规格
```css
.hero {
  display: flex; align-items: stretch; gap: 14px;
  padding: 20px 20px 12px; flex-wrap: wrap;
}
.hero-chip {
  flex: 1; min-width: 160px;
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-radius: 24px;
  background: #ffffff; border: 2px solid #ffd97a;
  box-shadow: rgba(255,183,39,0.12) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 6px 18px;
}
.hero-icon { font-size: 34px; line-height: 1; flex: 0 0 auto; }
.hero-col { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hero-label { font-size: 19px; font-weight: 800; color: #8a7a5a; letter-spacing: 0.2px; }
.hero-sub { font-size: 24px; font-weight: 900; color: #222; line-height: 1.1; }
.hero-num { font-size: 28px; font-weight: 900; color: #ea580c; line-height: 1.1; font-variant-numeric: tabular-nums; }
.hero-today { font-size: 16px; font-weight: 700; color: #fff; background: linear-gradient(135deg,#ffb627,#ff8a00); padding: 4px 12px; border-radius: 999px; margin-top: 4px; }
.hero-level { font-size: 15px; font-weight: 700; color: #8a7a5a; }
.hero-points { background: linear-gradient(135deg,#ffb627,#ff8a00); border-color: #fff3c4; }
.hero-points .hero-label, .hero-points .hero-num, .hero-points .hero-today { color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.12); }
.hero-today { background: rgba(255,255,255,0.25) !important; }

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
```

---

## 禁止清单
- **不要**修改任何现有文件
- **不要**引入任何 npm 新依赖
- **不要**修改 `main.js` / `router.js` / `App.vue`
- **不要**修改 `sound.js`（voice.js 是独立模块）
- **不要**修改 `db.js` / `points.js`（Phase 1a 已处理）
- **不要**在组件中引入 `voice.js`（Phase 1c 集成）

## 验证清单
修改完成后运行:
1. `cd C:\Users\Windows\projects\pikachu-points && npm run build` — 构建成功无报错
2. `ls -la src/services/voice.js src/components/SpeechBubble.vue src/components/AllDoneEffect.vue src/components/HeroSection.vue` — 4 个文件都存在
3. `grep -c "speakEncouragement" dist/assets/index-*.js` — 结果 > 0
4. `grep -c "speech-bubble" dist/assets/index-*.js` — 结果 > 0
5. `grep -c "ad-overlay" dist/assets/index-*.js` — 结果 > 0
6. `grep -c "hero-chip" dist/assets/index-*.js` — 结果 > 0
