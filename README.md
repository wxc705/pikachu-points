# 皮卡丘积分 / Pikachu Points

> 6 岁孩子的积分奖励系统，Ultraman / 皮卡丘主题。
> 本地优先（IndexedDB），云同步可选（Supabase），PWA 离线可用。

## ✨ 功能

- ✅ 打卡加分（金币飞出动画）
- ✅ 兑换申请 + 奥特曼变身特效（5 档 Lv.1-Lv.5 形象）
- ✅ 历史记录（按日分组）
- ✅ 学习效果评分（家长评分 + 评语）
- ✅ 连续打卡徽章（4 档）
- ✅ 里程碑动画（100 / 500 / 1000 / 5000 分）
- ✅ 每周报告（7 天柱状图 + 打卡日历 + 分类打卡率 + 导出 PNG）
- ✅ 主题切换（奥特曼 / 我的世界 / 皮卡丘）
- ✅ PWA（加到主屏、离线用）
- ✅ 家长端（待审批兑换、拨付积分、项目管理、每周学习计划）
- ✅ 每周学习计划（按星期配推荐项目，孩子打卡页置顶）
- ✅ 云同步（Supabase，跨设备/跨网）
- ✅ Web Audio 音效（打卡叮、兑换成功、里程碑）
- ✅ Lucide Icons 替代 emoji

## 🚀 快速启动

```bash
# 1. 装依赖
npm install

# 2. 配 Supabase（可选，不配也能用纯本地）
cp .env.example .env
# 编辑 .env，填入 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY

# 3. 启 dev
npm run dev
# 浏览器打开 http://localhost:5173/

# 4. 打包
npm run build
# 产物在 dist/
```

## ☁️ Supabase 配置（云同步）

### 1. 注册 Supabase

1. 打开 https://supabase.com
2. 用 GitHub 登录
3. 点 "New Project"
4. 填项目名 `pikachu-points`、选 Singapore 区域、设数据库密码
5. 等 1-2 分钟

### 2. 拿 URL + key

`Settings → API` 页面：

- **Project URL** = `VITE_SUPABASE_URL`
- **anon / publishable key**（不是 service_role）= `VITE_SUPABASE_PUBLISHABLE_KEY`

填进 `.env`：

```env
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### 3. 建 SQL schema

Supabase Dashboard → SQL Editor → 跑：

```sql
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS exchange_requests CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS weekly_plan CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;

