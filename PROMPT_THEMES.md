Workdir: C:\Users\Windows\projects\pikachu-points

Read these to understand current state:
- src/themes/index.js (NEW — created)
- src/style.css (NEW — CSS variables)
- tailwind.config.js (NEW — custom color tokens)

ABSOLUTE FILE SCOPE — edit ONLY these files, nothing else:
1. src/main.js                (inject theme CSS vars on boot)
2. src/App.vue                (use theme vars for header + nav)
3. src/views/Home.vue         (use theme vars for hero card)
4. src/views/Checkin.vue      (use theme vars for buttons)
5. src/views/Exchange.vue     (use theme vars for buttons)
6. src/views/History.vue      (use theme vars for list)
7. src/views/Rating.vue       (use theme vars for buttons)
8. src/views/WeeklyReport.vue (use theme vars for header)
9. src/views/Settings.vue     (NEW — theme switcher UI)
10. src/stores/points.js      (add currentThemeId state + setTheme + persist)
11. src/router.js             (add /settings route)
12. src/components/ThemeApplier.js (NEW — runs on every page, watches store.theme, updates :root)

DO NOT create other files. DO NOT touch package.json, vite.config.js, postcss.config.js, index.html, src/services/*.js, src/components/CoinBurst.vue, src/components/UltramanEffect.vue, src/components/MilestoneEffect.vue. DO NOT run npm install / build / dev.

COLOR MAPPING RULES (use these exact replacements, no exceptions):

For elements that need theme colors:
- bg-yellow-50 / bg-yellow-100 -> bg-primary-soft  (soft yellow background)
- bg-yellow-200 / bg-yellow-300 / bg-yellow-400 / bg-yellow-500 -> bg-primary  (primary yellow)
- text-yellow-600 / text-yellow-800 / text-yellow-900 -> text-ink (main text on yellow) or text-secondary for emphasis
- text-yellow-100 / text-yellow-50 -> text-ink-soft on primary
- border-yellow-* -> border-primary
- bg-red-100 / bg-red-200 -> bg-primary-soft (re-themed)
- text-red-500 / text-red-600 / text-red-700 -> text-secondary
- bg-white -> bg-surface
- bg-slate-100 / bg-slate-200 -> bg-primary-soft
- text-slate-500 / text-slate-600 / text-slate-700 / text-slate-800 / text-slate-900 -> text-ink or text-ink-soft
- text-slate-400 -> text-ink-soft
- bg-black/40 (modal overlay) -> KEEP (this is intentional overlay, not theme)

For gradients:
- from-yellow-300 to-yellow-500 -> from-primary to-primary (or style="background:linear-gradient(...)" with var)
- from-yellow-400 via-yellow-200 to-blue-200 (rainbow streak) -> KEEP (this is the special rainbow, intentional)

For text shadows and inline styles that hardcode yellow hex (#facc15 etc) -> replace with var(--color-primary)

OTHER RULES:
- Keep all layout, spacing, sizing, rounded, shadow, transition classes unchanged
- Keep all v-if / v-for / @click logic unchanged
- Keep all router-link paths unchanged
- Keep all script logic unchanged (only template color classes change)

For scripts that compute colors dynamically (e.g. streakInfo.cls returning Tailwind class strings), update those class strings to use the new tokens:
- streakInfo.cls should return 'bg-primary-soft text-ink' instead of 'bg-orange-100 text-orange-700' etc.
- statusClass() should return 'text-ink-soft' instead of 'text-slate-400' etc.

For Settings.vue, create a simple card-based theme picker:
- For each theme in THEMES array, show a card with: theme emoji, theme name, theme description
- Active theme: ring-2 ring-secondary border
- Disabled theme (if disabled: true): grayscale + 灰 + 「即将推出」 badge
- Click non-disabled theme: call store.setTheme(id)

For main.js:
- Import { usePointsStore } from './stores/points.js' and { DEFAULT_THEME_ID, getTheme } from './themes/index.js'
- After app.mount, apply current theme by calling a small function that sets document.documentElement.style.setProperty for each color var
- Wrap in a function applyTheme(theme) and export from main.js OR put in a small module

For ThemeApplier.js (optional — easier path: just have main.js apply once on boot; user switches in Settings triggers apply. Skip ThemeApplier entirely):
- SKIP ThemeApplier.js. Settings.vue directly calls applyTheme() on click.

So revised scope: edit 11 files (drop ThemeApplier.js from the list).

For points.js store:
- Add `currentThemeId` ref initialized from localStorage 'pikachu-points:theme-id' or DEFAULT_THEME_ID
- Add function `setTheme(id)` that: sets currentThemeId.value = id, saves to localStorage, calls applyTheme(getTheme(id))
- Add `applyTheme(theme)` — function that takes a theme object and sets document.documentElement.style.setProperty for each color in theme.colors
- Export applyTheme as a standalone helper too, so Settings.vue can use it
- Return currentThemeId and setTheme in the return block

For router.js:
- Add route: { path: '/settings', name: 'settings', component: Settings }

For App.vue:
- Add nav link: { to: '/settings', label: '设置' }
- Header background: bg-primary (or style with var)
- Body background: bg-bg-theme
- All the bg-yellow-* in the header replaced with bg-primary

For Home.vue:
- The big hero card: replace bg-gradient-to-br from-yellow-300 to-yellow-500 -> use inline style with var (this is gradient, no easy class)
  - style="background: linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, var(--color-secondary)))"
- The small "今日新增" card: bg-surface, text-ink, text-secondary for +N
- Replace all bg-yellow-* and text-yellow-* per mapping

For Checkin.vue:
- Toast: bg-primary-soft text-ink
- Buttons (idle): bg-surface hover:bg-primary-soft active:scale-95
- Buttons (checked): bg-primary-soft text-ink-soft
- Picker modal: bg-surface
- Replace all yellow/slate classes

For Exchange.vue:
- Card backgrounds: bg-surface
- Form inputs: border border-ink-soft (or var), focus:border-primary
- Submit button: bg-primary hover:bg-primary (slightly darker)
- Status badges: text-ink-soft for pending, text-secondary for approved, text-ink-soft for rejected
- Decision buttons: bg-primary-soft for both, text-secondary and text-ink-soft
- Replace all yellow/slate classes

For History.vue:
- Header: bg-surface
- Day sections: bg-surface
- text-yellow-600 -> text-secondary
- text-rose-500 -> text-secondary (or keep rose, since this means spent)
- text-slate-500 -> text-ink-soft
- Empty state: text-ink-soft
- Replace all yellow/slate/white classes

For Rating.vue:
- Header: bg-surface
- Emoji buttons: bg-primary-soft (selected) / bg-surface (idle), ring-primary
- Textarea: border-ink-soft focus:border-primary
- Submit button: bg-primary
- Toast: bg-primary-soft
- Replace all yellow/slate/white classes

For WeeklyReport.vue:
- Header: bg-primary + text-ink (or style with var)
- Generate button: bg-primary
- Copy button: bg-secondary
- All cards: bg-surface
- text-yellow-600 -> text-secondary
- text-green-600 -> text-secondary (or keep)
- text-rose-500 -> text-secondary
- text-slate-* -> text-ink or text-ink-soft
- Replace all yellow/slate/white classes

For Settings.vue:
- Page title header
- Section: 主题选择
- For each theme: card with emoji (text-4xl), name, description
- Active: ring-2 ring-secondary, ✓ checkmark
- Disabled: opacity-50, 「即将推出」 badge
- Click handler: store.setTheme(theme.id)

VERIFICATION: do not run anything. Just save the files. Print a final summary: which files were created/edited with one-line description of each. Keep total turns under 22. If you hit 18 turns, stop and report what is missing.
