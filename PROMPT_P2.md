Workdir: C:\Users\Windows\projects\pikachu-points

P0 + P1 done. Read these to understand current state:
- src/views/Exchange.vue
- src/views/Home.vue
- src/stores/points.js
- src/components/CoinBurst.vue (style reference)

P2 SCOPE — implement exactly 2 things:
A) Ultraman transformation effect on successful exchange approval
B) Milestone celebration overlay when total points cross 100 / 500 / 1000 / 5000

ABSOLUTE FILE SCOPE — edit ONLY these files, nothing else:
1. src/components/UltramanEffect.vue   (NEW — full-screen overlay with silhouette + rays + "兑换成功！")
2. src/components/MilestoneEffect.vue  (NEW — full-screen overlay with medal emoji + points + text)
3. src/views/Exchange.vue                (trigger UltramanEffect when approve)
4. src/stores/points.js                  (add milestone tracking + watcher)
5. src/App.vue                          (mount MilestoneEffect at root with show/hide)

DO NOT create other files. DO NOT touch package.json, vite.config.js, tailwind.config.js, postcss.config.js, index.html, src/main.js, src/router.js, src/services/*.js, src/style.css, src/views/Home.vue, src/views/Checkin.vue, src/views/History.vue, src/views/Rating.vue, src/components/CoinBurst.vue. DO NOT run npm install / build / dev.

DETAILS:

A) UltramanEffect.vue:
- Teleport to body, full screen overlay (fixed inset-0), z-index 60
- Black background with red+silver radial gradient
- Center: a large CSS-only Ultraman silhouette (use CSS shapes — head oval, body trapezoid, color eyes silver) — don't try to use images
- Rays: 8 yellow rays rotating slowly (CSS keyframes)
- Big text "兑换成功！" fades in, then "奥特曼变身！" 2s later
- Auto unmount after 4s (emit done)
- Sound: optional small embedded beep via Web Audio API on mount (3 short tones)

B) MilestoneEffect.vue:
- Props: { threshold: Number (100/500/1000/5000) }
- Teleport to body, full screen overlay, z-index 60
- Background: gradient that matches medal
- Center: huge medal emoji 🥉 (100) / 🥈 (500) / 🥇 (1000) / 👑 (5000)
- Text below: "🎉 恭喜达到 {threshold} 分！"
- Subtitle: relevant message
  - 100: "继续加油！"
  - 500: "你真棒！"
  - 1000: "小英雄诞生！"
  - 5000: "超级皮卡丘！"
- Confetti: 30 colored squares falling from top (CSS keyframes, randomize x positions and colors in JS)
- Auto unmount after 5s (emit done)

C) Exchange.vue integration:
- In decide() function (or after successful updateRequest for status=approved), if totalPoints after update >= 0, set a reactive showUltraman = true
- Render <UltramanEffect v-if="showUltraman" @done="showUltraman = false" />

D) points.js milestone tracking:
- Add `reachedMilestones` ref = Set of numbers already celebrated (initialize from localStorage key "reached-milestones" or empty Set)
- Add `pendingMilestone` ref = null
- Add a `watch` on totalPoints (or use a function checkMilestone) — when totalPoints crosses a new threshold (not in reachedMilestones), push to reachedMilestones + set pendingMilestone = threshold
- Save reachedMilestones to localStorage on change
- Function: celebrateMilestone(threshold) — guards against duplicate
- 4 thresholds: 100, 500, 1000, 5000

E) App.vue:
- import MilestoneEffect
- Render <MilestoneEffect v-if="store.pendingMilestone" :threshold="store.pendingMilestone" @done="store.clearMilestone()" />
- The store exposes pendingMilestone and clearMilestone() action

VERIFICATION: do not run anything. Just save the files. Print a final summary of files created/edited. Keep total turns under 14. If you hit 10 turns and not done, stop and report what's missing.
