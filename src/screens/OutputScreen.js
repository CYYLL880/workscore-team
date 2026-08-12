import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../context/AppContext';
import { generateOutput, formatScore } from '../utils/outputGenerator';

// 统一主题色 - 现代化简洁配色
const COLORS = {
  primary: '#0f172a',
  accent: '#3b82f6',
  accentLight: '#60a5fa',
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textLight: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  success: '#10b981',
  darkBg: '#1e293b',
  darkText: '#e2e8f0',
  linxiu: '#f97316',
};

function OutputScreen({ navigation }) {
  const { workGroups, dispatch, getTotalScore } = useApp();

  const [outputText, setOutputText] = useState('');
  const initedRef = useRef(false);

  useEffect(() => {
    if (!initedRef.current) {
      setOutputText(generateOutput(workGroups));
      initedRef.current = true;
    }
  }, [workGroups]);

  const totalScore = getTotalScore();

  const handleRegenerate = () => {
    setOutputText(generateOutput(workGroups));
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(outputText);
      if (Platform.OS === 'web') {
        window.alert('已复制到剪贴板');
      } else {
        Alert.alert('提示', '已复制到剪贴板');
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert('复制失败');
      } else {
        Alert.alert('提示', '复制失败');
      }
    }
  };

  const handleExport = async () => {
    try {
      await Share.share({
        message: outputText,
        title: '工分文本',
      });
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert('导出失败');
      } else {
        Alert.alert('提示', '导出失败');
      }
    }
  };

  const doComplete = () => {
    dispatch({
      type: 'ADD_HISTORY',
      payload: {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        workGroups: JSON.parse(JSON.stringify(workGroups)),
        totalScore: totalScore,
        output: outputText,
      },
    });
    dispatch({ type: 'CLEAR_ALL_GROUPS' });
    navigation.popToTop();
  };

  const handleComplete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('完成后将保存到历史记录并清空所有作业组，确定吗？')) {
        doComplete();
      }
    } else {
      Alert.alert(
        '确认完成',
        '完成后将保存到历史记录并清空所有作业组，确定吗？',
        [
          { text: '取消', style: 'cancel' },
          { text: '确认完成', style: 'destructive', onPress: doComplete },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>生成工分文本</Text>
        <TouchableOpacity
          style={styles.regenerateBtn}
          onPress={handleRegenerate}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.regenerateBtnText}>重生成</Text>
        </TouchableOpacity>
      </View>

      {/* 内容区 */}
      <View style={styles.content}>
        <TextInput
          style={styles.outputInput}
          value={outputText}
          onChangeText={setOutputText}
          multiline
          textAlignVertical="top"
          placeholder=""
          placeholderTextColor={COLORS.textMuted}
        />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.9}>
            <Text style={styles.exportBtnText}>导出</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.9}>
            <Text style={styles.copyBtnText}>复制到剪贴板</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 底部浮动栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>总工分</Text>
          <Text style={styles.bottomValue}>{formatScore(totalScore)}</Text>
        </View>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} activeOpacity={0.9}>
          <Text style={styles.completeBtnText}>完成并保存</Text>
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

  // 顶部导航栏
  navHeader: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backBtn: {
    marginRight: 12,
    width: 28,
    alignItems: 'center',
  },
  backText: {
    color: '#ffffff',
    fontSize: 22,
  },
  navTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  regenerateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
  },
  regenerateBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // 内容区
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 10,
    fontWeight: '500',
  },

  // 可编辑输出文本框
  outputInput: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    borderRadius: 14,
    padding: 16,
    fontFamily: 'Courier New',
    fontSize: 13,
    lineHeight: 24,
    color: COLORS.darkText,
    textAlignVertical: 'top',
  },

  // 操作按钮区
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  copyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
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
  bottomLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  bottomValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  completeBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default OutputScreen;
