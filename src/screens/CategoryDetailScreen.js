import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { formatScore } from '../utils/outputGenerator';
import TimeWheelPicker, { generateWorkTimeOptions, linkEndTime } from '../components/TimeWheelPicker';
import QuantityControl from '../components/QuantityControl';

const COLORS = {
  primary: '#0f172a',
  primaryLight: '#334155',
  accent: '#3b82f6',
  accentLight: '#60a5fa',
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
  linxiu: '#f97316',
};

function CategoryDetailScreen({ navigation, route }) {
  const { getCategoryById, getGroupById, dispatch, getGroupScore, excludeMode, excludedSeqs } = useApp();

  const [searchKeyword, setSearchKeyword] = useState('');

  // 编辑 Modal 状态
  const [contentModal, setContentModal] = useState({ visible: false, seq: null, value: '' });
  const [timeModal, setTimeModal] = useState({ visible: false, seq: null, start: '', end: '' });
  const [bianhaoModal, setBianhaoModal] = useState({ visible: false, seq: null, value: '' });

  const categoryId = route.params?.categoryId;
  const groupId = route.params?.groupId;
  const category = getCategoryById(categoryId);
  const group = getGroupById(groupId);
  const isLinxiu = group?.isLinxiu || false;
  const multiplier = isLinxiu ? 1.5 : 1;

  const filteredSteps = (() => {
    if (!category) return [];
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return category.steps;
    return category.steps.filter(
      step => String(step.seq).includes(kw) || step.name.toLowerCase().includes(kw)
    );
  })();

  const isInGroup = (seq) => group ? group.items.some(item => item.seq === seq) : false;
  const isExcluded = (seq) => excludeMode && excludedSeqs.includes(seq);
  const getGroupItem = (seq) => group?.items.find(item => item.seq === seq);

  const handleAddStep = (step) => {
    if (!group) return;
    dispatch({ type: 'ADD_ITEM_TO_GROUP', payload: { groupId, step, category } });
  };

  const handleRemoveItem = (seq) => {
    dispatch({ type: 'REMOVE_ITEM_FROM_GROUP', payload: { groupId, seq } });
  };

  const handleQuantity = (seq, next) => {
    dispatch({ type: 'UPDATE_GROUP_ITEM', payload: { groupId, seq, updates: { quantity: Math.max(1, next) } } });
  };

  // 内容编辑
  const openContentModal = (item) => {
    setContentModal({ visible: true, seq: item.seq, value: item.content || item.name });
  };
  const saveContent = () => {
    dispatch({ type: 'UPDATE_GROUP_ITEM', payload: { groupId, seq: contentModal.seq, updates: { content: contentModal.value } } });
    setContentModal({ visible: false, seq: null, value: '' });
  };

  // 时间编辑
  const openTimeModal = (item) => {
    const parts = item.timeRange ? item.timeRange.split('-') : ['', ''];
    setTimeModal({ visible: true, seq: item.seq, start: parts[0] || '', end: parts[1] || '' });
  };
  const saveTime = () => {
    const range = `${timeModal.start}-${timeModal.end}`;
    dispatch({ type: 'UPDATE_GROUP_ITEM', payload: { groupId, seq: timeModal.seq, updates: { timeRange: range } } });
    setTimeModal({ visible: false, seq: null, start: '', end: '' });
  };

  // 编号编辑
  const openBianhaoModal = (item) => {
    setBianhaoModal({ visible: true, seq: item.seq, value: item.bianhao || '' });
  };
  const saveBianhao = () => {
    dispatch({ type: 'UPDATE_GROUP_ITEM', payload: { groupId, seq: bianhaoModal.seq, updates: { bianhao: bianhaoModal.value } } });
    setBianhaoModal({ visible: false, seq: null, value: '' });
  };

  // 渲染已选工步的展开编辑面板
  const renderEditPanel = (item) => {
    const score = item.score * item.quantity * multiplier;
    const borderColor = isLinxiu ? COLORS.linxiu : COLORS.accent;
    return (
      <View style={styles.editPanel}>
        {/* 数量控制 + 工分 */}
        <View style={styles.editRow}>
          <QuantityControl
            value={item.quantity}
            onChange={(v) => handleQuantity(item.seq, v)}
          />
          <Text style={[styles.editScore, { color: borderColor }]}>{formatScore(score)}分</Text>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemoveItem(item.seq)}
          >
            <Text style={styles.removeBtnText}>移除</Text>
          </TouchableOpacity>
        </View>

        {/* 工作内容 */}
        <TouchableOpacity style={styles.editField} onPress={() => openContentModal(item)} activeOpacity={0.7}>
          <Text style={styles.editFieldLabel}>内容</Text>
          <Text style={styles.editFieldValue} numberOfLines={1}>
            {item.content || item.name}
          </Text>
          <Text style={styles.editArrow}>›</Text>
        </TouchableOpacity>

        {/* 时间段 */}
        <TouchableOpacity style={styles.editField} onPress={() => openTimeModal(item)} activeOpacity={0.7}>
          <Text style={styles.editFieldLabel}>时间</Text>
          <Text style={styles.editFieldValue}>
            {item.timeRange || '点击设置'}
          </Text>
          <Text style={styles.editArrow}>›</Text>
        </TouchableOpacity>

        {/* 编号 */}
        <TouchableOpacity style={styles.editField} onPress={() => openBianhaoModal(item)} activeOpacity={0.7}>
          <Text style={styles.editFieldLabel}>编号</Text>
          <Text style={styles.editFieldValue}>
            {item.bianhao || '点击设置'}
          </Text>
          <Text style={styles.editArrow}>›</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 渲染工步项
  const renderStepItem = ({ item }) => {
    const inGroup = isInGroup(item.seq);
    const excluded = isExcluded(item.seq);
    const unitText = item.unit ? `每${item.unit}` : '无单位';
    const subInfo = `${unitText} · 工分 ${formatScore(item.score)}`;
    const groupItem = inGroup ? getGroupItem(item.seq) : null;
    const borderColor = isLinxiu ? COLORS.linxiu : COLORS.accent;

    return (
      <View style={[styles.stepItem, inGroup && { borderColor: borderColor, backgroundColor: COLORS.accentBg }]}>
        <View style={styles.stepMainRow}>
          <View style={styles.seqTag}>
            <Text style={styles.seqText}>{item.seq}</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.stepSub}>{subInfo}</Text>
          </View>
          {inGroup ? (
            <View style={styles.addedTag}>
              <Text style={styles.addedText}>✓ 已选</Text>
            </View>
          ) : excluded ? (
            <Text style={styles.excludedText}>已排除</Text>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.85}
              onPress={() => handleAddStep(item)}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* 已选时展开编辑面板 */}
        {inGroup && groupItem && renderEditPanel(groupItem)}
      </View>
    );
  };

  const groupScore = group ? getGroupScore(group) : 0;
  const itemCount = group ? group.items.length : 0;

  if (!category) {
    return (
      <View style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>分类不存在</Text>
          <View style={styles.navRight} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>未找到该分类</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{category.short_name}</Text>
        <Text style={styles.navCount}>{category.steps.length}项</Text>
      </View>

      {excludeMode && (
        <View style={styles.excludeBanner}>
          <Text style={styles.excludeBannerText}>排除模式 · 已选过的项点不可重复添加</Text>
          <TouchableOpacity style={styles.exitExcludeBtn} onPress={() => dispatch({ type: 'EXIT_EXCLUDE_MODE' })}>
            <Text style={styles.exitExcludeBtnText}>退出模式</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索"
          placeholderTextColor={COLORS.textLight}
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          returnKeyType="search"
        />
      </View>

      <FlatList
        style={styles.list}
        data={filteredSteps}
        keyExtractor={item => String(item.seq)}
        renderItem={renderStepItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchKeyword.trim() ? `未找到“${searchKeyword.trim()}”相关工步` : '该分类暂无工步'}
            </Text>
            {searchKeyword.trim() ? (
              <Text style={styles.emptySub}>请检查关键字或清空搜索浏览全部</Text>
            ) : null}
          </View>
        }
      />

      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomCount}>
            {group ? (group.train || '无车号') : '无作业组'} · {itemCount} 项
          </Text>
          <Text style={styles.bottomScore}>小计：{formatScore(groupScore)}</Text>
        </View>
        <TouchableOpacity
          style={styles.backToGroupBtn}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backToGroupBtnText}>返回</Text>
        </TouchableOpacity>
      </View>

      {/* 内容编辑弹窗 */}
      <Modal
        visible={contentModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setContentModal({ visible: false, seq: null, value: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>编辑工作内容</Text>
            <Text style={styles.modalLabel}>工作内容</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60 }]}
              placeholder="选填"
              placeholderTextColor={COLORS.textLight}
              value={contentModal.value}
              onChangeText={(t) => setContentModal({ ...contentModal, value: t })}
              autoFocus
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setContentModal({ visible: false, seq: null, value: '' })}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={saveContent}>
                <Text style={styles.modalConfirmText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 时间编辑弹窗 */}
      <Modal
        visible={timeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeModal({ visible: false, seq: null, start: '', end: '' })}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>编辑时间段</Text>
              <Text style={styles.modalLabel}>快捷选择</Text>
              <View style={styles.quickTimeWrap}>
                {[
                  { label: '上午半天', start: '8:00', end: '11:40' },
                  { label: '下午半天', start: '13:30', end: '17:30' },
                  { label: '全天', start: '8:00', end: '17:30' },
                  { label: '8:30-10:30', start: '8:30', end: '10:30' },
                  { label: '10:30-11:40', start: '10:30', end: '11:40' },
                  { label: '13:30-15:30', start: '13:30', end: '15:30' },
                  { label: '15:30-17:30', start: '15:30', end: '17:30' },
                ].map((preset) => {
                  const isActive = timeModal.start === preset.start && timeModal.end === preset.end;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.quickTimeTag, isActive && styles.quickTimeTagActive]}
                      onPress={() => setTimeModal({ ...timeModal, start: preset.start, end: preset.end })}
                    >
                      <Text style={[styles.quickTimeText, isActive && styles.quickTimeTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 滑动选择器 */}
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerCol}>
                  <Text style={styles.timePickerLabel}>开始</Text>
                  <TimeWheelPicker
                    times={generateWorkTimeOptions()}
                    selectedValue={timeModal.start}
                    onSelect={(t) => setTimeModal(prev => ({ ...prev, start: t, end: linkEndTime(t, prev.end) }))}
                  />
                </View>
                <View style={styles.timePickerCol}>
                  <Text style={styles.timePickerLabel}>结束</Text>
                  <TimeWheelPicker
                    times={generateWorkTimeOptions()}
                    selectedValue={timeModal.end}
                    onSelect={(t) => setTimeModal(prev => ({ ...prev, end: t }))}
                  />
                </View>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => setTimeModal({ visible: false, seq: null, start: '', end: '' })}
                >
                  <Text style={styles.modalCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={saveTime}>
                  <Text style={styles.modalConfirmText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 编号编辑弹窗 */}
      <Modal
        visible={bianhaoModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setBianhaoModal({ visible: false, seq: null, value: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>编辑编号</Text>
            <Text style={styles.modalLabel}>输入编号（多个用 / 分隔）</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="多个用 / 分隔"
              placeholderTextColor={COLORS.textLight}
              value={bianhaoModal.value}
              onChangeText={(t) => setBianhaoModal({ ...bianhaoModal, value: t })}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setBianhaoModal({ visible: false, seq: null, value: '' })}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={saveBianhao}>
                <Text style={styles.modalConfirmText}>保存</Text>
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
  navBar: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '500',
  },
  navTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  navCount: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
    paddingRight: 8,
  },
  navRight: {
    width: 40,
  },

  excludeBanner: {
    backgroundColor: COLORS.linxiu,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  excludeBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  exitExcludeBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 10,
  },
  exitExcludeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    margin: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
    paddingBottom: 100,
  },

  // 工步项
  stepItem: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  stepMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seqTag: {
    minWidth: 38,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  seqText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepInfo: {
    flex: 1,
    marginRight: 10,
  },
  stepName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 19,
  },
  stepSub: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textLight,
    marginTop: 3,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  addedTag: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addedText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  excludedText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  // 展开编辑面板
  editPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  editScore: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  removeBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeBtnText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '700',
  },

  editField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    width: 40,
  },
  editFieldValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  editArrow: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  emptySub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
    fontWeight: '500',
  },

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
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  bottomScore: {
    fontSize: 12,
    color: COLORS.accent,
    marginTop: 3,
    fontWeight: '700',
  },
  backToGroupBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backToGroupBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
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
    paddingVertical: 10,
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
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
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

  // 快捷时间
  quickTimeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTimeTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickTimeTagActive: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.accent,
  },
  quickTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  quickTimeTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  timePickerCol: {
    flex: 1,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
  },
});

export default CategoryDetailScreen;
