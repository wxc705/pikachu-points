# Phase 2 — 积分商城 + 成就墙 script 逻辑 + CSS

## 项目信息
- 绝对路径: `C:\Users\Windows\projects\pikachu-points`
- 技术栈: Vue 3 + Vite + Pinia + IndexedDB (idb)
- 当前状态: 模板已写好，需要补 script 逻辑 + CSS 样式

## 任务概述
在 `src/kid/TodayTasks.vue` 中补充积分商城和成就墙的 script 逻辑 + scoped CSS。

---

## 文件: `C:\Users\Windows\projects\pikachu-points\src\kid\TodayTasks.vue`

### 改动 1: 在 script 中添加商城 computed + 方法

在 `selectedAchievement` ref 之后、`nowToMinutes` 函数之前，添加：

```js
// v4: 积分商城 — 奖品列表（projects 表中 category='兑换' 的项目）
const rewards = computed(() => {
  return store.projects.filter((p) => p.category === '兑换' && p.isActive !== false)
})

function canAfford(reward) {
  return store.totalPoints >= (reward.points || 0)
}

async function tapReward(reward) {
  if (!canAfford(reward)) {
    wishMsg.value = `还差 ${reward.points - store.totalPoints} 分，继续努力！`
    setTimeout(() => { wishMsg.value = '' }, 3000)
    return
  }
  try {
    await store.addRequest(reward.name, reward.points, '商城兑换')
    wishMsg.value = `✅ 已提交「${reward.name}」兑换申请`
    setTimeout(() => { wishMsg.value = '' }, 3000)
  } catch (e) {
    wishMsg.value = '❌ 提交失败'
  }
}

async function submitWish() {
  const text = wishText.value.trim()
  if (!text) return
  wishSaving.value = true
  try {
    await store.addRequest(text, 0, '自定义愿望')
    wishMsg.value = `✅ 愿望「${text}」已提交`
    wishText.value = ''
    showWishInput.value = false
    setTimeout(() => { wishMsg.value = '' }, 3000)
  } catch (e) {
    wishMsg.value = '❌ 提交失败'
  } finally {
    wishSaving.value = false
  }
}
```

### 改动 2: 在 `<style scoped>` 中添加商城 + 成就墙 + 设置 CSS

在现有 scoped style 的末尾（`@keyframes tt-flicker` 之后、`</style>` 之前）添加：

```css
/* ============================================================
   v4: 积分商城
   ============================================================ */
.tt-mall {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tt-mall-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tt-mall-balance {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  box-shadow: rgba(255, 138, 0, 0.3) 0px 3px 8px;
}
.tt-mall-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tt-mall-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 20px;
  background: #ffffff;
  border: 2px solid #ffd97a;
  box-shadow: rgba(0, 0, 0, 0.04) 0px 2px 6px, rgba(0, 0, 0, 0.08) 0px 4px 12px;
  transition: transform 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.tt-mall-card:active {
  transform: scale(0.97);
}
.tt-mall-card.is-expensive {
  opacity: 0.7;
  border-color: #e5e7eb;
}
.tt-mall-emoji {
  font-size: 36px;
  line-height: 1;
  flex: 0 0 auto;
}
.tt-mall-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.tt-mall-name {
  font-size: 20px;
  font-weight: 700;
  color: #222;
}
.tt-mall-cost {
  font-size: 16px;
  font-weight: 600;
  color: #8a7a5a;
}
.tt-mall-status {
  flex: 0 0 auto;
}
.tt-mall-yes {
  font-size: 16px;
  font-weight: 700;
  color: #16a34a;
}
.tt-mall-no {
  font-size: 16px;
  font-weight: 700;
  color: #ea580c;
}
.tt-mall-wish {
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  border: 2px dashed #ffd97a;
  background: transparent;
  font-size: 18px;
  font-weight: 700;
  color: #8a7a5a;
  cursor: pointer;
  transition: background 0.15s;
}
.tt-mall-wish:active {
  background: rgba(255, 217, 122, 0.2);
}
.tt-wish-form {
  display: flex;
  gap: 8px;
}
.tt-wish-input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid #ffd97a;
  font-size: 18px;
  font-weight: 600;
  outline: none;
  background: #fff;
}
.tt-wish-input:focus {
  border-color: #ffb627;
}
.tt-wish-btn {
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ffb627, #ff8a00);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}
.tt-wish-btn:disabled {
  opacity: 0.4;
}
.tt-wish-msg {
  text-align: center;
  font-size: 16px;
  font-weight: 700;
}
.tt-wish-msg.is-ok { color: #16a34a; }
.tt-wish-msg.is-err { color: #dc2626; }

/* ============================================================
   v4: 成就墙
   ============================================================ */
.tt-achieve {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tt-achieve-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tt-achieve-count {
  font-size: 18px;
  font-weight: 800;
  color: #ea580c;
}
.tt-achieve-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 12px;
}
.tt-achieve-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 16px;
  background: linear-gradient(160deg, #fff9ec, #fff3dd);
  border: 2px solid #ffd97a;
  box-shadow: rgba(255, 183, 39, 0.12) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px;
  cursor: pointer;
  transition: transform 0.15s;
}
.tt-achieve-badge:active {
  transform: scale(0.95);
}
.tt-achieve-badge.is-locked {
  background: #f3f4f6;
  border-color: #e5e7eb;
  opacity: 0.6;
}
.tt-achieve-emoji {
  font-size: 32px;
  line-height: 1;
}
.tt-achieve-name {
  font-size: 12px;
  font-weight: 700;
  color: #666;
  text-align: center;
  line-height: 1.2;
}

/* ============================================================
   v4: 设置入口
   ============================================================ */
.tt-settings {
  margin-top: 24px;
  text-align: center;
}
.tt-settings-link {
  display: inline-block;
  padding: 12px 32px;
  border-radius: 16px;
  background: #f3f4f6;
  color: #666;
  font-size: 18px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s;
}
.tt-settings-link:active {
  background: #e5e7eb;
}
```

---

## 禁止清单
- **不要**修改 `db.js` / `points.js` / `router.js` / `App.vue` / `main.js`
- **不要**修改 `KidHome.vue` / `ParentDashboard.vue`
- **不要**修改 `voice.js` / `SpeechBubble.vue` / `AllDoneEffect.vue` / `HeroSection.vue`
- **不要**新建任何文件
- **不要**引入任何 npm 新依赖
- **不要**改动已有的 scoped CSS 规则（只追加新的）

## 验证清单
1. `cd C:\Users\Windows\projects\pikachu-points && npm run build` — 构建成功
2. `grep -c "tt-mall" dist/assets/index-*.js` — 结果 > 0
3. `grep -c "tt-achieve" dist/assets/index-*.js` — 结果 > 0
4. `grep -c "积分商城" dist/assets/index-*.js` — 结果 > 0
5. `grep -c "我的成就" dist/assets/index-*.js` — 结果 > 0
