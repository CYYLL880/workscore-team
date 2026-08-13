import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';

const COLORS = {
  primary: '#0f172a',
  accent: '#3b82f6',
  accentBg: '#eff6ff',
  text: '#0f172a',
  textLight: '#64748b',
  textMuted: '#cbd5e1',
  border: '#e2e8f0',
};

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3; // 上下各1个 + 中间1个
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// 生成时间选项：8:00-11:40, 13:30-17:30（15分钟间隔）
export function generateWorkTimeOptions() {
  const times = [];
  // 上午 8:00 - 11:40
  for (let h = 8; h <= 11; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 11 && m > 40) break;
      times.push(`${h}:${String(m).padStart(2, '0')}`);
    }
  }
  times.push('11:40');
  // 下午 13:30 - 17:30
  for (let h = 13; h <= 17; h++) {
    const startM = h === 13 ? 30 : 0;
    for (let m = startM; m < 60; m += 15) {
      if (h === 17 && m > 30) break;
      times.push(`${h}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
}

// 将"8:00"转为分钟数
function timeToMinutes(t) {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// 将分钟数转为"8:00"格式
function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * 时间滑动选择器
 * @param {string[]} times - 时间选项数组
 * @param {string} selectedValue - 当前选中的时间
 * @param {function} onSelect - 选择回调
 */
function TimeWheelPicker({ times, selectedValue, onSelect }) {
  const scrollRef = useRef(null);
  const selectedIndex = Math.max(0, times.indexOf(selectedValue));

  // 初始滚动到选中位置
  useEffect(() => {
    if (scrollRef.current && selectedIndex >= 0) {
      const y = selectedIndex * ITEM_HEIGHT;
      // 使用 setTimeout 确保布局完成后滚动
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ y, animated: false });
        }
      }, 50);
    }
  }, [selectedIndex]);

  const handleScrollEnd = useCallback((event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(times.length - 1, index));
    if (clampedIndex !== selectedIndex && times[clampedIndex]) {
      onSelect(times[clampedIndex]);
    }
  }, [selectedIndex, times, onSelect]);

  return (
    <View style={styles.container}>
      <View style={styles.pickerWrap}>
        {/* 中心高亮条 */}
        <View style={styles.highlightBar} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScrollEnd}
          // Web 兼容：onScroll 也能触发
          {...(Platform.OS === 'web' ? {
            onScroll: (e) => {
              const y = e.nativeEvent.contentOffset.y;
              const index = Math.round(y / ITEM_HEIGHT);
              const clampedIndex = Math.max(0, Math.min(times.length - 1, index));
              if (clampedIndex !== selectedIndex && times[clampedIndex]) {
                onSelect(times[clampedIndex]);
              }
            },
            scrollEventThrottle: 16,
          } : {})}
        >
          {/* 顶部填充 */}
          <View style={{ height: ITEM_HEIGHT }} />
          {times.map((time, i) => {
            const isSelected = i === selectedIndex;
            const isAdjacent = Math.abs(i - selectedIndex) === 1;
            return (
              <View key={time} style={styles.item}>
                <Text
                  style={[
                    styles.itemText,
                    isSelected && styles.itemTextSelected,
                    isAdjacent && styles.itemTextAdjacent,
                  ]}
                >
                  {time}
                </Text>
              </View>
            );
          })}
          {/* 底部填充 */}
          <View style={{ height: ITEM_HEIGHT }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pickerWrap: {
    flex: 1,
    height: PICKER_HEIGHT,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    maxWidth: 140,
  },
  highlightBar: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: COLORS.accentBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    zIndex: 0,
  },
  scrollContent: {
    paddingVertical: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  itemTextAdjacent: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  itemTextSelected: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '800',
  },
});

export { ITEM_HEIGHT };
export default TimeWheelPicker;
