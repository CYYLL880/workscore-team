import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { showAlert, showConfirm } from '../lib/alert';

// 主题色变量
const COLORS = {
  primary: '#1e3a5f',
  primaryLight: '#2d5a8c',
  accent: '#d97706',
  bg: '#f1f5f9',
  card: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
  success: '#16a34a',
  danger: '#dc2626',
};

function CartScreen({ navigation }) {
  const { cart, session, dispatch, getTotalScore } = useApp();

  // 时间编辑弹窗状态
  const [timeModal, setTimeModal] = useState({ visible: false, seq: null, start: '', end: '' });
  // 编号编辑弹窗状态
  const [bianhaoModal, setBianhaoModal] = useState({ visible: false, seq: null, value: '' });
  // 车号选择弹窗状态
  const [trainModal, setTrainModal] = useState({ visible: false, seq: null });
  // 内容编辑弹窗状态
  const [contentModal, setContentModal] = useState({ visible: false, seq: null, value: '' });

  // 今日日期
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;

  // 临修倍率
  const multiplier = session.isLinxiu ? 1.5 : 1;

  // 计算单项工分
  const getItemScore = (item) => item.score * item.quantity * multiplier;

  // 清空购物车（带确认）
  const handleClear = () => {
    if (cart.length === 0) return;
    showConfirm('确认清空', '确定要清空查看栏中的所有工步吗？', () => dispatch({ type: 'CLEAR_CART' }));
  };

  // 删除单项
  const handleRemove = (seq) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: { seq } });
  };

  // 数量增减（最小1）
  const handleQuantity = (seq, delta, current) => {
    const next = Math.max(1, current + delta);
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { seq, updates: { quantity: next } } });
  };

  // 选择车号
  const handleSelectTrain = (seq, train) => {
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { seq, updates: { train } } });
    setTrainModal({ visible: false, seq: null });
  };

  // 打开时间编辑弹窗
  const openTimeModal = (item) => {
    const parts = item.timeRange ? item.timeRange.split('-') : ['', ''];
    setTimeModal({ visible: true, seq: item.seq, start: parts[0] || '', end: parts[1] || '' });
  };

  // 保存时间
  const saveTime = () => {
    const range = `${timeModal.start}-${timeModal.end}`;
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { seq: timeModal.seq, updates: { timeRange: range } } });
    setTimeModal({ visible: false, seq: null, start: '', end: '' });
  };

  // 打开编号编辑弹窗
  const openBianhaoModal = (item) => {
    setBianhaoModal({ visible: true, seq: item.seq, value: item.bianhao || '' });
  };

  // 保存编号
  const saveBianhao = () => {
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { seq: bianhaoModal.seq, updates: { bianhao: bianhaoModal.value } } });
    setBianhaoModal({ visible: false, seq: null, value: '' });
  };

  // 打开内容编辑弹窗
  const openContentModal = (item) => {
    setContentModal({ visible: true, seq: item.seq, value: item.content || item.name });
  };

  // 保存内容
  const saveContent = () => {
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { seq: contentModal.seq, updates: { content: contentModal.value } } });
    setContentModal({ visible: false, seq: null, value: '' });
  };

  // 生成文本，跳转 Output 界面
  const handleGenerate = () => {
    if (cart.length === 0) {
      showAlert('提示', '查看栏为空，请先添加工步');
      return;
    }
    navigation.navigate('Output');
  };

  // 渲染购物车项
  const renderItem = ({ item, index }) => {
    const isLinxiu = session.isLinxiu;
    const borderColor = isLinxiu ? COLORS.accent : COLORS.primary;
    const score = getItemScore(item);
    const displayContent = item.content || item.name;

    return (
      <View style={[styles.cartItem, { borderLeftColor: borderColor }]}>
        {/* 顶部行：序号 + 内容(可编辑) + 删除按钮 */}
        <View style={styles.itemTop}>
          <View style={[styles.seqTag, { backgroundColor: borderColor }]}>
            <Text style={styles.seqText}>{item.seq}</Text>
          </View>
          <TouchableOpacity style={styles.contentBtn} onPress={() => openContentModal(item)} activeOpacity={0.7}>
            <Text style={styles.itemName} numberOfLines={2}>{displayContent}</Text>
            <Text style={styles.editHint}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => handleRemove(item.seq)}
          >
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 底部行：数量控制 + 车号选择 + 工分（顶部边框分隔） */}
        <View style={styles.itemBottom}>
          <View style={styles.bottomLeft}>
            {/* 数量控制 */}
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
            {/* 车号选择标签 */}
            <TouchableOpacity
              style={styles.trainTag}
              onPress={() => setTrainModal({ visible: true, seq: item.seq })}
            >
              <Text style={styles.trainTagText}>{item.train || '选择车号'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.scoreText}>{score.toFixed(1)}分</Text>
        </View>

        {/* 时间段行（点击弹出时间编辑） */}
        <TouchableOpacity style={styles.timeRow} onPress={() => openTimeModal(item)}>
          <Text style={styles.timeText}>
            {item.timeRange ? `⏰ ${item.timeRange}` : '⏰ 点击设置时间'}
          </Text>
        </TouchableOpacity>

        {/* 编号行（所有工步都可编辑编号） */}
        <TouchableOpacity style={styles.bianhaoRow} onPress={() => openBianhaoModal(item)}>
          <View style={styles.bianhaoTag}>
            <Text style={styles.bianhaoText}>
              {item.bianhao ? `编号: ${item.bianhao}` : '📋 点击设置编号'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const totalScore = getTotalScore();
  const linxiuCount = session.isLinxiu ? cart.length : 0;

  return (
    <View style={styles.container}>
      {/* 1. 顶部深蓝色头部 */}
      <View style={styles.header}>
        {/* 第一行：标题 + 清空按钮 */}
        <View style={styles.headerRow1}>
          <Text style={styles.headerTitle}>🛒 查看栏</Text>
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>清空</Text>
          </TouchableOpacity>
        </View>
        {/* 第二行：会话信息标签 */}
        <View style={styles.headerRow2}>
          <View style={styles.infoTag}>
            <Text style={styles.infoTagText}>📅 {dateStr}</Text>
          </View>
          <View style={styles.infoTag}>
            <Text style={styles.infoTagText}>🚂 {(session.trains || []).join('、') || '-'}</Text>
          </View>
          <View style={styles.infoTag}>
            <Text style={styles.infoTagText}>📦 默认数量: {session.defaultQty}</Text>
          </View>
          {session.isLinxiu && (
            <View style={styles.linxiuTag}>
              <Text style={styles.linxiuTagText}>⚠️ 临修×1.5</Text>
            </View>
          )}
        </View>
      </View>

      {/* 2. 购物车列表（可滚动） */}
      <FlatList
        style={styles.list}
        data={cart}
        keyExtractor={item => String(item.seq)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>🛒 查看栏为空</Text>
            <Text style={styles.emptySub}>请从首页添加工步</Text>
          </View>
        }
      />

      {/* 7. 底部浮动栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomCount}>
            工步 {cart.length} 项{linxiuCount > 0 ? ` · 含临修 ${linxiuCount}` : ''}
          </Text>
          <Text style={styles.bottomScore}>总工分：{totalScore.toFixed(1)}</Text>
        </View>
        <TouchableOpacity style={styles.generateBtn} activeOpacity={0.85} onPress={handleGenerate}>
          <Text style={styles.generateBtnText}>✓ 生成文本</Text>
        </TouchableOpacity>
      </View>

      {/* 5. 时间编辑弹窗 */}
      <Modal
        visible={timeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeModal({ visible: false, seq: null, start: '', end: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>编辑时间段</Text>
            <Text style={styles.modalLabel}>开始时间（HH:MM）</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="如 8:30"
              placeholderTextColor={COLORS.textLight}
              value={timeModal.start}
              onChangeText={(t) => setTimeModal({ ...timeModal, start: t })}
              keyboardType="numeric"
            />
            <Text style={styles.modalLabel}>结束时间（HH:MM）</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="如 10:30"
              placeholderTextColor={COLORS.textLight}
              value={timeModal.end}
              onChangeText={(t) => setTimeModal({ ...timeModal, end: t })}
              keyboardType="numeric"
            />
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

      {/* 6. 编号编辑弹窗（所有工步可用） */}
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
              placeholder="如 DZ23091901 或 DZ23091901/DZ26060201"
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

      {/* 7. 内容编辑弹窗 */}
      <Modal
        visible={contentModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setContentModal({ visible: false, seq: null, value: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>编辑工作内容</Text>
            <Text style={styles.modalLabel}>工作内容描述（如：报废配件两小时）</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60 }]}
              placeholder="输入工作内容描述"
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

      {/* 4. 车号选择弹窗 */}
      <Modal
        visible={trainModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setTrainModal({ visible: false, seq: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>选择车号</Text>
            {(session.trains || []).length === 0 ? (
              <Text style={styles.emptyText}>暂无车号，请在会话设置中添加</Text>
            ) : (
              <View style={styles.trainList}>
                {session.trains.map(train => (
                  <TouchableOpacity
                    key={train}
                    style={styles.trainOption}
                    onPress={() => handleSelectTrain(trainModal.seq, train)}
                  >
                    <Text style={styles.trainOptionText}>{train}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCancel, { flex: 0, marginTop: 12 }]}
              onPress={() => setTrainModal({ visible: false, seq: null })}
            >
              <Text style={styles.modalCancelText}>关闭</Text>
            </TouchableOpacity>
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

  // 1. 顶部深蓝色头部
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
  },
  headerRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearBtn: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  headerRow2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  infoTag: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  infoTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
  linxiuTag: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  linxiuTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },

  // 2. 购物车列表
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingBottom: 90,
  },
  cartItem: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  // 顶部行：序号 + 名称 + 删除
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seqTag: {
    minWidth: 32,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  seqText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 18,
    marginRight: 8,
  },
  deleteBtn: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 底部行：数量 + 车号 + 工分（顶部边框分隔）
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },

  // 3. 数量控制
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: 4,
  },

  // 4. 车号选择标签
  trainTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trainTagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  // 工分
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.accent,
  },

  // 时间段行
  timeRow: {
    marginTop: 8,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  // 编号行（仅临修）
  bianhaoRow: {
    marginTop: 6,
  },
  bianhaoTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  bianhaoText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // 空状态
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 6,
  },

  // 7. 底部浮动栏
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bottomScore: {
    fontSize: 13,
    color: COLORS.accent,
    marginTop: 2,
    fontWeight: '600',
  },
  generateBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  generateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // 弹窗通用样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalCancel: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // 车号选择列表
  trainList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trainOption: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    margin: 4,
  },
  trainOptionText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CartScreen;
