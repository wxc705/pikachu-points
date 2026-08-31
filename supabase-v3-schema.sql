-- ============================================
-- 皮卡丘积分系统 v3 — Supabase 建表 SQL
-- 2026-08-31 by Nate
-- 
-- 使用方法：打开 Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================

-- 0. 先检查现有表是否存在（跑完下面会告诉你哪些表缺）
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- ============================================
-- 1. checkins（打卡积分 — 原系统已有，需加 task_id 列）
-- ============================================
-- 如果表不存在，创建：
CREATE TABLE IF NOT EXISTS checkins (
  id BIGINT PRIMARY KEY,
  project_id BIGINT,
  project_name TEXT,
  category TEXT,
  points_earned INT NOT NULL DEFAULT 0,
  note TEXT,
  checked_by TEXT DEFAULT 'parent',
  date DATE,
  task_id BIGINT,                    -- v3 新增：课表任务打卡时写入
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 如果表已存在但缺 task_id 列，加列：
DO $$ BEGIN
  ALTER TABLE checkins ADD COLUMN IF NOT EXISTS task_id BIGINT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- RLS（行级安全）— 允许所有人读写（单用户应用，不需要复杂权限）
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_checkins" ON checkins FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. exchange_requests（申请兑换 — 原系统已有）
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_requests (
  id BIGINT PRIMARY KEY,
  reward TEXT,
  points_cost INT DEFAULT 0,
  note TEXT,
  status TEXT DEFAULT 'pending',
  viewed BOOLEAN DEFAULT false,
  date DATE,
  created_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exchange_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_requests" ON exchange_requests FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. projects（项目管理 — 原系统已有）
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT PRIMARY KEY,
  category TEXT,
  name TEXT,
  points INT DEFAULT 1,
  point_range TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_projects" ON projects FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 4. weekly_plan（每周计划 — 原系统已有）
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_plan (
  weekday INT PRIMARY KEY,
  project_ids JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE weekly_plan ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_plan" ON weekly_plan FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. weekly_tasks（v3 新增 — 课表配置，两端共享）
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  weekday INT NOT NULL,             -- 1=周一 ... 7=周日
  time_slot TEXT,
  name TEXT NOT NULL,
  points INT DEFAULT 1,
  category TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_weekday ON weekly_tasks(weekday);

ALTER TABLE weekly_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_weekly_tasks" ON weekly_tasks FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 完成！跑完后执行以下验证：
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
-- 应该看到：checkins, exchange_requests, projects, weekly_plan, weekly_tasks
-- ============================================
