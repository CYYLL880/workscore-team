import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { showAlert, showConfirm } from '../lib/alert';

const COLORS = {
  primary: '#0f172a',
  primaryLight: '#334155',
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
  purple: '#8b5cf6',
  purpleBg: '#f5f3ff',
  orange: '#f97316',
  orangeBg: '#fff7ed',
  gray: '#64748b',
  grayBg: '#f1f5f9',
  dangerBg: '#fef2f2',
};

function HomeScreen({ navigation }) {
  const { profile, isAdmin, signOut } = useAuth();

  // 修改密码弹窗
  const [pwdModal, setPwdModal] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const handleChangePassword = async () => {
    if (!newPwd || !confirmPwd) {
      showAlert('提示', '请填写新密码');
      return;
    }
    if (newPwd.length < 6) {
      showAlert('提示', '新密码至少6位');
      return;
    }
    if (newPwd !== confirmPwd) {
      showAlert('提示', '两次密码不一致');
      return;
    }
    setChangingPwd(true);
    try {
      // 如填写了旧密码，先验证
      if (oldPwd) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: profile?.emp_no + '@workscores.app',
          password: oldPwd,
        });
        if (signInError) {
          showAlert('错误', '旧密码不正确');
          setChangingPwd(false);
          return;
        }
      }
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      showAlert('成功', '密码已修改');
      closePwdModal();
    } catch (e) {
      showAlert('错误', e.message || '修改失败');
    } finally {
      setChangingPwd(false);
    }
  };

  // 关闭密码弹窗并清空输入框
  const closePwdModal = () => {
    setPwdModal(false);
    setOldPwd(''); setNewPwd(''); setConfirmPwd('');
  };

  const handleLogout = () => {
    showConfirm('确认登出', '确定要退出登录吗？', () => signOut());
  };

  // 按钮配置
  const buttons = [
    {
      key: 'scoresheet',
      title: '工分总表',
      subtitle: '查看与编辑工分',
      icon: '📊',
      bgColor: COLORS.accentBg,
      iconColor: COLORS.accent,
      onPress: () => navigation.navigate('ScoreSheet'),
      visible: true,
    },
    {
      key: 'users',
      title: '用户管理',
      subtitle: '管理团队成员',
      icon: '👥',
      bgColor: COLORS.purpleBg,
      iconColor: COLORS.purple,
      onPress: () => navigation.navigate('UserManagement'),
      visible: isAdmin,
    },
    {
      key: 'customize',
      title: '工分细则编辑',
      subtitle: '工种与工步管理',
      icon: '⚙',
      bgColor: COLORS.orangeBg,
      iconColor: COLORS.orange,
      onPress: () => navigation.navigate('Customize'),
      visible: isAdmin,
    },
    {
      key: 'password',
      title: '修改密码',
      subtitle: '更改账户密码',
      icon: '🔒',
      bgColor: COLORS.grayBg,
      iconColor: COLORS.gray,
      onPress: () => { setOldPwd(''); setNewPwd(''); setConfirmPwd(''); setPwdModal(true); },
      visible: true,
    },
    {
      key: 'logout',
      title: '登出',
      subtitle: '退出当前账号',
      icon: '↗',
      bgColor: COLORS.dangerBg,
      iconColor: COLORS.danger,
      onPress: handleLogout,
      visible: true,
    },
  ];

  const visibleButtons = buttons.filter(b => b.visible);

  return (
    <View style={styles.container}>
      {/* 顶部头部 + 用户信息 */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>工分统计</Text>
        <Text style={styles.appSubtitle}>2026年电子组工分细则</Text>

        {/* 用户信息卡片 */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(profile?.name || '?').charAt(0)}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{profile?.name || '未知'}</Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>管理员</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmpNo}>工号 {profile?.emp_no || '---'}</Text>
          </View>
        </View>
      </View>

      {/* 按钮网格 */}
      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyContent}
      >
        <View style={styles.grid}>
          {visibleButtons.map((btn) => (
            <TouchableOpacity
              key={btn.key}
              style={styles.gridItem}
              activeOpacity={0.85}
              onPress={btn.onPress}
            >
              <View style={[styles.cardIcon, { backgroundColor: btn.bgColor }]}>
                <Text style={[styles.cardIconText, { color: btn.iconColor }]}>
                  {btn.icon}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{btn.title}</Text>
              <Text style={styles.cardSubtitle}>{btn.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 修改密码弹窗 */}
      <Modal
        visible={pwdModal}
        transparent
        animationType="fade"
        onRequestClose={closePwdModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>修改密码</Text>

            <Text style={styles.modalLabel}>旧密码（选填，用于验证）</Text>
            <TextInput
              style={styles.modalInput}
              value={oldPwd}
              onChangeText={setOldPwd}
              placeholder="输入旧密码"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />

            <Text style={styles.modalLabel}>新密码（至少6位）</Text>
            <TextInput
              style={styles.modalInput}
              value={newPwd}
              onChangeText={setNewPwd}
              placeholder="输入新密码"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />

            <Text style={styles.modalLabel}>确认新密码</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholder="再次输入新密码"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={closePwdModal}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                disabled={changingPwd}
                onPress={handleChangePassword}
              >
                {changingPwd ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>确认修改</Text>
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

  // 头部
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  appTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  // 用户信息卡片
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  adminBadge: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  userEmpNo: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  // 按钮网格
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconText: {
    fontSize: 26,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    textAlign: 'center',
  },

  // 修改密码弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancel: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalConfirm: {
    backgroundColor: COLORS.accent,
  },
  modalCancelText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default HomeScreen;
