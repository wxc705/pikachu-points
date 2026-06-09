# 皮卡丘积分管理系统 — 产品设计文档

> 版本：v2.1
> 更新：2026-06-09
> 状态：P0/P1/P2 全部完成，待云部署

---

## 一、项目概述

### 背景
皮卡丘（6岁）的日常行为积分管理系统，替代原有的纸质表格，实现多设备同步、实时打卡、积分兑换、动画激励。

### 目标
- 孩子：看到自己的积分变化，获得成就感，主动完成任务
- 家长：快速打卡，灵活管理，不在家也能操作
- 家庭：培养规则意识，积分=努力=回报

### 设备环境
- **学习机**：科大讯飞安卓学习机，有浏览器，能访问外网
- **家长设备**：手机/MBP，通过浏览器访问
- **网络环境**：学习机与台式机不在同一局域网（相距200米），需云托管

---

## 二、用户角色

| 角色 | 设备 | 权限 |
|------|------|------|
| **皮卡丘** | 安卓学习机浏览器 | 查看积分、查看历史、提交兑换申请 |
| **爸爸（QC）** | 手机/MBP浏览器 | 打卡加分、确认兑换、评分、管理项目 |
| **妈妈** | 手机浏览器 | 同爸爸权限 |

---

## 三、积分规则

### 3.1 积分项目表（基于现有表格优化）

#### 🍚 饮食
| 项目 | 分值 | 说明 |
|------|------|------|
| 中饭准时完成 | +2 | |
| 中饭吃蔬菜 | +1 | |
| 晚饭准时完成 | +2 | |
| 晚饭吃蔬菜 | +1 | |

#### 🏃 运动
| 项目 | 分值 | 说明 |
|------|------|------|
| 跳绳 | +1 | |
| 体能训练 | +1 | |
| 培训班-体能 | +2 | |
| 游泳 | +2 | 可自定义 |

#### 📚 学习
| 项目 | 分值 | 说明 |
|------|------|------|
| 识字 | +2 | |
| 练字 | +3 | |
| 英语 | +2 | |
| 数学 | +2 | |
| 编程 | +2 | |
| 拼音 | +2 | |
| 古诗 | +2 | |
| 阅读 | +2 | |

#### 🧹 生活习惯
| 项目 | 分值 | 说明 |
|------|------|------|
| 整理玩具 | +1 | |
| 自己穿衣服 | +1 | 可扩展 |
| 刷牙洗脸 | +1 | 可扩展 |

#### ⭐ 家长评价
| 项目 | 分值 | 说明 |
|------|------|------|
| 学习效果 | +1~3 | 家长根据当天表现评分 |
| 长辈奖励 | +1~2 | 爷爷奶奶等给予 |
| 特别奖励 | +1~5 | 特殊表现，家长酌情 |

### 3.2 积分兑换

| 兑换项 | 扣分 | 说明 |
|--------|------|------|
| 看电视 | 手动 | 家长定每次扣多少 |
| 玩游戏 | 手动 | 同上 |
| 买玩具 | 手动 | 根据玩具价值定 |
| 其他愿望 | 手动 | 灵活处理 |

**兑换流程：**
```
孩子提交兑换申请（选项目+描述）
    ↓
家长手机收到通知
    ↓
家长确认 → 扣分成功，孩子端收到"兑换成功"动画
家长拒绝 → 孩子端收到"再努力一下"提示
```

### 3.3 积分特性
- **积分永久累积**，不归零
- **无固定兑换比例**，家长灵活决定
- **每日新增**和**总积分**同时显示

### 3.4 每周学习计划（按星期配置）

**核心逻辑：** 学习类项目按星期几显示不同内容，其他分类（饮食/运动/生活/评价）每天都显示。

**应用场景：**
- 周一：识字 + 英语 + 阅读
- 周二：练字 + 数学 + 古诗
- 周三：编程 + 拼音 + 阅读
- 周四：识字 + 英语 + 古诗
- 周五：练字 + 数学 + 编程
- 周六：自由安排（可选）
- 周日：复习 + 阅读

