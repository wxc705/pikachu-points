// weekday 工具：JS Date.getDay() 是 0=Sun, 1=Mon, ..., 6=Sat
// 我们统一 1=周一, 2=周二, ..., 7=周日（设计文档习惯）

export const WEEKDAYS = [
 { n: 1, short: '周一', long: '星期一', emoji: '🌙' },
 { n: 2, short: '周二', long: '星期二', emoji: '🌟' },
 { n: 3, short: '周三', long: '星期三', emoji: '🌈' },
 { n: 4, short: '周四', long: '星期四', emoji: '🍀' },
 { n: 5, short: '周五', long: '星期五', emoji: '🎉' },
 { n: 6, short: '周六', long: '星期六', emoji: '☀️' },
 { n: 7, short: '周日', long: '星期日', emoji: '🛌' }
]

// JS Date → 我们的 1-7
export function dateToWeekday(d = new Date()) {
 const js = d.getDay() // 0=Sun..6=Sat
 return js === 0 ? 7 : js
}

// 我们的 1-7 → JS 0-6（备用）
export function weekdayToJs(weekday) {
 return weekday === 7 ? 0 : weekday
}
