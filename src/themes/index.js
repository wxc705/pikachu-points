// 主题配置：每个主题 5 个核心颜色 + logo emoji/图片
// 扩展主题：再加一个对象到 THEMES 数组即可，不用改任何 view 文件

export const THEMES = [
 {
 id: 'ultraman',
 name: '奥特曼',
 emoji: '⚡',
 description: '红银相间，变身即正义',
 colors: {
 primary: '#fde047', // 主色 - 鲜黄
 secondary: '#dc2626', // 次色 - 奥特曼红
 accent: '#0ea5e9', // 强调色 - 蓝
 bg: '#fef9c3', // 背景 - 浅黄
 surface: '#ffffff' // 卡片底色
 }
 },
 {
 id: 'minecraft',
 name: '我的世界',
 emoji: '🟩',
 description: '草方块绿，钻石蓝，泥土棕',
 colors: {
 primary: '#7eb238', // 主色 - 草方块绿
 secondary: '#8b5a2b', // 次色 - 泥土棕
 accent: '#5decf5', // 强调色 - 钻石蓝
 bg: '#a5d6e7', // 背景 - 浅天蓝
 surface: '#f4f1de' // 卡片 - 羊皮纸
 },
 disabled: true
 },
 {
 id: 'pikachu',
 name: '皮卡丘',
 emoji: '⚡',
 description: '黄黑主调，精灵球元素（暂未实现）',
 colors: {
 primary: '#facc15',
 secondary: '#1f2937',
 accent: '#dc2626',
 bg: '#fef9c3',
 surface: '#ffffff'
 },
 disabled: true
 }
]

export const DEFAULT_THEME_ID = 'ultraman'

export function getTheme(id) {
 return THEMES.find((t) => t.id === id) || THEMES[0]
}
