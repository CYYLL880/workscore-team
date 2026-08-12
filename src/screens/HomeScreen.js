import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ScrollView, Modal, Platform } from 'react-native';
import { useApp } from '../context/AppContext';
import { formatScore } from '../utils/outputGenerator';
import { showAlert, showConfirm } from '../lib/alert';

// 统一主题色 - 现代化简洁配色
const COLORS = {
  primary: '#0f172a',       // 深石板色（主色）
  primaryLight: '#334155',  // 浅石板色
  accent: '#3b82f6',        // 现代蓝（强调色）
  accentLight: '#60a5fa',   // 浅蓝
  accentBg: '#eff6ff',      // 蓝色背景
  bg: '#f8fafc',            // 极浅灰背景
  card: '#ffffff',          // 卡片白
  text: '#0f172a',          // 主文字
  textLight: '#64748b',     // 次要文字
  textMuted: '#94a3b8',     // 弱化文字
  border: '#e2e8f0',        // 边框
  borderDash: '#cbd5e1',    // 虚线边框
  success: '#10b981',       // 现代绿
  danger: '#ef4444',        // 现代红
  warning: '#f59e0b',       // 警告橙
  linxiu: '#f97316',        // 临修橙
};

function HomeScreen({ navigation }) {
  const { workGroups, dispatch, createWorkGroup, restoreWorkGroups, getTotalScore, getTotalItemCount, getGroupScore, history } = useApp();

  const [activeTab, setActiveTab] = useState('groups');

  // 密码验证
  const [pwdModal, setPwdModal] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const CUSTOMIZE_PWD = 'DZZGF20260630';

  // 排除模式跳转标志
  const pendingExcludeNav = useRef(false);

  // 新建作业组
  const handleCreateGroup = async () => {
    try {
      const newId = await createWorkGroup({ train: '', isLinxiu: false });
      navigation.navigate('WorkGroupEdit', { groupId: newId, isNew: true });
    } catch (e) {
      showAlert('错误', '创建作业组失败：' + (e.message || e));
    }
  };

  const handleEditGroup = (groupId) => {
    navigation.navigate('WorkGroupEdit', { groupId, isNew: false });
  };

  // 删除作业组（跨平台确认）
  const handleDeleteGroup = (groupId) => {
    const doDelete = () => dispatch({ type: 'DELETE_WORK_GROUP', payload: { groupId } });
    showConfirm('确认删除', '确定要删除该作业组吗？', doDelete);
  };

  // 生成文字
  const handleGenerate = () => {
    if (workGroups.length === 0 || getTotalItemCount() === 0) {
      showAlert('提示', '请先添加作业组和工步');
      return;
    }
    navigation.navigate('Output');
  };

  // 复用历史记录
  const onReuse = async (record) => {
    if (record.workGroups && record.workGroups.length > 0) {
      try {
        await restoreWorkGroups(record.workGroups);
        showAlert('提示', '历史记录已复用');
        setActiveTab('groups');
      } catch (e) {
        showAlert('错误', '复用失败：' + (e.message || e));
      }
    }
  };

  // 排除模式：恢复作业组结构（车号/临修）但工步为空，历史中的工步标注"已选"且不可选
  const onExclude = async (record) => {
    if (record.workGroups && record.workGroups.length > 0) {
      try {
        // 收集所有作业组的工步 seq（去重）
        const seqs = [];
        record.workGroups.forEach(g => {
          (g.items || []).forEach(it => {
            if (!seqs.includes(it.seq)) seqs.push(it.seq);
          });
        });
        // 恢复作业组结构但清空工步
        const emptyGroups = record.workGroups.map(g => ({
          train: g.train || '',
          isLinxiu: g.isLinxiu || false,
          items: [],
        }));
        await restoreWorkGroups(emptyGroups);
        dispatch({ type: 'ENTER_EXCLUDE_MODE', payload: seqs });
        pendingExcludeNav.current = true;
      } catch (e) {
        showAlert('错误', '复用失败：' + (e.message || e));
      }
    }
  };

  // 排除模式恢复后自动跳转到第一个作业组
  useEffect(() => {
    if (pendingExcludeNav.current && workGroups.length > 0) {
      pendingExcludeNav.current = false;
      navigation.navigate('WorkGroupEdit', { groupId: workGroups[0].id, isNew: false });
    }
  }, [workGroups, navigation]);

  // 删除历史记录
  const onDeleteHistory = (recordId) => {
    const doDelete = () => dispatch({ type: 'DELETE_HISTORY', payload: { id: recordId } });
    showConfirm('确认删除', '确定要删除该历史记录吗？', doDelete);
  };

  // 渲染作业组卡片
  const renderGroupCard = ({ item }) => {
    const score = getGroupScore(item);
    const itemCount = item.items.length;
    const trainLabel = item.train || '无车号';
    return (
      <View style={styles.groupCardWrap}>
        <TouchableOpacity
          style={styles.groupCard}
          activeOpacity={0.9}
          onPress={() => handleEditGroup(item.id)}
        >
          <View style={styles.groupCardTop}>
            <View style={styles.groupTrainWrap}>
              <Text style={styles.groupTrain} numberOfLines={1}>{trainLabel}</Text>
            </View>
            {item.isLinxiu && (
              <View style={styles.linxiuBadge}>
                <Text style={styles.linxiuBadgeText}>临修 ×1.5</Text>
              </View>
            )}
          </View>
          <View style={styles.groupCardBottom}>
            <Text style={styles.groupItemCount}>
              {itemCount > 0 ? `${itemCount} 个工步` : '暂无工步'}
            </Text>
            <Text style={styles.groupScore}>{formatScore(score)} 分</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteGroupBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => handleDeleteGroup(item.id)}
        >
          <Text style={styles.deleteGroupText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 渲染历史记录项
  const renderHistoryItem = ({ item }) => {
    const date = new Date(item.date);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const trains = (item.workGroups || []).map(g => g.train).filter(Boolean).join('、');
    const itemCount = (item.workGroups || []).reduce((s, g) => s + (g.items?.length || 0), 0);
    return (
      <View style={styles.historyItem}>
        <View style={styles.historyDate}>
          <Text style={styles.historyDay}>{day}</Text>
          <Text style={styles.historyMonth}>{month}月</Text>
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyTrain} numberOfLines={1}>
            {trains || '无车号'}
          </Text>
          <Text style={styles.historyMeta}>
            {itemCount} 项 · {item.totalScore || 0} 分
          </Text>
        </View>
        <View style={styles.historyActions}>
          <TouchableOpacity style={styles.reuseBtn} onPress={() => onReuse(item)}>
            <Text style={styles.reuseBtnText}>复用</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.excludeBtn} onPress={() => onExclude(item)}>
            <Text style={styles.excludeBtnText}>排除</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyDelBtn} onPress={() => onDeleteHistory(item.id)}>
            <Text style={styles.historyDelText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const totalScore = getTotalScore();
  const totalCount = getTotalItemCount();

  return (
    <View style={styles.container}>
      {/* 顶部头部 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>工分统计</Text>
          <Text style={styles.headerSubtitle}>2026年电子组工分细则</Text>
        </View>
        <TouchableOpacity
          style={styles.gearBtn}
          onPress={() => { setPwdInput(''); setPwdModal(true); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.gearIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tab切换栏 */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
            onPress={() => setActiveTab('groups')}
          >
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
              作业组 {workGroups.length > 0 ? workGroups.length : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              历史记录 {history.length > 0 ? history.length : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 作业组Tab */}
        {activeTab === 'groups' && (
          <View style={styles.section}>
            {workGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>暂无作业组</Text>
              </View>
            ) : (
              <FlatList
                data={workGroups}
                keyExtractor={item => item.id}
                renderItem={renderGroupCard}
                scrollEnabled={false}
              />
            )}

            {/* 新增作业组按钮 */}
            <TouchableOpacity
              style={styles.addCard}
              activeOpacity={0.9}
              onPress={handleCreateGroup}
            >
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addText}>新增作业组</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 历史记录Tab */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>暂无历史记录</Text>
              </View>
            ) : (
              <FlatList
                data={history}
                keyExtractor={item => String(item.id || item.date)}
                renderItem={renderHistoryItem}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 底部浮动栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomCount}>
            {workGroups.length} 组 · {totalCount} 项
          </Text>
          <Text style={styles.bottomScore}>总工分 {formatScore(totalScore)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.generateBtn, (workGroups.length === 0 || totalCount === 0) && styles.generateBtnDisabled]}
          activeOpacity={0.9}
          onPress={handleGenerate}
        >
          <Text style={styles.generateBtnText}>生成文字</Text>
        </TouchableOpacity>
      </View>

      {/* 密码验证弹窗 */}
      <Modal visible={pwdModal} transparent animationType="fade" onRequestClose={() => setPwdModal(false)}>
        <View style={styles.pwdOverlay}>
          <View style={styles.pwdContent}>
            <Text style={styles.pwdTitle}>请输入密码</Text>
            <TextInput
              style={styles.pwdInput}
              value={pwdInput}
              onChangeText={setPwdInput}
              placeholder="输入管理密码"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoFocus
            />
            <View style={styles.pwdActions}>
              <TouchableOpacity style={styles.pwdCancelBtn} onPress={() => setPwdModal(false)}>
                <Text style={styles.pwdCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pwdConfirmBtn, !pwdInput && { opacity: 0.4 }]}
                disabled={!pwdInput}
                onPress={() => {
                  if (pwdInput === CUSTOMIZE_PWD) {
                    setPwdModal(false);
                    navigation.navigate('Customize');
                  } else {
                    showAlert('提示', '密码错误');
                  }
                }}
              >
                <Text style={styles.pwdConfirmText}>确认</Text>
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

  // 顶部头部
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
  },
  gearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gearIcon: {
    color: '#ffffff',
    fontSize: 20,
  },

  // 密码验证弹窗
  pwdOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pwdContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  pwdTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  pwdInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pwdActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  pwdCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pwdCancelText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  pwdConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
  },
  pwdConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  body: {
    flex: 1,
  },

  // Tab切换栏
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: '#ffffff',
  },

  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },

  // 作业组卡片
  groupCardWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  groupCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  groupCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  groupTrainWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupTrainIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  groupTrain: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  linxiuBadge: {
    backgroundColor: COLORS.linxiu,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  linxiuBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  groupCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  groupItemCount: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  groupScore: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent,
  },
  deleteGroupBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteGroupText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '700',
  },

  // 新增作业组按钮
  addCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.borderDash,
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  addIcon: {
    fontSize: 28,
    color: COLORS.borderDash,
    fontWeight: '300',
    lineHeight: 32,
  },
  addText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
    fontWeight: '600',
  },

  // 历史记录项
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  historyDate: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyDay: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 19,
  },
  historyMonth: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  historyInfo: {
    flex: 1,
    marginRight: 10,
  },
  historyTrain: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  historyMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 3,
    fontWeight: '500',
  },
  reuseBtn: {
    backgroundColor: COLORS.accentBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reuseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  excludeBtn: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  excludeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.linxiu,
  },
  historyDelBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDelText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },

  // 空状态
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
  },

  // 底部浮动栏
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottomScore: {
    fontSize: 13,
    color: COLORS.accent,
    marginTop: 3,
    fontWeight: '700',
  },
  generateBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },
  generateBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  generateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default HomeScreen;
