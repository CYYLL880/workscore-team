import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase, empNoToEmail } from '../lib/supabase';
import { showAlert, showConfirm } from '../lib/alert';

const COLORS = {
  primary: '#0f172a',
  accent: '#3b82f6',
  accentBg: '#eff6ff',
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textLight: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  admin: '#8b5cf6',
};

export default function UserManagementScreen({ navigation }) {
  const { user, profile, isAdmin, isSuperAdmin, signOut } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 编辑弹窗
  const [editModal, setEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [saving, setSaving] = useState(false);

  // 删除弹窗（二次密码确认）
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePwd, setDeletePwd] = useState('');
  const [deleting, setDeleting] = useState(false);

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, emp_no, name, role, created_at')
        .order('emp_no', { ascending: true });
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      showAlert('加载失败', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 打开编辑弹窗
  const openEdit = (u) => {
    setEditUser(u);
    setEditName(u.name || '');
    setEditRole(u.role || 'user');
    setEditModal(true);
  };

  // 保存修改
  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showAlert('提示', '姓名不能为空');
      return;
    }
    setSaving(true);
    try {
      // 1. 更新姓名（admin 和 super_admin 都可以）
      const { error: nameError } = await supabase
        .from('profiles')
        .update({ name: editName.trim() })
        .eq('id', editUser.id);
      if (nameError) throw nameError;

      // 2. 如果角色有变化且当前用户是 super_admin，调用 RPC 修改角色
      if (editRole !== editUser.role && isSuperAdmin) {
        const { error: roleError } = await supabase.rpc('super_admin_set_role', {
          target_user_id: editUser.id,
          new_role: editRole,
        });
        if (roleError) throw roleError;
      }

      // 更新本地列表
      setUsers(prev => prev.map(u =>
        u.id === editUser.id ? { ...u, name: editName.trim(), role: editRole } : u
      ));
      setEditModal(false);
      showAlert('成功', '用户信息已更新');
    } catch (e) {
      showAlert('保存失败', e.message);
    } finally {
      setSaving(false);
    }
  };

  // 打开删除弹窗
  const openDelete = (u) => {
    setDeleteTarget(u);
    setDeletePwd('');
    setDeleteModal(true);
  };

  // 确认删除（验证密码 + 调用 RPC）
  const handleConfirmDelete = async () => {
    if (!deletePwd.trim()) {
      showAlert('提示', '请输入您的密码以确认');
      return;
    }
    setDeleting(true);
    try {
      // 1. 验证管理员密码
      const { error: pwdError } = await supabase.auth.signInWithPassword({
        email: empNoToEmail(profile.emp_no),
        password: deletePwd,
      });
      if (pwdError) {
        showAlert('密码错误', '您输入的密码不正确');
        setDeleting(false);
        return;
      }

      // 2. 调用 RPC 删除用户（级联删除所有数据）
      const { error: delError } = await supabase.rpc('admin_delete_user', {
        p_target: deleteTarget.id,
      });
      if (delError) throw delError;

      // 3. 更新本地列表
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteModal(false);
      showAlert('删除成功', `用户 ${deleteTarget.name}（${deleteTarget.emp_no}）及其所有数据已删除`);
    } catch (e) {
      showAlert('删除失败', e.message);
    } finally {
      setDeleting(false);
    }
  };

  // 渲染用户卡片
  const renderUser = ({ item }) => {
    const isSelf = item.id === user?.id;
    const isSuperAdminUser = item.role === 'super_admin';
    const isAdminUser = item.role === 'admin';
    // super_admin 用户不可编辑/删除（除非是自己且想改姓名）
    const canEdit = !isSuperAdminUser;
    const canDelete = !isSuperAdminUser && !isSelf;
    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.userName}>{item.name}</Text>
            {isSuperAdminUser && (
              <View style={styles.superAdminBadge}>
                <Text style={styles.superAdminBadgeText}>最高管理员</Text>
              </View>
            )}
            {isAdminUser && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>管理员</Text>
              </View>
            )}
            {isSelf && (
              <View style={styles.selfBadge}>
                <Text style={styles.selfBadgeText}>我</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmpNo}>工号 {item.emp_no}</Text>
        </View>
        <View style={styles.userActions}>
          {canEdit ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => openEdit(item)}
            >
              <Text style={styles.editBtnText}>编辑</Text>
            </TouchableOpacity>
          ) : isSuperAdminUser && isSelf ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => openEdit(item)}
            >
              <Text style={styles.editBtnText}>改名</Text>
            </TouchableOpacity>
          ) : null}
          {canDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => openDelete(item)}
            >
              <Text style={styles.deleteBtnText}>删除</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>加载用户列表...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部头部 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Home')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>用户管理</Text>
            <Text style={styles.headerSubtitle}>{users.length} 位成员</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => showConfirm('退出登录', '确定要退出登录吗？', signOut)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.logoutText}>退出</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadUsers(); }}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>团队成员</Text>
          <View>
            {users.map((item, index) => (
              <View key={item.id}>
                {renderUser({ item })}
                {index < users.length - 1 && <View style={{ height: 10 }} />}
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* 编辑弹窗 */}
      <Modal visible={editModal} transparent animationType="fade" onRequestClose={() => setEditModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>编辑用户</Text>
            <Text style={styles.modalSubtitle}>工号 {editUser?.emp_no}</Text>

            <Text style={styles.label}>姓名</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="输入姓名"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>角色{isSuperAdmin ? '' : '（仅最高管理员可修改）'}</Text>
            {isSuperAdmin ? (
              <View style={styles.roleSwitcher}>
                <TouchableOpacity
                  style={[styles.roleBtn, editRole === 'user' && styles.roleBtnActive]}
                  onPress={() => setEditRole('user')}
                >
                  <Text style={[styles.roleBtnText, editRole === 'user' && styles.roleBtnTextActive]}>
                    普通用户
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, editRole === 'admin' && styles.roleBtnAdminActive]}
                  onPress={() => setEditRole('admin')}
                >
                  <Text style={[styles.roleBtnText, editRole === 'admin' && styles.roleBtnTextActive]}>
                    管理员
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.roleDisplay}>
                <Text style={styles.roleDisplayText}>
                  {editUser?.role === 'admin' ? '管理员' : editUser?.role === 'super_admin' ? '最高管理员' : '普通用户'}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, saving && { opacity: 0.5 }]}
                disabled={saving}
                onPress={handleSaveEdit}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 删除弹窗（二次密码确认） */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleDanger}>删除用户</Text>
            <Text style={styles.modalSubtitle}>
              {deleteTarget?.name}（工号 {deleteTarget?.emp_no}）
            </Text>
            <Text style={styles.warningText}>
              此操作将永久删除该用户账号及其所有作业组、工步数据，不可恢复。
            </Text>

            <Text style={styles.label}>请输入您的密码确认</Text>
            <TextInput
              style={styles.input}
              value={deletePwd}
              onChangeText={setDeletePwd}
              placeholder="输入您的登录密码"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModal(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleting && { opacity: 0.5 }]}
                disabled={deleting}
                onPress={handleConfirmDelete}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmText}>确认删除</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textLight,
  },

  // 头部
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },

  // 内容
  body: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // 用户卡片
  userCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  adminBadge: {
    backgroundColor: COLORS.admin + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  adminBadgeText: {
    color: COLORS.admin,
    fontSize: 11,
    fontWeight: '600',
  },
  superAdminBadge: {
    backgroundColor: COLORS.danger + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  superAdminBadgeText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  roleDisplay: {
    height: 44,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginBottom: 12,
  },
  roleDisplayText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  selfBadge: {
    backgroundColor: COLORS.accentBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  selfBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  userEmpNo: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.accentBg,
    marginRight: 8,
  },
  editBtnText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.danger + '15',
  },
  deleteBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },

  // 弹窗
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalTitleDanger: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.warning,
    backgroundColor: COLORS.warning + '15',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  roleSwitcher: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  roleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  roleBtnActive: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.accent,
  },
  roleBtnAdminActive: {
    backgroundColor: COLORS.admin + '20',
    borderColor: COLORS.admin,
  },
  roleBtnText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  roleBtnTextActive: {
    color: COLORS.accent,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  cancelText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  deleteConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
  },
  confirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
