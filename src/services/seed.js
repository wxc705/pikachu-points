import { getProjects, addProject } from './db.js'

// Each item: { category, name, points, pointRange?, sortOrder, isActive: true }
// `pointRange` is the [min, max] the evaluator can pick from for subjective awards.
export const SEED_PROJECTS = [
 //饮食 (Diet)
 { category: '饮食', name: '中饭准时', points:2, sortOrder:10 },
 { category: '饮食', name: '中饭吃蔬菜', points:1, sortOrder:11 },
 { category: '饮食', name: '晚饭准时', points:2, sortOrder:12 },
 { category: '饮食', name: '晚饭吃蔬菜', points:1, sortOrder:13 },

 //运动 (Exercise)
 { category: '运动', name: '跳绳', points:1, sortOrder:20 },
 { category: '运动', name: '体能训练', points:1, sortOrder:21 },
 { category: '运动', name: '培训班-体能', points:2, sortOrder:22 },
 { category: '运动', name: '游泳', points:2, sortOrder:23 },

 // 学习 (Study)
 { category: '学习', name: '识字', points:2, sortOrder:30 },
 { category: '学习', name: '练字', points:3, sortOrder:31 },
 { category: '学习', name: '英语', points:2, sortOrder:32 },
 { category: '学习', name: '数学', points:2, sortOrder:33 },
 { category: '学习', name: '编程', points:2, sortOrder:34 },
 { category: '学习', name: '拼音', points:2, sortOrder:35 },
 { category: '学习', name: '古诗', points:2, sortOrder:36 },
 { category: '学习', name: '阅读', points:2, sortOrder:37 },

 // 生活 (Life skills)
 { category: '生活', name: '整理玩具', points:1, sortOrder:40 },
 { category: '生活', name: '自己穿衣服', points:1, sortOrder:41 },
 { category: '生活', name: '刷牙洗脸', points:1, sortOrder:42 },

 //评价 (Subjective — pointRange means the evaluator picks within the range)
 { category: '评价', name: '学习效果', points:1, pointRange: [1,3], sortOrder:50 },
 { category: '评价', name: '长辈奖励', points:1, pointRange: [1,2], sortOrder:51 },
 { category: '评价', name: '特别奖励', points:1, pointRange: [1,5], sortOrder:52 }
]

export async function seedIfEmpty() {
 const existing = await getProjects()
 if (existing && existing.length >0) return false
 for (const item of SEED_PROJECTS) {
 await addProject({ ...item, isActive: true })
 }
 return true
}