**配置方式：**
```
家长端 → 项目管理 → 每周计划 tab
    ↓
选择星期几（周一~周日）
    ↓
勾选当天的学习项目
    ↓
保存
```

**打卡页效果：**
```
今天是周三，显示：
├── 🍚 饮食（每天都显示）
│   ├── 中饭准时 +2
│   ├── 吃蔬菜 +1
│   └── ...
├── 📚 学习（只显示周三的项目）
│   ├── 编程 +2
│   ├── 拼音 +2
│   └── 阅读 +2
├── 🏃 运动（每天都显示）
│   └── ...
└── ⭐ 评价（每天都显示）
    └── ...
```

---

## 四、功能设计

### 4.1 孩子端（学习机浏览器）

#### 首页
```
┌─────────────────────────────┐
│     ⭐ 皮卡丘积分站 ⭐       │
│                             │
│        🏆 2,304             │
│       总积分                 │
│                             │
│    今日新增: +17             │
│    连续打卡: 🔥 5天          │
│                             │
│  [打卡]  [历史]  [兑换]      │
└─────────────────────────────┘
```

#### 打卡页
```
┌─────────────────────────────┐
│ ← 返回     今日打卡         │
├─────────────────────────────┤
│ 🍚 饮食                     │
│ [中饭准时 +2] [吃蔬菜 +1]   │
│ [晚饭准时 +2] [吃蔬菜 +1]   │
│                             │
│ 📚 学习                     │
│ [识字 +2] [练字 +3] [英语 +2]│
│ [数学 +2] [拼音 +2] [古诗 +2]│
│ [阅读 +2]                   │
│                             │
│ 🏃 运动                     │
│ [跳绳 +1] [体能 +1]         │
│                             │
│ 🧹 生活                     │
│ [整理玩具 +1]               │
│                             │
│ 已打卡的项目显示 ✅ 灰色     │
└─────────────────────────────┘
```

**点击打卡按钮：**
1. 金币飞出动画（3-5个金币从按钮位置向上飘散）
2. 分数跳动（总积分+新增值，数字滚动效果）
3. 音效"叮！"（可选关闭）
4. 按钮变为 ✅ 已完成

#### 兑换页
```
┌─────────────────────────────┐
│ ← 返回     我要兑换         │
├─────────────────────────────┤
│ 当前积分: 2,304             │
│                             │
│ [📺 看电视]                 │
│ [🎮 玩游戏]                 │
│ [🧸 换玩具]                 │
│ [✨ 其他愿望]               │
│                             │
│ 选择后输入想兑换的内容       │
│ 等待爸爸妈妈确认~            │
└─────────────────────────────┘
```

#### 历史页
```
┌─────────────────────────────┐
│ ← 返回     积分历史         │
├─────────────────────────────┤
│ 6月5日 周四                 │
│  ✅ 中饭准时 +2             │
│  ✅ 英语 +2                 │
│  ✅ 学习效果 +2             │
│  📺 看电视 -30              │
│  本日: -24                  │
│                             │
│ 6月4日 周三                 │
│  ✅ 练字 +3                 │
│  ✅ 阅读 +2                 │
│  本日: +5                   │
│                             │
│ [日历视图切换]               │
└─────────────────────────────┘
```

### 4.2 家长端（手机浏览器）

#### 首页（精简版孩子首页 + 管理入口）
```
┌─────────────────────────────┐
│ 皮卡丘积分: 2,304  今日: +17│
├─────────────────────────────┤
│ [快速打卡] [学习评分] [兑换]│
│ [项目管理] [历史]           │
│                             │
│ ⏳ 待确认兑换申请:          │
│  📺 "看汪汪队30分钟"  [✓][✗]│
└─────────────────────────────┘
```

