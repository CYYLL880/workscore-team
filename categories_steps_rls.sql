-- ============================================
-- 工分细则编辑权限修复 - RLS 策略
-- 在 Supabase Dashboard > SQL Editor 中执行
-- 作用：允许 admin 和 super_admin 在前端直接增删改 categories 和 steps 表
-- ============================================

-- ========== categories 表：管理员可写 ==========

-- INSERT
DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin" ON categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin" ON categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- DELETE
DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- ========== steps 表：管理员可写 ==========

-- INSERT
DROP POLICY IF EXISTS "steps_insert_admin" ON steps;
CREATE POLICY "steps_insert_admin" ON steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "steps_update_admin" ON steps;
CREATE POLICY "steps_update_admin" ON steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- DELETE
DROP POLICY IF EXISTS "steps_delete_admin" ON steps;
CREATE POLICY "steps_delete_admin" ON steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- ========== 修复 admin_delete_user：super_admin 也能调用 ==========
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_target UUID)
RETURNS VOID AS $$
DECLARE
  v_caller_role VARCHAR(20);
  v_target_exists BOOLEAN;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION '无法验证调用者身份';
  END IF;
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION '权限不足：需要管理员权限';
  END IF;

  -- super_admin 不可被删除
  IF p_target = (
    SELECT id FROM public.profiles WHERE role = 'super_admin' LIMIT 1
  ) THEN
    RAISE EXCEPTION '最高管理员不可被删除';
  END IF;

  -- 不允许删除自己
  IF p_target = auth.uid() THEN
    RAISE EXCEPTION '不能删除自己';
  END IF;

  -- 检查目标用户存在
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_target) INTO v_target_exists;
  IF NOT v_target_exists THEN
    RAISE EXCEPTION '目标用户不存在';
  END IF;

  -- 删除 auth.users（级联删除 profiles/work_groups/work_items）
  DELETE FROM auth.users WHERE id = p_target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 验证
SELECT '工分细则编辑权限修复完成！admin 和 super_admin 现在可以增删改 categories 和 steps' as message;
