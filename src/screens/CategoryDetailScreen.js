import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { formatScore } from '../utils/outputGenerator';

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
};

function CategoryDetailScreen({ navigation, route }) {
  const { getCategoryById, getGroupById, dispatch, getGroupScore, excludeMode, excludedSeqs } = useApp();

  // 分类内搜索关键字
  const [searchKeyword, setSearchKeyword] = useState('');

  // 当前分类与作业组
  const categoryId = route.params?.categoryId;
  const groupId = route.params?.groupId;
  const category = getCategoryById(categoryId);
  const group = getGroupById(groupId);

  // 在当前分类内搜索工步（按序号或名称匹配）
  const filteredSteps = (() => {
    if (!category) return [];
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return category.steps;
    return category.steps.filter(
      step => String(step.seq).includes(kw) || step.name.toLowerCase().includes(kw)
    );
  })();

  // 判断工步是否已在作业组中
  const isInGroup = (seq) => group ? group.items.some(item => item.seq === seq) : false;

  // 判断工步是否在排除列表中（排除模式下不可添加）
  const isExcluded = (seq) => excludeMode && excludedSeqs.includes(seq);

  // 退出排除模式
  const handleExitExcludeMode = () => {
    dispatch({ type: 'EXIT_EXCLUDE_MODE' });
  };

  // 添加工步到作业组
  const handleAddStep = (step) => {
    if (!group) return;
    dispatch({ type: 'ADD_ITEM_TO_GROUP', payload: { groupId, step, category } });
  };

  // 渲染工步项
  const renderStepItem = ({ item }) => {
    const inGroup = isInGroup(item.seq);
    const excluded = isExcluded(item.seq);
    const unitText = item.unit ? `每${item.unit}` : '无单位';
    const subInfo = `${unitText} · 工分 ${formatScore(item.score)}`;
    return (
      <View style={[styles.stepItem, inGroup && styles.stepItemInGroup, excluded && styles.stepItemExcluded]}>
        <View style={styles.seqTag}>
          <Text style={styles.seqText}>{item.seq}</Text>
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.stepSub}>{subInfo}</Text>
        </View>
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
    );
  };

  const groupScore = group ? getGroupScore(group) : 0;
  const itemCount = group ? group.items.length : 0;

  // 分类不存在的兜底界面
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
      {/* 1. 顶部导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{category.short_name}</Text>
        <Text style={styles.navCount}>{category.steps.length}项</Text>
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

      {/* 2. 分类内搜索栏 */}
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

      {/* 3. 工步列表 */}
      <FlatList
        style={styles.list}
        data={filteredSteps}
        keyExtractor={item => String(item.seq)}
        renderItem={renderStepItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>未找到匹配工步</Text>
          </View>
        }
      />

      {/* 4. 底部浮动栏：显示当前作业组信息 */}
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

  // 排除模式横幅
  excludeBanner: {
    backgroundColor: '#f97316',
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

  // 2. 分类内搜索栏
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
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },

  // 3. 工步列表
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
    paddingBottom: 100,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  stepItemInGroup: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentBg,
  },
  stepItemExcluded: {
    opacity: 0.55,
  },
  addBtnDisabled: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.4,
  },
  addBtnDisabledText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
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
  addedText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },

  // 空状态
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },

  // 4. 底部浮动栏
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
});

export default CategoryDetailScreen;
