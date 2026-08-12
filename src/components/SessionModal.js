import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

// 主题色（与全局设计变量保持一致）
const COLORS = {
  primary: '#1e3a5f',
  accent: '#d97706',
  bg: '#f1f5f9',
  card: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
};

/**
 * 会话设置弹窗
 * 从底部滑出，用于在开始一次工分统计会话前配置：
 * - 车号列表（可添加多个，标签式显示，可删除）
 * - 默认数量
 * - 是否临修（开启后所有工分×1.5，需填编号）
 *
 * @param {boolean} visible  是否显示
 * @param {Function} onClose 关闭回调
 * @param {Function} onConfirm 确认回调，接收 { trains: string[], defaultQty: number, isLinxiu: boolean }
 */
function SessionModal({ visible, onClose, onConfirm }) {
  // 车号列表
  const [trains, setTrains] = useState([]);
  // 当前正在输入的车号
  const [trainInput, setTrainInput] = useState('');
  // 默认数量
  const [defaultQty, setDefaultQty] = useState('1');
  // 是否临修
  const [isLinxiu, setIsLinxiu] = useState(false);

  // 添加车号（去空、去重）
  const addTrain = () => {
    const value = trainInput.trim();
    if (!value) return;
    if (trains.includes(value)) {
      setTrainInput('');
      return;
    }
    setTrains(prev => [...prev, value]);
    setTrainInput('');
  };

  // 删除指定车号
  const removeTrain = train => {
    setTrains(prev => prev.filter(t => t !== train));
  };

  // 确认开始：整理数据后回调
  const handleConfirm = () => {
    const qty = parseInt(defaultQty, 10);
    onConfirm({
      trains,
      defaultQty: Number.isNaN(qty) || qty < 1 ? 1 : qty,
      isLinxiu,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        {/* 点击遮罩区域关闭弹窗 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.modal}>
          {/* 顶部拖拽手柄 */}
          <View style={styles.handle} />

          {/* 标题 */}
          <Text style={styles.title}>⚙️ 会话设置</Text>

          {/* 车号（可添加多个） */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>🚂 车号（可添加多个）</Text>
            <TextInput
              style={styles.input}
              placeholder="输入车号后回车，如：5083"
              placeholderTextColor={COLORS.textLight}
              value={trainInput}
              onChangeText={setTrainInput}
              onSubmitEditing={addTrain}
              returnKeyType="done"
            />
            <View style={styles.trainTags}>
              {trains.map(train => (
                <View key={train} style={styles.trainTag}>
                  <Text style={styles.trainTagText}>{train}</Text>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => removeTrain(train)}
                  >
                    <Text style={styles.trainTagX}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addTrain} onPress={addTrain}>
                <Text style={styles.addTrainText}>+ 添加车号</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 默认数量 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📦 默认数量</Text>
            <TextInput
              style={styles.input}
              value={defaultQty}
              onChangeText={setDefaultQty}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>

          {/* 是否临修 */}
          <View style={styles.formGroup}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>⚠️ 是否临修</Text>
              <Switch
                value={isLinxiu}
                onValueChange={setIsLinxiu}
                trackColor={{ false: '#cbd5e1', true: COLORS.accent }}
                thumbColor="#ffffff"
              />
            </View>
            {/* 开启临修后显示提示 */}
            {isLinxiu && (
              <View style={styles.linxiuHint}>
                <Text style={styles.linxiuHintText}>
                  所有工分×1.5，需填编号
                </Text>
              </View>
            )}
          </View>

          {/* 确认开始 */}
          <TouchableOpacity
            style={styles.confirmBtn}
            activeOpacity={0.85}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmBtnText}>确认开始</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  trainTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  trainTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trainTagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  trainTagX: {
    color: COLORS.primary,
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.6,
  },
  addTrain: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addTrainText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  linxiuHint: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(217,119,6,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    borderRadius: 8,
  },
  linxiuHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SessionModal;
