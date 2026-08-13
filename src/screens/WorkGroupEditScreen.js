import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ScrollView, Modal, Alert, Switch,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { formatScore } from '../utils/outputGenerator';
import { showAlert, showConfirm } from '../lib/alert';
import TimeWheelPicker, { generateWorkTimeOptions } from '../components/TimeWheelPicker';

// 主题色变量
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

// 分类卡片颜色循环
const CARD_COLORS = [
  { bg: '#dbeafe', text: '#1e3a5f' },
  { bg: '#dcfce7', text: '#16a34a' },
  { bg: '#fed7aa', text: '#d97706' },
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#cffafe', text: '#0891b2' },
  { bg: '#fce7f3', text: '#be185d' },
];

function WorkGroupEditScreen({ navigation, route }) {
  const { categories, dispatch, getGroupById, getGroupScore, searchSteps, excludeMode, excludedSeqs } = useApp();

  const groupId = route.params?.groupId;
  const isNew = route.params?.isNew;
  const group = getGroupById(groupId);

  // 本地状态：车号输入（受控，实时同步到全局）
  const [trainInput, setTrainInput] = useState(group?.train || '');
  // 搜索关键字
  const [searchKeyword, setSearchKeyword] = useState('');

  // 编辑弹窗状态
  const [contentModal, setContentModal] = useState({ visible: false, seq: null, value: '' });
  const [timeModal, setTimeModal] = useState({ visible: false, seq: null, start: '', end: '' });
  const [bianhaoModal, setBianhaoModal] = useState({ visible: false, seq: null, value: '' });

  // 作业组不存在（可能被删除）
  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>作业组不存在</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>该作业组已被删除</Text>
        </View>
      </View>
    );
  }

  const isLinxiu = group.isLinxiu;
  const multiplier = isLinxiu ? 1.5 : 1;
  const groupScore = getGroupScore(group);

  // 车号输入变化时同步到全局
  const handleTrainChange = (text) => {
    setTrainInput(text);
    dispatch({ type: 'UPDATE_WORK_GROUP', payload: { groupId, updates: { train: text } } });
  };

  // 临修开关变化
  const handleLinxiuChange = (val) => {
    dispatch({ type: 'UPDATE_WORK_GROUP', payload: { groupId, updates: { isLinxiu: val } } });
  };

  // 搜索结果
  const searchResults = searchKeyword.trim() ? searchSteps(searchKeyword) : [];
  const hasSearch = searchKeyword.trim().length > 0;

  // 判断工步是否已在该作业组中
  const isInGroup = (seq) => group.items.some(it => it.seq === seq);

  // 判断工步是否在排除列表中（排除模式下不可添加）
  const isExcluded = (seq) => excludeMode && excludedSeqs.includes(seq);

  // 退出排除模式
  const handleExitExcludeMode = () => {
    dispatch({ type: 'EXIT_EXCLUDE_MODE' });
  };

  // 添加工步到作业组
  const handleAddStep = (step) => {
    const category = categories.find(c => c.id === step.categoryId);
    dispatch({ type: 'ADD_ITEM_TO_GROUP', payload: { groupId, step, category } });
  };

  // 从作业组删除工步
  const handleRemoveItem = (seq) => {
    dispatch({ type: 'REMOVE_ITEM_FROM_GROUP', payload: { groupId, seq } });
  };

  // 数量增减
  const handleQuantity = (seq, delta, current) => {
    const next = Math.max(1, current + delta);
    dispatch({ type: 'UPDATE_GROUP_ITEM', payload: { groupId, seq, updates: { quantity: next } } });
  };

  // 打开内容编辑弹窗
  const openContentModal = (item) => {
    setContentModal({ visible: true, seq: item.seq, value: item.content || item.name });
  };
  const saveContent = () => {
    dispatch({ type: 'UPDATE_GROUP_ITEM', payload: { groupId, seq: contentModal.seq, updates: { content: contentModal.value } } });
    setContentModal({ visible: false, seq: null, value: '' });
  };

  // 打开时间编辑弹窗
  const openTimeModal = (item) => {
    const parts = item.timeRange ? item.timeRange.split('-') : ['', ''];
    setTimeModal({ visible: true, seq: item.seq, start: parts[0] || '', end: parts[1] || '' });
  };
  const saveTime = () => {
    const range = `${timeModal.start}-${timeModal.end}`;
    dispatch({ type: 'UPDATE_GROUP_ITEM', payload: { groupId, seq: timeModal.seq, updates: { timeRange: range } } });
    setTimeModal({ visible: false, seq: null, start: '', end: '' });
  };

  // 打开编号编辑弹窗
  const openBianhaoModal = (item) => {
    setBianhaoModal({ visible: true, seq: item.seq, value: item.bianhao || '' });
  };
  const saveBianhao = () => {
    dispatch({ type: 'UPDATE_GROUP_ITEM', payload: { groupId, seq: bianhaoModal.seq, updates: { bianhao: bianhaoModal.value } } });
    setBianhaoModal({ visible: false, seq: null, value: '' });
  };

  // 点击分类卡片，进入分类详情（传groupId）
  const handleCategoryPress = (category) => {
    navigation.navigate('CategoryDetail', {
      categoryId: category.id,
      categoryName: category.short_name,
      groupId,
    });
  };

  // 删除整个作业组
  const handleDeleteGroup = () => {
    showConfirm('删除作业组', `确定要删除此作业组吗？\n车号：${trainInput || '无'} · ${group.items.length}个工步`, () => {
      dispatch({ type: 'DELETE_WORK_GROUP', payload: { groupId } });
      navigation.goBack();
    });
  };

  // 渲染搜索结果项
  const renderSearchResult = ({ item }) => {
    const inGroup = isInGroup(item.seq);
    const excluded = isExcluded(item.seq);
    return (
      <View style={[styles.searchItem, inGroup && styles.searchItemInGroup, excluded && styles.searchItemExcluded]}>
        <View style={styles.searchSeq}>
          <Text style={styles.searchSeqText}>{item.seq}</Text>
        </View>
        <View style={styles.searchInfo}>
          <Text style={styles.searchName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.searchCategory}>{item.categoryName}</Text>
        </View>
        <View style={styles.searchRight}>
          <Text style={styles.searchScoreText}>{formatScore(item.score)}</Text>
          {inGroup || excluded ? (
            <Text style={styles.addedText}>已选</Text>
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
      </View>
    );
  };

  // 渲染分类卡片
  const renderCategoryCard = ({ item, index }) => {
    const color = CARD_COLORS[index % CARD_COLORS.length];
    const icon = item.short_name.charAt(0);
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        activeOpacity={0.85}
        onPress={() => handleCategoryPress(item)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: color.bg }]}>
          <Text style={[styles.categoryIconText, { color: color.text }]}>{icon}</Text>
        </View>
        <Text style={styles.categoryName} numberOfLines={2}>
          {item.short_name}
        </Text>
        <Text style={styles.categoryCount}>{item.steps.length}个工步</Text>
      </TouchableOpacity>
    );
  };

  // 渲染已选工步项
  const renderItem = ({ item }) => {
    const score = item.score * item.quantity * multiplier;
    const displayContent = item.content || item.name;
    const borderColor = isLinxiu ? COLORS.accent : COLORS.primary;

    return (
      <View style={[styles.cartItem, { borderLeftColor: borderColor }]}>
        {/* 顶部行：序号 + 内容(可编辑) + 删除 */}
        <View style={styles.itemTop}>
          <View style={[styles.seqTag, { backgroundColor: borderColor }]}>
            <Text style={styles.seqText}>{item.seq}</Text>
          </View>
          <TouchableOpacity style={styles.contentBtn} onPress={() => openContentModal(item)} activeOpacity={0.7}>
            <Text style={styles.itemName} numberOfLines={2}>{displayContent}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => handleRemoveItem(item.seq)}
          >
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 底部行：数量控制 + 工分 */}
        <View style={styles.itemBottom}>
          <View style={styles.qtyControl}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => handleQuantity(item.seq, -1, item.quantity)}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => handleQuantity(item.seq, 1, item.quantity)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.scoreText}>{formatScore(score)}分</Text>
        </View>

        {/* 时间段行 */}
        <TouchableOpacity style={styles.timeRow} onPress={() => openTimeModal(item)}>
          <Text style={styles.timeText}>
            {item.timeRange ? item.timeRange : '设置时间'}
          </Text>
        </TouchableOpacity>

        {/* 编号行 */}
        <TouchableOpacity style={styles.bianhaoRow} onPress={() => openBianhaoModal(item)}>
          <View style={styles.bianhaoTag}>
            <Text style={styles.bianhaoText}>
              {item.bianhao ? `编号: ${item.bianhao}` : '设置编号'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. 顶部导航栏：返回 + 车号输入 + 临修开关 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <TextInput
            style={styles.trainInput}
            placeholder="输入车号（可留空）"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={trainInput}
            onChangeText={handleTrainChange}
          />
        </View>
        <View style={styles.linxiuSwitchWrap}>
          <Text style={styles.linxiuLabel}>临修</Text>
          <Switch
            value={isLinxiu}
            onValueChange={handleLinxiuChange}
            trackColor={{ false: '#767577', true: COLORS.accent }}
            thumbColor={isLinxiu ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* 排除模式横幅 */}
      {excludeMode && (
        <View style={styles.excludeBanner}>
          <Text style={styles.excludeBannerText}>排除模式 · 已选过的项点不可重复添加</Text>
          <TouchableOpacity style={styles.exitExcludeBtn} onPress={handleExitExcludeMode}>
            <Text style={styles.exitExcludeBtnText}>退出模式</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. 搜索栏 */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索工步名称或序号"
            placeholderTextColor={COLORS.textLight}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            returnKeyType="search"
          />
        </View>

        {/* 3. 搜索结果 / 分类浏览 */}
        {hasSearch ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>搜索结果（{searchResults.length}）</Text>
            {searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>未找到匹配工步</Text>
              </View>
            ) : (
              <View>
                {searchResults.map((item) => renderSearchResult({ item }))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>分类浏览（{categories.length}）</Text>
            <View style={styles.categoryGrid}>
              {categories.map((item, index) => renderCategoryCard({ item, index }))}
            </View>
          </View>
        )}

        {/* 4. 已选工步列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            已选工步（{group.items.length}）
          </Text>
          {group.items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>暂无工步</Text>
            </View>
          ) : (
            <View>
              {group.items.map((item) => renderItem({ item }))}
            </View>
          )}
        </View>

        {/* 底部留白 */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* 5. 底部浮动栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomCount}>
            {group.items.length} 项{isLinxiu ? ' · 临修×1.5' : ''}
          </Text>
          <Text style={styles.bottomScore}>小计：{formatScore(groupScore)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteGroupBtn}
          activeOpacity={0.85}
          onPress={handleDeleteGroup}
        >
          <Text style={styles.deleteGroupBtnText}>删除</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.saveBtnText}>保存</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>编辑时间段</Text>

            {/* 常用时间段快捷选择 */}
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
                  onSelect={(t) => setTimeModal({ ...timeModal, start: t })}
                />
              </View>
              <View style={styles.timePickerCol}>
                <Text style={styles.timePickerLabel}>结束</Text>
                <TimeWheelPicker
                  times={generateWorkTimeOptions()}
                  selectedValue={timeModal.end}
                  onSelect={(t) => setTimeModal({ ...timeModal, end: t })}
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

  // 1. 顶部导航栏
  navBar: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 12,
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
  navCenter: {
    flex: 1,
    marginHorizontal: 6,
  },
  trainInput: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
  },
  linxiuSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  linxiuLabel: {
    color: '#ffffff',
    fontSize: 12,
    marginRight: 6,
    fontWeight: '500',
  },

  // 排除模式横幅
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

  // 内容区
  body: {
    flex: 1,
  },

  // 2. 搜索栏
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },

  // 区块容器
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },

  // 搜索结果项
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchItemInGroup: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentBg,
  },
  searchItemExcluded: {
    opacity: 0.55,
  },
  addBtnDisabled: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    opacity: 0.4,
  },
  addBtnDisabledText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  searchSeq: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.accentBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchSeqText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  searchInfo: {
    flex: 1,
    marginRight: 10,
  },
  searchName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 18,
  },
  searchCategory: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
  },
  searchRight: {
    alignItems: 'flex-end',
  },
  searchScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  addedText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },

  // 分类卡片
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryIconText: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    minHeight: 36,
    lineHeight: 18,
  },
  categoryCount: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6,
    fontWeight: '500',
  },

  // 已选工步卡片
  cartItem: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seqTag: {
    minWidth: 34,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  seqText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  contentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 18,
  },
  editHint: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.6,
  },
  deleteBtn: {
    color: COLORS.danger,
    fontSize: 18,
    fontWeight: '700',
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  timeRow: {
    marginTop: 10,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  bianhaoRow: {
    marginTop: 8,
  },
  bianhaoTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bianhaoText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '500',
  },

  // 空状态
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
  },

  // 5. 底部浮动栏
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
    fontWeight: '500',
    color: COLORS.text,
  },
  bottomScore: {
    fontSize: 12,
    color: COLORS.accent,
    marginTop: 3,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteGroupBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  deleteGroupBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // 弹窗通用样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
    marginTop: 10,
    fontWeight: '500',
  },
  // 常用时间段快捷选择
  quickTimeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  quickTimeTag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickTimeTagActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  quickTimeText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  quickTimeTextActive: {
    color: '#ffffff',
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
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  modalConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default WorkGroupEditScreen;