#### 快速打卡
- 和孩子端一样的打卡按钮
- 额外功能：**一键全部打卡**（当天所有项目一次性勾选）

#### 学习效果评分
```
┌─────────────────────────────┐
│  今日学习效果评分            │
│                             │
│  [😐 1分] [🙂 2分] [😄 3分] │
│                             │
│  备注: _______________      │
└─────────────────────────────┘
```

#### 项目管理
- 新增项目（名称+分值+分类）
- 修改分值
- 删除/停用项目
- 调整项目排序

---

## 五、特效设计（奥特曼主题）

### 加分特效（P1）
1. **金币飞出**：从点击位置飞出3-5个金币，渐隐消失 ✅
2. **分数跳动**：总积分数字从旧值滚动到新值 ✅
3. **音效**："叮！"清脆提示音（待集成）

### 连续打卡特效（P1）
- 3天连续：🔥 火焰边框 ✅
- 5天连续：⭐ 星星环绕 ✅
- 7天连续：🌈 彩虹特效 ✅

### 兑换成功特效（P2，最后开发）

#### 5级奥特曼特效系统

根据兑换分值触发不同等级的奥特曼特效：

| 等级 | 分值范围 | 奥特曼图片 | 说明 |
|------|----------|------------|------|
| ⭐ | 1-30分 | level1.png | 基础形态 |
| ⭐⭐ | 31-60分 | level2.png | 强化形态 |
| ⭐⭐⭐ | 61-90分 | level3.png | 进阶形态 |
| ⭐⭐⭐⭐ | 91-120分 | level4.png | 高级形态 |
| ⭐⭐⭐⭐⭐ | 121分以上 | level5.png | 终极形态（不设上限） |

#### 特效效果

```
兑换确认成功
    ↓
全屏半透明黑色遮罩
    ↓
中央显示对应等级的奥特曼图片（从0放大到100%）
    ↓
图片下方显示"兑换成功！"文字（金色）
    ↓
播放成功音效
    ↓
3秒后自动关闭（或点击任意位置关闭）
```

#### 技术实现

**素材需求：**
- 5张奥特曼PNG图片（512x512，透明背景）
- 1个成功音效MP3（success.mp3）

**文件结构：**
```
public/
  ultraman/
    level1.png    # 等级1：1-30分
    level2.png    # 等级2：31-60分
    level3.png    # 等级3：61-90分
    level4.png    # 等级4：91-120分
    level5.png    # 等级5：121分以上
  sounds/
    success.mp3  # 兑换成功音效
```

**代码逻辑：**
```javascript
// 根据扣分值计算等级
function getLevel(pointsSpent) {
  if (pointsSpent <= 30) return 1
  if (pointsSpent <= 60) return 2
  if (pointsSpent <= 90) return 3
  if (pointsSpent <= 120) return 4
  return 5  // 121分以上
}
```

#### 开发优先级

**P2（最后开发）：**
- 等待用户准备好5张奥特曼PNG素材
- 素材到位后，CC实现特效组件
- 预计开发时间：2小时

---

## 六、技术架构

### 技术栈
- **框架**：Vue 3 + Vite
- **UI库**：TailwindCSS + 自定义奥特曼主题CSS变量
- **状态管理**：Pinia
- **本地存储**：IndexedDB（idb库）
- **云同步**：Supabase（免费 PostgreSQL）
- **动画**：CSS动画 + requestAnimationFrame
- **音效**：Web Audio API（合成）+ 外部MP3文件
- **图标库**：Lucide Icons（开源免费，ISC许可）

### 存储架构：本地优先 + 云同步

```
日常使用（在家/学习机）
  └── 数据存在浏览器 IndexedDB
      └── 完全离线可用，零网络依赖

外出旅游（手机/其他设备）
  └── 家长点"☁️ 同步"按钮 → 数据上传 Supabase（免费）
  └── 手机浏览器打开 → 拉取云端数据
  └── 回家后学习机"拉取云端"合并数据
```