CREATE TABLE projects (
 id BIGINT PRIMARY KEY,
 category TEXT NOT NULL,
 name TEXT NOT NULL,
 points INTEGER DEFAULT 0,
 point_range JSONB,
 sort_order INTEGER DEFAULT 0,
 is_active BOOLEAN DEFAULT true,
 updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_projects_category ON projects(category);

CREATE TABLE checkins (
 id BIGINT PRIMARY KEY,
 project_id BIGINT,
 project_name TEXT,
 category TEXT,
 points_earned INTEGER DEFAULT 0,
 note TEXT,
 checked_by TEXT,
 date TEXT,
 created_at BIGINT,
 updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_checkins_date ON checkins(date);
CREATE INDEX idx_checkins_project ON checkins(project_id);

CREATE TABLE exchange_requests (
 id BIGINT PRIMARY KEY,
 reward TEXT NOT NULL,
 points_cost INTEGER NOT NULL,
 note TEXT,
 status TEXT DEFAULT 'pending',
 viewed BOOLEAN DEFAULT false,
 date TEXT,
 created_at BIGINT,
 decided_at BIGINT,
 updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_exchange_status ON exchange_requests(status);

CREATE TABLE weekly_plan (
 weekday INTEGER PRIMARY KEY CHECK (weekday BETWEEN 1 AND 7),
 project_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
 updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ratings (
 id BIGINT PRIMARY KEY,
 score INTEGER,
 note TEXT,
 date TEXT,
 created_at BIGINT,
 updated_at TIMESTAMPTZ DEFAULT now()
);

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

### 4. 测试

进家长端 → 点"⬆️ 推送" → 看到"✅ 推送成功" → Supabase Dashboard → Table Editor 看到数据进库。

## 🌐 Cloudflare Pages 部署（公网访问，国内可用）

> 选 Cloudflare Pages 而非 Vercel：免费无限带宽，`*.pages.dev` 域名国内通常可访问，无需翻墙。

### 1. 注册 Cloudflare

1. 打开 https://dash.cloudflare.com/sign-up
2. 用邮箱注册（不需要信用卡）

### 2. 部署

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权 GitHub，选 `wxc705/pikachu-points` 仓库
3. **Build settings**（自动识别 Vite，无需改）：
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Environment Variables** 添加 2 个：
   - `VITE_SUPABASE_URL` = `https://xxxxxx.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...`
5. 点 **Save and Deploy**
6. 1-2 分钟后拿到 `https://pikachu-points.pages.dev`

### 3. 跨设备访问

| 设备 | 怎么用 |
|---|---|
| **学习机**（13 寸安卓）| 浏览器打开 pages.dev URL → 菜单"添加到主屏幕" → PWA 全屏 |
| **你的手机** | 同一个 URL → 打开家长端 → 审批 / 拨付 / 看今日数据 |
| **爷爷奶奶家电脑** | 同一个 URL → 看孩子本周报告（家长端）|

**数据自动同步**：家长审批后**自动推送**到云 → 孩子端每 30s **自动拉取** → 无需手动操作。**两台设备数据**通过 Supabase **共享**。

## 📁 项目结构

```
pikachu-points/
├── public/
│ ├── pwa-*.png # PWA 图标
│ ├── favicon.png
│ ├── sounds/ # (预留) MP3 音效
│ └── ultraman/ # 奥特曼 5 张图 (Lv.1-5)
├── src/
│ ├── components/
│ │ ├── CoinBurst.vue # 金币飞出动画
│ │ ├── MilestoneEffect.vue # 里程碑全屏
│ │ └── UltramanEffect.vue # 奥特曼变身 (5 档)
│ ├── services/
│ │ ├── db.js # IndexedDB CRUD
│ │ ├── seed.js # 默认项目 seed
│ │ ├── supabase.js # Supabase 客户端
│ │ ├── sync.js # 推送 / 拉取 / 同步
│ │ └── sound.js # Web Audio 音效
│ ├── stores/
│ │ └── points.js # Pinia 主 store
│ ├── themes/
│ │ └── index.js # 主题配置 (3 套)
│ ├── utils/
│ │ ├── level.js # 奥特曼等级映射
│ │ └── weekday.js # 周几工具
│ ├── views/
│ │ ├── Home.vue
│ │ ├── Checkin.vue
│ │ ├── Exchange.vue
│ │ ├── History.vue
│ │ ├── Rating.vue
│ │ ├── WeeklyReport.vue
│ │ ├── WeeklyPlan.vue # 每周学习计划
│ │ ├── ParentDashboard.vue
│ │ ├── ProjectManage.vue
│ │ └── Settings.vue
│ ├── App.vue
│ ├── main.js
│ ├── router.js
│ └── style.css
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── .env # 本地环境变量（不 commit）
```

## 🎮 路由

| 路径 | 页面 | 谁用 |
|---|---|---|
| `/` | 首页（总积分 + 快捷） | 孩子/家长 |
| `/#/checkin` | 打卡 | 孩子 |
| `/#/exchange` | 兑换申请 | 孩子 |
| `/#/history` | 历史 | 孩子/家长 |
| `/#/rating` | 学习效果评分 | 家长 |
| `/#/report` | 每周报告 | 家长 |
| `/#/parent` | 家长端首页 | 家长 |
| `/#/weekly-plan` | 每周学习计划 | 家长 |
| `/#/projects` | 项目管理 | 家长 |
| `/#/settings` | 设置（主题）| 家长 |

## 🔧 技术栈

- **Vue 3** + Composition API
- **Vite 5** (build)
- **Pinia** (state)
- **Vue Router 4** (hash mode)
- **Tailwind CSS 3** (utility)
- **idb** (IndexedDB Promise 包装)
- **@supabase/supabase-js 2** (云同步)
- **lucide-vue-next** (图标)
- **html2canvas** (PNG 导出)
- **vite-plugin-pwa** (PWA + service worker)
- **Web Audio API** (合成音效)

## 📝 常见问题

**Q: 不配 Supabase 能用吗？**
A: 能。纯本地 IndexedDB，所有功能 OK。只是数据不能跨设备。

**Q: 想换主题？**
A: 进"设置"页。看 3 套主题（奥特曼/我的世界/皮卡丘），目前只有奥特曼启用。改 `src/themes/index.js` 删 `disabled: true` 即可启用其他。

**Q: 想替换奥特曼图？**
A: 把 PNG 放进 `public/ultraman/level1.png` ~ `level5.png` 即可（建议正方形 PNG）。

**Q: 想换项目（打卡项）？**
A: 进家长端 → "项目"页 → 增删改、停用、调顺序。

**Q: 部署后学习机卡？**
A: 第一次加载要下载 ~3MB（Vite + Supabase + PWA 图标），service worker 缓存后秒开。
