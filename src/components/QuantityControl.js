import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';

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
};

// 快捷数量
const QUICK_VALUES = [1, 2, 3, 5, 10];

/**
 * 数量步进器 + 点击数字直接输入
 * @param {number} value - 当前数量
 * @param {function} onChange - 数量变化回调（保证 >= 1）
 */
function QuantityControl({ value, onChange }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const openModal = () => {
    setInputValue(String(value));
    setModalVisible(true);
  };

  const apply = (v) => {
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 1 && n <= 999) onChange(n);
    setModalVisible(false);
  };

  return (
    <View style={styles.qtyControl}>
      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={() => onChange(Math.max(1, value - 1))}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.qtyBtnText}>−</Text>
      </TouchableOpacity>

      {/* 点击数字直接输入 */}
      <TouchableOpacity
        style={styles.qtyValueWrap}
        onPress={openModal}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      >
        <Text style={styles.qtyValue}>{value}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={() => onChange(value + 1)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.qtyBtnText}>+</Text>
      </TouchableOpacity>

      {/* 数量输入弹窗 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>设置数量</Text>

            {/* 快捷数字 */}
            <View style={styles.quickRow}>
              {QUICK_VALUES.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.quickTag, value === v && styles.quickTagActive]}
                  onPress={() => apply(v)}
                >
                  <Text style={[styles.quickText, value === v && styles.quickTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="number-pad"
              maxLength={3}
              autoFocus
              selectTextOnFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={() => apply(inputValue)}
              >
                <Text style={styles.modalConfirmText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  qtyValueWrap: {
    minWidth: 34,
    paddingVertical: 3,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: COLORS.accentBg,
    alignItems: 'center',
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
    textAlign: 'center',
  },

  // 弹窗
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
    marginBottom: 14,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickTag: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  quickTagActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  quickText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 16,
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

export default QuantityControl;
