-- ============================================
-- 最高管理员（super_admin）设置与保护策略
-- 在 Supabase Dashboard > SQL Editor 中执行
-- ============================================

-- 1. 将工号1895用户设置为 super_admin 角色
UPDATE profiles
SET role = 'super_admin', name = '管理员', emp_no = '1895'
WHERE id = '5feeb7ed-4c2a-42c6-8dfc-9d14c65031a1';

-- 确保记录存在（如果上面的 UPDATE 没命中，则 INSERT）
INSERT INTO profiles (id, emp_no, name, role)
SELECT '5feeb7ed-4c2a-42c6-8dfc-9d14c65031a1', '1895', '管理员', 'super_admin'
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE id = '5feeb7ed-4c2a-42c6-8dfc-9d14c65031a1'
);

-- ============================================
-- 2. 修改 RLS 策略：管理员不能删除/修改 super_admin
-- ============================================

-- 管理员更新策略：admin 和 super_admin 可更新所有 profile
-- super_admin 的保护由触发器 protect_super_admin_role 处理
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- 管理员删除策略：admin 和 super_admin 可删除所有 profile
-- super_admin 的保护由触发器 prevent_delete_super_admin 处理
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- 3. 触发器：保护 super_admin 的 role 不被非 super_admin 修改
-- ============================================

CREATE OR REPLACE FUNCTION protect_super_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果修改了 role 字段
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- 只有 super_admin 可以修改 role
    IF NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    ) THEN
      RAISE EXCEPTION '只有最高管理员可以修改用户角色';
    END IF;
  END IF;

  -- 不允许将 super_admin 降级（除非是自己操作）
  IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
    IF OLD.id != auth.uid() THEN
      RAISE EXCEPTION '不可剥夺最高管理员权限';
    END IF;
  END IF;

  -- 不允许修改 super_admin 的其他信息（除非是自己）
  IF OLD.role = 'super_admin' AND OLD.id != auth.uid() THEN
    RAISE EXCEPTION '不可修改最高管理员信息';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_super_admin ON profiles;
CREATE TRIGGER trg_protect_super_admin
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_super_admin_role();

-- ============================================
-- 4. 触发器：阻止删除 super_admin
-- ============================================

CREATE OR REPLACE FUNCTION prevent_delete_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'super_admin' THEN
    RAISE EXCEPTION '不可删除最高管理员账户';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_delete_super_admin ON profiles;
CREATE TRIGGER trg_prevent_delete_super_admin
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delete_super_admin();

-- ============================================
-- 5. 更新 admin_delete_user RPC：排除 super_admin
-- ============================================

CREATE OR REPLACE FUNCTION admin_delete_user(p_target UUID)
RETURNS VOID AS $$
BEGIN
  -- 验证调用者是管理员
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION '无权限';
  END IF;

  -- 不允许删除 super_admin
  IF EXISTS (
    SELECT 1 FROM profiles WHERE id = p_target AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION '不可删除最高管理员账户';
  END IF;

  -- 删除用户数据
  DELETE FROM work_items WHERE group_id IN (
    SELECT id FROM work_groups WHERE user_id = p_target
  );
  DELETE FROM work_groups WHERE user_id = p_target;
  DELETE FROM profiles WHERE id = p_target;

  -- 删除 auth.users 记录
  DELETE FROM auth.users WHERE id = p_target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 新增 RPC：super_admin 修改用户角色
-- ============================================

CREATE OR REPLACE FUNCTION super_admin_set_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  -- 验证调用者是 super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION '只有最高管理员可以修改用户角色';
  END IF;

  -- 不允许修改 super_admin 的角色（除非是自己）
  IF EXISTS (
    SELECT 1 FROM profiles WHERE id = target_user_id AND role = 'super_admin'
  ) AND target_user_id != auth.uid() THEN
    RAISE EXCEPTION '不可修改其他最高管理员的角色';
  END IF;

  -- 只允许设置为 user 或 admin
  IF new_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION '无效的角色值';
  END IF;

  UPDATE profiles SET role = new_role WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 验证
SELECT id, emp_no, name, role FROM profiles WHERE emp_no = '1895';
