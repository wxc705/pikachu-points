-- daily_homework 表（v4）
-- 在 Supabase Dashboard → SQL Editor 中执行
CREATE TABLE IF NOT EXISTS daily_homework (
  id BIGINT PRIMARY KEY,
  date TEXT NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT DEFAULT '家长录入',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 按日期查询索引
CREATE INDEX IF NOT EXISTS idx_daily_homework_date ON daily_homework (date);

-- RLS（与现有表保持一致）
ALTER TABLE daily_homework ENABLE ROW LEVEL SECURITY;

-- anon 用户可读写（与现有表一致）
CREATE POLICY "Allow anon full access" ON daily_homework
  FOR ALL
  USING (true)
  WITH CHECK (true);