**同步策略：**
- 默认不同步，纯本地
- 家长端有"☁️ 同步"按钮，手动触发
- 冲突处理：最新操作优先（last-write-wins）
- Supabase 免费额度：500MB，够用一辈子

### 部署方案：云托管

```
学习机浏览器（科大讯飞，另一个屋子）
    ↓
访问 Vercel（公网URL：pikachu-points.vercel.app）
    ↓
数据存储 Supabase（云数据库）
```

**部署优势：**
- 学习机只要能上网就能用
- 不依赖台式机开机
- 自带HTTPS，安全
- 免费额度足够用

### 目录结构（当前实现）

```
pikachu-points/
├── public/
│   ├── index.html
│   ├── manifest.json          # PWA配置
│   └── sounds/                # 音效文件
│       ├── coin.mp3
│       ├── levelup.mp3
│       ├── success.mp3
│       └── milestone.mp3
├── src/
│   ├── App.vue
│   ├── main.js
│   ├── router.js              # 路由配置
│   ├── views/
│   │   ├── Home.vue           # 首页（总积分）
│   │   ├── Checkin.vue        # 打卡页
│   │   ├── Exchange.vue       # 兑换页
│   │   ├── History.vue        # 历史页
│   │   ├── Rating.vue         # 学习效果评分
│   │   ├── WeeklyReport.vue   # 每周统计报告
│   │   ├── WeeklyPlan.vue     # 每周学习计划配置（新增）
│   │   ├── Settings.vue       # 设置页面（主题切换）
│   │   ├── ParentDashboard.vue # 家长端首页
│   │   └── ProjectManage.vue  # 项目管理
│   ├── components/
│   │   ├── CoinBurst.vue      # 金币飞出动画
│   │   ├── UltramanEffect.vue # 奥特曼变身特效
│   │   ├── MilestoneEffect.vue # 里程碑动画
│   │   └── CheckinButton.vue  # 打卡按钮（带特效，待开发）
│   ├── stores/
│   │   ├── points.js          # 积分状态管理
│   │   ├── projects.js        # 项目配置
│   │   └── weeklyPlan.js      # 每周计划状态管理（新增）
│   ├── services/
│   │   ├── db.js              # IndexedDB操作
│   │   ├── seed.js            # 种子数据
│   │   └── supabase.js        # Supabase连接（待开发）
│   ├── themes/
│   │   └── index.js           # 主题系统（奥特曼/皮卡丘/汪汪队）
│   └── icons/                 # 图标文件（Lucide SVG）
├── supabase/
│   └── schema.sql             # 数据库表结构
├── TASKS.md                   # 开发任务清单
├── ASSETS.md                  # 素材资源清单
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

### 数据库设计（Supabase/PostgreSQL）

> **注意**：以下为当前实际运行的 SQL schema（与 v2.0 早期设计不同：ID 用 BIGINT 而非 UUID，方便 IndexedDB 自增 ID 做 upsert；`weekly_plan` 用 JSONB 列存 project_ids 而非多对多关联表）。

```sql
-- 项目配置表
CREATE TABLE projects (
  id BIGINT PRIMARY KEY,
  category TEXT NOT NULL,        -- 饮食/运动/学习/生活/评价/拨付
  name TEXT NOT NULL,             -- 项目名称
  points INTEGER DEFAULT 0,      -- 分值
  point_range JSONB,              -- 分值范围 [min, max]（如学习效果1-3）
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_projects_category ON projects(category);

-- 打卡记录表（含拨付、评分的所有积分变动）
CREATE TABLE checkins (
  id BIGINT PRIMARY KEY,
  project_id BIGINT,
  project_name TEXT,
  category TEXT,
  points_earned INTEGER DEFAULT 0,
  note TEXT,
  checked_by TEXT,               -- 'dad' / 'mom' / 'parent'
  date TEXT,                     -- 'YYYY-MM-DD'
  created_at BIGINT,             -- unix ms
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_checkins_date ON checkins(date);
CREATE INDEX idx_checkins_project ON checkins(project_id);

-- 兑换申请表
CREATE TABLE exchange_requests (
  id BIGINT PRIMARY KEY,
  reward TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'pending',  -- pending/approved/rejected
  date TEXT,
  created_at BIGINT,              -- unix ms
  decided_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_exchange_status ON exchange_requests(status);

-- 每周学习计划表（一天一行，project_ids 存 JSON 数组）
CREATE TABLE weekly_plan (
  weekday INTEGER PRIMARY KEY CHECK (weekday BETWEEN 1 AND 7),
  project_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 学习效果评分表
CREATE TABLE ratings (
  id BIGINT PRIMARY KEY,
  score INTEGER,
  note TEXT,
  date TEXT,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略（当前为单用户家庭场景，全部允许）
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon all" ON projects FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all" ON checkins FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all" ON exchange_requests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all" ON weekly_plan FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all" ON ratings FOR ALL TO anon USING (true) WITH CHECK (true);
```

### 主题系统

**v2.0 默认：奥特曼主题**
- 主色调：红银（奥特曼配色）
- 打卡特效：奥特曼发射光线
- 兑换成功：变身动画
- 图标：Lucide Icons（统一风格）

**可切换主题：**
- 皮卡丘主题（黄黑配色，精灵球元素）
- 汪汪队主题（蓝色调）
- 主题切换入口：设置页面

### 积分拨付功能

家长可以临时拨付额外积分（不受打卡项目限制）：
```
┌─────────────────────────────┐
│  💰 拨付积分                 │
│                             │
│  分数: [___] +10 +50 +100   │
│  原因: _______________      │
│  （如：表现好、帮忙做家务）  │
│                             │
│  [确认拨付]                 │
└─────────────────────────────┘
```

- 拨付记录单独标记为"💰拨付"，区别于正常打卡
- 积分不能变负数：兑换时校验余额，不足则提示"积分不够哦，再攒攒~"

### 每周统计报告

每周日晚自动生成，通过微信推送给QC：

```
📊 皮卡丘本周积分报告（6/2-6/8）

总积分: 2,304 → 2,458 (+154)

✅ 打卡完成: 28/35项 (80%)
🏆 本周最佳: 练字(5天连续)
📈 学习效果: 平均2.3分

分类统计:
  🍚 饮食: +18
  📚 学习: +42
  🏃 运动: +8
  🧹 生活: +5
  ⭐ 评价: +12
  💰 拨付: +20
  📺 兑换: -30

🔥 连续打卡: 练字5天 | 阅读3天

💡 建议: 数学本周打卡较少，可以关注一下
```

---

## 七、素材资源

### 图标库
- **Lucide Icons**：https://lucide.dev/icons/
- **许可**：ISC（免费商用，无需署名）
- **使用方式**：SVG格式，放入 `src/icons/` 目录

#### 图标映射
| 用途 | 图标名称 | 说明 |
|------|----------|------|
| 饮食 | `utensils-crossed` | 餐具 |
| 运动 | `dumbbell` | 哑铃 |
| 学习 | `book-open` | 书本 |
| 生活 | `home` | 家 |
| 评价 | `star` | 星星 |
| 打卡 | `check-circle` | 勾选 |
| 兑换 | `gift` | 礼物 |
| 历史 | `clock` | 时钟 |
| 连续3天 | `flame` | 火焰 |
| 连续5天 | `zap` | 闪电 |
| 连续7天 | `rainbow` | 彩虹 |
| 里程碑 | `trophy` | 奖杯 |

### 音效资源
- **Freesound.org**：https://freesound.org/
- **许可**：CC0（免费商用，无需署名）
- **推荐音效包**：Kenney.nl（https://kenney.nl/assets/category:Audio）

#### 音效映射
| 用途 | 搜索关键词 | 时长 | 风格 |
|------|------------|------|------|
| 打卡 | `coin collect` | 0.3-0.5秒 | 清脆、短促 |
| 升级 | `level up` | 0.8-1.5秒 | 欢快、上升感 |
| 兑换成功 | `success fanfare` | 1-2秒 | 庆祝、明亮 |
| 里程碑 | `trophy celebration` | 1.5-2秒 | 庄重、成就感 |

### 奥特曼素材（用户自备）
- **App Logo**：512x512 PNG（有版权，用户自备）
- **变身特效**：Lottie动画或PNG序列（有版权，用户自备）

### Lottie动画（可选）
- **LottieFiles**：https://lottiefiles.com/
- **推荐动画**：金币飞出、星星闪烁、庆祝彩带

---

## 八、开发进度

### P0（MVP）✅ 已完成
1. 打卡加分功能
2. 总积分显示
3. 兑换申请+确认
4. 历史记录
5. 本地存储（IndexedDB）
6. 种子数据（默认项目）

### P1（体验优化）✅ 已完成
7. 金币飞出动画 ✅
8. 奥特曼变身特效 ✅
9. 里程碑动画 ✅
10. 连续打卡徽章 ✅
11. 每周统计报告 ✅
12. 设置页面（主题切换，3 套主题）✅
13. 学习效果评分 ✅
14. 家长端专属页面 ✅
15. 项目管理 ✅
16. 每周学习计划（按星期配置）✅

### P2（锦上添花）✅ 已完成
17. 奥特曼5级特效（素材已到位，UltramanEffect.vue 实现）✅
18. 音效集成（wav 文件 + Web Audio 合成回退）✅
19. Supabase 云同步（推送/拉取/双向）✅
20. PWA 配置（vite-plugin-pwa，离线可用）✅
21. 图标系统（Lucide Icons，替代 emoji）✅

### 额外实现（设计文档未列但已交付）
22. 拨付积分（家长手动加减分，category='拨付'）✅
23. 云同步面板（推送/拉取/同步 三按钮）✅
24. 主题系统：3 套（奥特曼/我的世界/皮卡丘），后两套待启用 ✅

### 待部署
- Vercel 公网部署
- Supabase 建表 + RLS 策略
- 学习机 PWA 安装

---

## 九、部署流程

### 云托管部署（Cloudflare Pages + Supabase）

> 选 Cloudflare Pages：`*.pages.dev` 域名国内可访问，免费无限带宽，无需翻墙。

**步骤1：注册账号**
- Cloudflare：https://dash.cloudflare.com/sign-up（邮箱注册，不需信用卡）
- Supabase：https://supabase.com（GitHub 登录）

**步骤2：配置 Supabase**
- 创建项目 `pikachu-points`
- 选择 Singapore 区域
- 在 SQL Editor 执行建表 SQL（见 README.md）

**步骤3：部署到 Cloudflare Pages**
- Workers & Pages → Create → Pages → Connect to Git
- 选 GitHub 仓库，Framework 自动识别 Vite
- Build: `npm run build` / Output: `dist`
- 环境变量：`VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
- 自动部署，拿到 `https://pikachu-points.pages.dev`

**步骤4：学习机使用**
- 浏览器打开 `https://pikachu-points.pages.dev`
- 菜单 → "添加到主屏幕" → PWA 全屏模式
- 数据自动同步（家长审批自动推，孩子端 30s 自动拉）

---

## 十、后续迭代

### 主题扩展
- 皮卡丘主题（黄黑配色）
- 汪汪队主题（蓝色调）
- 我的世界主题（像素风）

### 功能扩展
- 多孩子支持
- 家庭排行榜
- 任务模板导入
- 数据导出（Excel/PDF）

### 技术优化
- 离线缓存优化
- 推送通知（Web Push）
- 数据加密

---

*设计文档 v2.1，代码已交付 P0+P1+P2 全部功能，待云托管部署。*
