// weekly_tasks 种子数据 — v5 课表
// 来源: Desktop/平日与周末学习安排表.xlsx (2026-09-22 QC提供) + QC 口述规则
//
// 口述规则（优先级高于表格）:
//   - 7:00 起床 / 7:40 出发上学 / 16:10 放学 / 16:30 到家 / 21:00 睡觉
//   - 18:30-19:30 = 作业与提高（自我拓展积分项与学校作业同时间段）
//   - 19:30-20:30 = 自由安排（当中含半小时阅读）→ 阅读任务挂此段
//   - 20:30 洗漱准备睡觉
//
// 积分规则:
//   - 表格积分列标 1 分: 体能训练/跳绳/口算/练字/英语/数学思维/阅读/多邻国/实验课/复习古诗/英语口语 等 = 1 分
//   - 课程类 = 2 分（锁定规则 2026-08-31）: 写字课/国象课/体能课
//   - 表格里出现但无积分的活动: 编程/乐高（沿用旧规则兴趣类 1 分）
//   - 学校作业无积分 → 走家长端「今日作业」粘贴（daily_homework），不进本种子
//
// 假设（表格未写明,按合理默认,可随时改）:
//   - 周二写字课在表格中是合并格(18:00起跨到8:00),与口述晚间规则冲突 → 取 18:00-18:30
//   - 周二表格未列提高项 → 晚间只挂阅读
//   - 周末表格无时间列 → 时间为拟定（沿用旧课表作息）
//   - 国象课按表格放在周日（旧课表为周六）
//   - 平日早晨不再有多邻国（上学日早晨无时间,周末保留 8:00-9:00）
//
// weekday: 1=周一 ... 7=周日

export const WEEKLY_TASKS_SEED = [
  // ================= 周一 =================
  { weekday: 1, timeSlot: '16:30-17:00', name: '体能训练', points: 1, category: '体能', sortOrder: 10 },
  { weekday: 1, timeSlot: '17:00-17:30', name: '口算50题', points: 1, category: '数学', sortOrder: 20 },
  { weekday: 1, timeSlot: '17:00-17:30', name: '练字15min', points: 1, category: '语文', sortOrder: 30 },
  { weekday: 1, timeSlot: '18:00-18:30', name: '编程', points: 1, category: '编程', sortOrder: 40 },
  { weekday: 1, timeSlot: '18:30-19:30', name: '英语15min', points: 1, category: '英语', sortOrder: 50 },
  { weekday: 1, timeSlot: '18:30-19:30', name: '数学思维20min', points: 1, category: '思维', sortOrder: 60 },
  { weekday: 1, timeSlot: '19:30-20:30', name: '阅读', points: 1, category: '阅读', sortOrder: 70 },

  // ================= 周二 =================
  { weekday: 2, timeSlot: '16:30-17:30', name: '跳绳500个', points: 1, category: '体能', sortOrder: 10 },
  { weekday: 2, timeSlot: '18:00-18:30', name: '写字课', points: 2, category: '写字', sortOrder: 20 },
  { weekday: 2, timeSlot: '19:30-20:30', name: '阅读', points: 1, category: '阅读', sortOrder: 30 },

  // ================= 周三 =================
  { weekday: 3, timeSlot: '16:30-17:00', name: '口算50题', points: 1, category: '数学', sortOrder: 10 },
  { weekday: 3, timeSlot: '16:30-17:00', name: '练字15min', points: 1, category: '语文', sortOrder: 20 },
  { weekday: 3, timeSlot: '17:00-18:00', name: '体能课', points: 2, category: '体能', sortOrder: 30 },
  { weekday: 3, timeSlot: '18:30-19:30', name: '英语15min', points: 1, category: '英语', sortOrder: 40 },
  { weekday: 3, timeSlot: '18:30-19:30', name: '数学思维20min', points: 1, category: '思维', sortOrder: 50 },
  { weekday: 3, timeSlot: '19:30-20:30', name: '阅读', points: 1, category: '阅读', sortOrder: 60 },

  // ================= 周四 =================
  { weekday: 4, timeSlot: '16:30-17:00', name: '体能训练', points: 1, category: '体能', sortOrder: 10 },
  { weekday: 4, timeSlot: '17:00-17:30', name: '口算50题', points: 1, category: '数学', sortOrder: 20 },
  { weekday: 4, timeSlot: '17:00-17:30', name: '练字15min', points: 1, category: '语文', sortOrder: 30 },
  { weekday: 4, timeSlot: '18:00-18:30', name: '乐高', points: 1, category: '乐高', sortOrder: 40 },
  { weekday: 4, timeSlot: '18:30-19:30', name: '英语15min', points: 1, category: '英语', sortOrder: 50 },
  { weekday: 4, timeSlot: '18:30-19:30', name: '数学思维20min', points: 1, category: '思维', sortOrder: 60 },
  { weekday: 4, timeSlot: '19:30-20:30', name: '阅读', points: 1, category: '阅读', sortOrder: 70 },

  // ================= 周五 =================
  { weekday: 5, timeSlot: '16:30-17:30', name: '体能课', points: 2, category: '体能', sortOrder: 10 },
  { weekday: 5, timeSlot: '18:30-19:30', name: '英语15min', points: 1, category: '英语', sortOrder: 20 },
  { weekday: 5, timeSlot: '18:30-19:30', name: '数学思维20min', points: 1, category: '思维', sortOrder: 30 },
  { weekday: 5, timeSlot: '19:30-20:30', name: '阅读', points: 1, category: '阅读', sortOrder: 40 },

  // ================= 周六 =================
  { weekday: 6, timeSlot: '8:00-9:00', name: '多邻国1-2单元', points: 1, category: '英语', sortOrder: 10 },
  { weekday: 6, timeSlot: '9:30-10:30', name: '数学思维(学霸)', points: 1, category: '思维', sortOrder: 20 },
  { weekday: 6, timeSlot: '17:00-17:30', name: '练字15min', points: 1, category: '语文', sortOrder: 30 },
  { weekday: 6, timeSlot: '17:30-18:00', name: '口算50题', points: 1, category: '数学', sortOrder: 40 },
  { weekday: 6, timeSlot: '18:00-18:30', name: '体能训练', points: 1, category: '体能', sortOrder: 50 },
  { weekday: 6, timeSlot: '19:00-20:00', name: '实验课', points: 1, category: '实验', sortOrder: 60 },
  { weekday: 6, timeSlot: '20:30-21:00', name: '阅读', points: 1, category: '阅读', sortOrder: 70 },

  // ================= 周日 =================
  { weekday: 7, timeSlot: '8:00-9:00', name: '多邻国1-2单元', points: 1, category: '英语', sortOrder: 10 },
  { weekday: 7, timeSlot: '9:00-10:00', name: '国象课', points: 2, category: '国象', sortOrder: 20 },
  { weekday: 7, timeSlot: '10:00-10:30', name: '复习古诗', points: 1, category: '语文', sortOrder: 30 },
  { weekday: 7, timeSlot: '16:00-17:00', name: '英语口语', points: 1, category: '英语', sortOrder: 40 },
  { weekday: 7, timeSlot: '19:30-20:30', name: '阅读', points: 1, category: '阅读', sortOrder: 50 }
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
