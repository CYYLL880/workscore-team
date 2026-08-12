-- ============================================
-- 管理员用户管理功能 - SQL 脚本
-- ============================================

-- 1. 创建管理员删除用户的 RPC 函数（SECURITY DEFINER 绕过 RLS）
-- 删除 auth.users 后，profiles/work_groups/work_items 因 ON DELETE CASCADE 自动删除
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_target UUID)
RETURNS VOID AS $$
DECLARE
  v_caller_role VARCHAR(20);
  v_target_exists BOOLEAN;
BEGIN
  -- 验证调用者存在且是 admin
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION '无法验证调用者身份';
  END IF;
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION '权限不足：需要管理员权限';
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

-- 2. 更新 profiles RLS：允许 admin 更新所有用户的 profile
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 3. 提升工号 10002 为管理员（测试账号）
UPDATE public.profiles SET role = 'admin' WHERE emp_no = '10002';

-- 4. 验证
SELECT id, emp_no, name, role FROM public.profiles ORDER BY emp_no;

-- 完成
SELECT '管理员用户管理功能初始化完成！' as message;
