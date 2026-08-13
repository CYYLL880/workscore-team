-- ============================================
-- 工分总表功能 - RLS 策略补充脚本
-- 在 Supabase Dashboard > SQL Editor 中执行
-- ============================================

-- 1. 管理员可更新所有 work_groups（用于确认/撤销他人作业组状态）
DROP POLICY IF EXISTS "work_groups_update_admin" ON work_groups;
CREATE POLICY "work_groups_update_admin" ON work_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- 2. 管理员可更新所有 work_items（用于编辑他人作业组内容）
DROP POLICY IF EXISTS "work_items_update_admin" ON work_items;
CREATE POLICY "work_items_update_admin" ON work_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- 3. 管理员可删除所有 work_groups（用于管理他人作业组）
DROP POLICY IF EXISTS "work_groups_delete_admin" ON work_groups;
CREATE POLICY "work_groups_delete_admin" ON work_groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- 4. 管理员可删除所有 work_items
DROP POLICY IF EXISTS "work_items_delete_admin" ON work_items;
CREATE POLICY "work_items_delete_admin" ON work_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- 5. profiles 表已在 realtime publication 中，无需重复添加
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 验证
SELECT '工分总表 RLS 策略补充完成！' as message;
