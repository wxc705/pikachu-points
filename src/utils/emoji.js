export function categoryEmoji(cat) {
  return { 饮食: '🍚', 运动: '🏃', 学习: '📚', 生活: '🧹', 评价: '⭐' }[cat] || '📌'
}
