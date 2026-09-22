# Phase 4 — 遗留三项收尾（变身动画 + 导入时间表 + tab细化）

## 项目信息
- 绝对路径: `C:\Users\Windows\projects\pikachu-points`
- 技术栈: Vue 3 + Vite + Pinia + IndexedDB (idb)
- 当前状态: V2设计稿对齐已完成（侧栏/XP进度条/时间条/玻璃卡片/徽章），本phase补三个遗留项
- 主文件: `src/kid/TodayTasks.vue`（约917+行，含 template + script + scoped style）
- 参考设计稿: `C:\Users\Windows\Desktop\v2-final-v4.html`（先读它对齐视觉语言）

## 重要纪律
- **用 bash 执行命令，NOT PowerShell**（CC在Windows上跑PowerShell的npm命令会死循环）
- 只改 `src/kid/TodayTasks.vue`，最多再改 `src/kid/v2-style.css`
- **不要**修改 db.js / points.js / router.js / KidHome.vue / ParentDashboard.vue / HeroSection.vue / voice.js
- 不新建文件、不加npm依赖
- 不改打卡/积分的业务逻辑

---

## 任务1: 变身动画（XP条满 → 触发占位动画）

上个session的遗留意见："变身动画触发（XP 条满 → 播放 GIF 占位），QC后续给素材替换"。

实现：
1. 在 TodayTasks.vue 的 script 中 watch `levelProgress`（XP进度，0-100）：当它**跨过100**或**等级ultramanLevel提升**时，触发变身动画
2. 新状态 `showMorph = ref(false)`，弹出全屏遮罩占位组件（内联在TodayTasks，不新建文件）：
   - 黑色半透明遮罩 + 居中大 emoji（🔥→🦸）脉冲缩放动画
   - 文字 `{{ levelLabel }} 变身！`
   - 3秒后自动关闭，或点击关闭
   - CSS动画占位，注释写明 `<!-- TODO: QC提供变身GIF后替换此占位 -->`
3. 同时在语音上：变身触发时调用 `speakText('变身！' + levelLabel)`（voice.js 已有 speakText 导出，先确认再用）
4. **注意**：等级提升只在每天streak变化时发生，测试时可以临时把触发改成"点击XP进度条也触发"方便验收（保留该调试入口，注释标明）

## 任务2: 导入本周时间表按钮（设置/时间线 tab 内）

设计稿底部有：
```html
<button class="btn-import">📥 导入本周时间表</button>
```
（边框虚线、浅紫底、居中，样式见设计稿 .btn-import）

实现：
1. 在设置tab的时间线区域底部加该按钮
2. 点击行为：调用已有的种子导入逻辑——store 里已有 `seedWeeklyTasksIfEmpty()`（空时导入）。改为支持**强制重新导入**：先检查 store 是否已有类似方法（如 `reseedWeeklyTasks`），若无，在**不改 points.js** 的前提下，于 TodayTasks.vue 内直接用已导入的 store 方法组合实现；如果必须改 points.js 才能做，**跳过该改动并在最终输出中说明**（这点由验收判断，别硬改）
3. 导入成功后提示 `✅ 本周时间表已导入`（用现有 wishMsg/hwMsg 同款的提示模式）

## 任务3: 商城/基地/设置 三个tab的V2风格细化

对照设计稿视觉语言检查这三个tab的现有样式并补齐：
- **商城(tt-mall)**: 卡片要有 `backdrop-filter:blur(8px)` 玻璃效果 + `border:2px solid #e0e7ff` + hover上浮；兑换按钮用 `.btn-go` 同款半透明软糖渐变
- **基地(成就墙tt-achieve)**: 徽章格子要有玻璃底 + 锁定态降饱和；解锁徽章hover放大
- **设置/时间线**: `settings-card` 风格（白底85%透明 + blur + border #e0e7ff），时间行的当前时段高亮绿色 `#059669`
- 底部/侧栏tab激活态：白字 + `background:rgba(255,255,255,.15)`

---

## 验证清单（必须全部执行并贴结果）
1. `cd C:\Users\Windows\projects\pikachu-points && npm run build` — 成功
2. `grep -c "showMorph" src/kid/TodayTasks.vue` > 0
3. `grep -c "btn-import\|导入本周" src/kid/TodayTasks.vue` > 0
4. `grep -c "backdrop-filter" src/kid/TodayTasks.vue` 数量比改动前增加
5. **用 bash** 截图验证（PowerShell会挂）：
   `chrome="C:/Users/Windows/AppData/Local/Google/Chrome/Application/chrome.exe"; "$chrome" --headless=new --disable-gpu --no-sandbox --virtual-time-budget=15000 --screenshot="$LOCALAPPDATA/Temp/screens/phase4.png" --window-size=1280,800 "http://localhost:5173/#/kid/today"`
   （dev server 已在5173运行；若端口是5174/5175先 `netstat -ano | grep LISTENING | grep 517` 确认）
6. 不要 git commit/push（由我统一提交）
