// 奥特曼角色序列 —— QC 2026-09-23 给定顺序（每周一回到 01 初代）
// 规则：
//   1. 每周一（新的一周）指针清零 → 初代
//   2. 当天「今日进度」打满 → markMorphToday() 标记变身 + 指针待推进（次日生效）
//   3. 进度没满 → 指针不动，第二天还是当前角色
//   4. 打满后又删除导致进度回落 → 指针不回退（变身已庆祝过）
//   5. 角色不足 7 个 → 取模循环
// 头像 / 变身 GIF / 壁纸 = 同一角色三件套，全部随指针切换；
// 连胜等级（Lv.1-5 升级条）是另一套系统，与此无关。

export const ULTRA_CHARS = [
  { key: '01', name: '初代', wall: 'wall.jpg' },
  { key: '02', name: '迪迦', wall: 'wall.jpg' },
  { key: '03', name: '艾克斯', wall: 'wall.webp' },
  { key: '04', name: '泽塔', wall: 'wall.jpg' },
  { key: '05', name: '赛罗', wall: 'wall.jpg' },
  { key: '06', name: '诺亚', wall: 'wall.jpg' }
]

const KEY = 'pikachu-points:ultra-char'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 周键 = 本周一的日期（周一清零靠它判周切换）
function weekKeyOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null } catch (_) { return null }
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch (_) {}
}

// 对齐状态：跨周清零；跨日应用「昨日打满」的推进（advance 在换日时才兑现）
function sync(today, weekKey, s) {
  if (!s || s.weekKey !== weekKey) {
    return { weekKey, pos: 0, shownDate: today, advance: false, morphDate: null }
  }
  if (s.shownDate !== today) {
    if (s.advance) {
      s.pos = ((s.pos || 0) + 1) % ULTRA_CHARS.length
      s.advance = false
    }
    s.shownDate = today
  }
  return s
}

// 今日角色（同一天内恒定；每天首次读取时完成跨日/跨周对齐）
export function getCharToday() {
  const today = todayStr()
  const s = sync(today, weekKeyOf(today), load())
  save(s)
  return ULTRA_CHARS[((s.pos || 0) % ULTRA_CHARS.length + ULTRA_CHARS.length) % ULTRA_CHARS.length]
}

// 今日进度打满时调用：同天幂等标记变身 + 指针次日推进
// 返回 true = 今天第一次打满（应该弹变身），false = 今天已经变过/无需再弹
export function markMorphToday() {
  const today = todayStr()
  const s = sync(today, weekKeyOf(today), load())
  if (s.morphDate === today) {
    save(s)
    return false
  }
  s.morphDate = today
  s.advance = true
  save(s)
  return true
}

// 排查用：读当前原始状态
export function debugCharState() {
  const today = todayStr()
  return sync(today, weekKeyOf(today), load())
}
