// 把分值映射到奥特曼特效等级（1-5）
// 设计文档没有明确规定，按你给的：1-30=L1, 31-60=L2, 61-90=L3, 91-120=L4, 121+=L5

export const ULTRAMAN_LEVELS = [
 { min: 121, level: 5, name: '传说', emoji: '👑' },
 { min: 91, level: 4, name: '史诗', emoji: '💎' },
 { min: 61, level: 3, name: '稀有', emoji: '🌟' },
 { min: 31, level: 2, name: '精良', emoji: '✨' },
 { min: 1, level: 1, name: '普通', emoji: '⭐' }
]

export function pointsToLevel(points) {
 if (!points || points < 1) return 1
 for (const t of ULTRAMAN_LEVELS) {
 if (points >= t.min) return t.level
 }
 return 1
}
