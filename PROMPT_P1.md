Workdir: C:\Users\Windows\projects\pikachu-points

P0 is done (Vue 3 + Vite + Pinia + Tailwind + IndexedDB). Read these to understand current state before editing:
- src/stores/points.js
- src/views/Checkin.vue
- src/views/Home.vue
- src/router.js
- src/App.vue

P1 SCOPE — implement exactly these 3 things. Be conservative; do NOT add features beyond this list.

A) Coin-fly animation on successful check-in
B) Streak badge on Home page (consecutive days with ANY check-in)
C) New page: src/views/Rating.vue — parent-only learning-effect rating
   - Route: /rating
   - Form: 1/2/3 score buttons (emoji: 😐 🙂 😄) + textarea note + submit
   - Submit creates a checkin with projectId=null, pointsEarned=score, checkedBy=parent, note=note
   - Add to Home nav (only on Home for now — no parent/child mode split)

ABSOLUTE FILE SCOPE — edit ONLY these 8 files, nothing else:
1. src/views/Checkin.vue        (add coin animation trigger on add)
2. src/components/CoinBurst.vue (NEW — emits 5 coins that fly up + fade)
3. src/views/Home.vue           (add streak badge)
4. src/stores/points.js         (add currentStreak computed)
5. src/services/db.js           (add query for distinct checkin dates if needed)
6. src/views/Rating.vue         (NEW — rating form)
7. src/router.js                (register /rating route)
8. src/App.vue                  (add /rating to nav OR add nav link on Home)

DO NOT create other files. DO NOT touch package.json, vite.config.js, tailwind.config.js, postcss.config.js, index.html, src/main.js, src/services/seed.js, src/style.css. DO NOT run npm install / build / dev. DO NOT write tests / docs / scripts.

DETAILS:

A) CoinBurst.vue:
- Props: { x: Number, y: Number, count (default 5) } — start position in px from top-left of viewport
- On mount: create 5 small coin DOM elements (yellow circles with Y or star text), each animated with CSS keyframes to translate up ~120px and fade out over 800ms
- Use Teleport to=body so coins render above everything
- z-index high (z-50)
- Remove DOM after 900ms

B) Checkin.vue integration:
- On addNow() success, get the button bounding rect via document.querySelector('[data-project-id=" + project.id + "]') and pass its center x,y to CoinBurst x y
- Add :data-project-id=p.id to each checkin button

C) Streak in points.js:
- Add currentStreak computed: number of consecutive days (ending today) that have at least one checkin
- Use date strings (already in c.date field as YYYY-MM-DD)
- Algorithm: get unique sorted dates desc, walk back from today, count consecutive days

D) Streak badge in Home.vue:
- Show only if currentStreak >= 1
- Below the 今日新增 card, add a card with:
  - 1 day: 🌱 起步
  - 3 days: 🔥 连续 3 天
  - 5 days: ⭐ 连续 5 天
  - 7 days: 🌈 连续 7 天 — 彩虹！
  - N days: 🔥 连续 N 天
- Tailwind, friendly colors

E) Rating.vue:
- 3 large emoji buttons: 😐(1) 🙂(2) 😄(3) — selected one highlighted
- Textarea for note
- Submit button: creates a checkin via store.addCheckin with category=评价, name=学习效果, pointsEarned=score, projectId=null, projectName=学习效果
- On submit: show toast, clear form
- If you need to extend store.addCheckin to accept this shape, that is allowed in src/stores/points.js

F) Router: add /rating route pointing to Rating.vue
G) App.vue: add a nav link to /rating (small text link, not prominent — this is a parent-only feature)

VERIFICATION: do not run anything. Just save the files. Print a final summary: which files were created/edited, and a one-line description of each change. Keep total turns under 15. If you hit 12 turns, stop and report what you got done vs what is missing.
