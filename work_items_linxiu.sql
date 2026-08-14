-- ============================================
-- 工步级临修开关 - 数据库字段添加
-- 在 Supabase Dashboard > SQL Editor 中执行
-- 作用：给 work_items 表添加 is_linxiu 字段，支持单个工步独立设置临修
-- ============================================

-- 添加 is_linxiu 字段（默认 false）
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS is_linxiu BOOLEAN DEFAULT FALSE;

-- 将已有作业组中 is_linxiu=true 的作业组下的所有工步同步为临修
-- （保留历史数据一致性：之前组级临修的工步现在也标记为工步级临修）
UPDATE work_items
SET is_linxiu = TRUE
WHERE group_id IN (
  SELECT id FROM work_groups WHERE is_linxiu = TRUE
);

-- 验证
SELECT '工步级临修字段添加完成！' as message;
