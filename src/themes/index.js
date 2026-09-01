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
     primary: '#5d8c2e',
     secondary: '#8b5a2b',
     accent: '#5decf5',
     bg: '#c6b88a',
     surface: '#f4f1de',
     ink: '#3d2b1f',
     'ink-soft': '#6b5344'
   }
 },
 {
   id: 'pikachu',
   name: '皮卡丘',
   emoji: '⚡',
   description: '黄黑主调，精灵球元素',
   colors: {
     primary: '#facc15',
     secondary: '#1f2937',
     accent: '#dc2626',
     bg: '#fef9c3',
     surface: '#ffffff'
   }
 },
 {
   id: 'dino',
   name: '恐龙乐园',
   emoji: '🦕',
   description: '丛林绿+泥土棕，霸王龙来了',
   colors: {
     primary: '#4ade80',
     secondary: '#92400e',
     accent: '#f97316',
     bg: '#ecfdf5',
     surface: '#ffffff',
     ink: '#1a2e05',
     'ink-soft': '#4d7c0f'
   }
 },
 {
   id: 'ocean',
   name: '海底世界',
   emoji: '🐙',
   description: '深海蓝+珊瑚橙，小丑鱼在游泳',
   colors: {
     primary: '#38bdf8',
     secondary: '#0e7490',
     accent: '#fb923c',
     bg: '#f0f9ff',
     surface: '#ffffff',
     ink: '#0c4a6e',
     'ink-soft': '#0369a1'
   }
 },
 {
   id: 'space',
   name: '太空探险',
   emoji: '🚀',
   description: '星空紫+火箭红，飞向月球',
   colors: {
     primary: '#a78bfa',
     secondary: '#dc2626',
     accent: '#fbbf24',
     bg: '#1e1b4b',
     surface: '#312e81',
     ink: '#f5f3ff',
     'ink-soft': '#c4b5fd'
   }
 }
]

export const DEFAULT_THEME_ID = 'ultraman'

export function getTheme(id) {
 return THEMES.find((t) => t.id === id) || THEMES[0]
}
