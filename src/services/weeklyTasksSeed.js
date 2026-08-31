// weekly_tasks 种子数据
// 来源: Obsidian 个人管理/皮卡丘每日时间安排表.md (2026-08-31 更新)
// 规则: 红色=计分; 斜杠两项都红→拆成两个任务; 斜杠一黑一红→只计红的
// 积分规则（Nate 团队锁定 2026-08-31, 不用等 QC）:
//   - 课程类 2分: 写字课(周六+周日)、国象完整课(周六9:00-10:00)、体育课/体能课(周五17:00)
//   - 兴趣类 1分: 多邻国/阅读/思维/预习/英语/编程/乐高/实验课/游戏/国象15min/语文阅读/诗歌二首/卡丁车
// weekday: 1=周一 ... 7=周日

export const WEEKLY_TASKS_SEED = [
  // ================= 周一 =================
  { weekday: 1, timeSlot: '早晨', name: '多邻国1-2单元', points: 1, category: '英语', sortOrder: 10 },
  { weekday: 1, timeSlot: '16:30-17:00', name: '思维', points: 1, category: '思维', sortOrder: 20 },
  { weekday: 1, timeSlot: '18:00-18:30', name: '语文预习', points: 1, category: '语文', sortOrder: 30 },
  { weekday: 1, timeSlot: '18:00-18:30', name: '英语', points: 1, category: '英语', sortOrder: 31 },
  { weekday: 1, timeSlot: '18:30-19:00', name: '思维', points: 1, category: '思维', sortOrder: 40 },
  { weekday: 1, timeSlot: '19:00-19:30', name: '编程40min', points: 1, category: '编程', sortOrder: 50 },
  { weekday: 1, timeSlot: '19:00-19:30', name: '国象15min', points: 1, category: '国象', sortOrder: 51 },
  { weekday: 1, timeSlot: '20:30-21:00', name: '阅读15min', points: 1, category: '阅读', sortOrder: 60 },

  // ================= 周二 =================
  { weekday: 2, timeSlot: '早晨', name: '多邻国1-2单元', points: 1, category: '英语', sortOrder: 10 },
  { weekday: 2, timeSlot: '16:00-16:30', name: '语文预习', points: 1, category: '语文', sortOrder: 20 },
  { weekday: 2, timeSlot: '16:00-16:30', name: '语文阅读', points: 1, category: '语文', sortOrder: 21 },
  { weekday: 2, timeSlot: '16:30-17:00', name: '思维', points: 1, category: '思维', sortOrder: 30 },
  { weekday: 2, timeSlot: '20:30-21:00', name: '阅读15min', points: 1, category: '阅读', sortOrder: 40 },

  // ================= 周三 =================
  { weekday: 3, timeSlot: '早晨', name: '多邻国1-2单元', points: 1, category: '英语', sortOrder: 10 },
  { weekday: 3, timeSlot: '18:00-18:30', name: '语文预习', points: 1, category: '语文', sortOrder: 20 },
  { weekday: 3, timeSlot: '18:00-18:30', name: '英语', points: 1, category: '英语', sortOrder: 21 },
  { weekday: 3, timeSlot: '18:30-19:00', name: '思维', points: 1, category: '思维', sortOrder: 30 },
  { weekday: 3, timeSlot: '19:00-19:30', name: '乐高40min', points: 1, category: '乐高', sortOrder: 40 },
  { weekday: 3, timeSlot: '19:00-19:30', name: '国象15min', points: 1, category: '国象', sortOrder: 41 },
  { weekday: 3, timeSlot: '20:30-21:00', name: '阅读15min', points: 1, category: '阅读', sortOrder: 50 },

  // ================= 周四 =================
  { weekday: 4, timeSlot: '早晨', name: '多邻国1-2单元', points: 1, category: '英语', sortOrder: 10 },
  { weekday: 4, timeSlot: '16:00-16:30', name: '语文预习', points: 1, category: '语文', sortOrder: 20 },
  { weekday: 4, timeSlot: '16:00-16:30', name: '语文阅读', points: 1, category: '语文', sortOrder: 21 },
  { weekday: 4, timeSlot: '16:30-17:00', name: '思维', points: 1, category: '思维', sortOrder: 30 },
  { weekday: 4, timeSlot: '20:30-21:00', name: '阅读15min', points: 1, category: '阅读', sortOrder: 40 },

  // ================= 周五 =================
  { weekday: 5, timeSlot: '早晨', name: '多邻国1-2单元', points: 1, category: '英语', sortOrder: 10 },
  { weekday: 5, timeSlot: '16:30-17:00', name: '思维', points: 1, category: '思维', sortOrder: 20 },
  { weekday: 5, timeSlot: '17:00-18:00', name: '体能课', points: 2, category: '体能', sortOrder: 30 },
  { weekday: 5, timeSlot: '17:00-18:00', name: '卡丁车', points: 2, category: '体能', sortOrder: 31 },
  { weekday: 5, timeSlot: '18:30-19:00', name: '游戏', points: 1, category: '游戏', sortOrder: 40 },
  { weekday: 5, timeSlot: '19:00-19:30', name: '国象15min', points: 1, category: '国象', sortOrder: 50 },
  { weekday: 5, timeSlot: '19:30-20:00', name: '游戏', points: 1, category: '游戏', sortOrder: 60 },
  { weekday: 5, timeSlot: '20:30-21:00', name: '阅读15min', points: 1, category: '阅读', sortOrder: 70 },

  // ================= 周六 =================
  { weekday: 6, timeSlot: '8:00-9:00', name: '多邻国1-2单元', points: 1, category: '英语', sortOrder: 10 },
  { weekday: 6, timeSlot: '9:00-10:00', name: '国象课', points: 2, category: '国象', sortOrder: 20 },
  { weekday: 6, timeSlot: '13:00-14:00', name: '语文阅读', points: 1, category: '语文', sortOrder: 30 },
  { weekday: 6, timeSlot: '13:00-14:00', name: '诗歌二首', points: 1, category: '语文', sortOrder: 31 },
  { weekday: 6, timeSlot: '15:00-16:00', name: '思维', points: 1, category: '思维', sortOrder: 40 },
  { weekday: 6, timeSlot: '15:00-16:00', name: '英语', points: 1, category: '英语', sortOrder: 41 },
  { weekday: 6, timeSlot: '19:00-20:00', name: '写字15min', points: 2, category: '写字', sortOrder: 50 },
  { weekday: 6, timeSlot: '21:00-', name: '阅读15min', points: 1, category: '阅读', sortOrder: 60 },

  // ================= 周日 =================
  { weekday: 7, timeSlot: '8:00-9:00', name: '多邻国1-2单元', points: 1, category: '英语', sortOrder: 10 },
  { weekday: 7, timeSlot: '16:00-17:00', name: '实验课', points: 1, category: '实验', sortOrder: 20 },
  { weekday: 7, timeSlot: '18:00-19:00', name: '写字15min', points: 2, category: '写字', sortOrder: 30 },
  { weekday: 7, timeSlot: '18:00-19:00', name: '国象15min', points: 1, category: '国象', sortOrder: 31 },
  { weekday: 7, timeSlot: '19:00-20:00', name: '语文预习', points: 1, category: '语文', sortOrder: 40 },
  { weekday: 7, timeSlot: '20:30-21:00', name: '阅读15min', points: 1, category: '阅读', sortOrder: 50 }
]

// 自检: 输出每周任务数 + 每日满分
export function weeklyTaskCounts() {
  const counts = {}
  const totals = {}
  for (const t of WEEKLY_TASKS_SEED) {
    counts[t.weekday] = (counts[t.weekday] || 0) + 1
    totals[t.weekday] = (totals[t.weekday] || 0) + t.points
  }
  return { counts, totals }
}
