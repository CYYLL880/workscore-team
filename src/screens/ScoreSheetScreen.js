import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal,
  ActivityIndicator, RefreshControl, Platform, Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  fetchMonthScoreData, confirmDay, unconfirmDay,
  subscribeMonthScoreData, buildMonthExcelSheets,
} from '../lib/dataService';
import { showAlert, showConfirm } from '../lib/alert';
import { formatScore } from '../utils/outputGenerator';
import * as XLSX from 'xlsx';

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
  borderDash: '#cbd5e1',
  success: '#10b981',
  successBg: '#d1fae5',
  danger: '#ef4444',
  dangerBg: '#fee2e2',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  linxiu: '#f97316',
  admin: '#8b5cf6',
};

// 列宽
const NAME_COL_WIDTH = 80;
const DAY_COL_WIDTH = 58;
const TOTAL_COL_WIDTH = 72;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 44;

function ScoreSheetScreen({ navigation }) {
  const { user, profile, isAdmin } = useAuth();
  const { createWorkGroup } = useApp();

  // 月份状态（普通用户锁定当月）
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // 数据
  const [users, setUsers] = useState([]);
  const [days, setDays] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 详情/操作 Modal
  const [detailModal, setDetailModal] = useState({ visible: false, userId: null, dateStr: '' });
  // 选择作业组 Modal（同一天多个作业组）
  const [groupPicker, setGroupPicker] = useState({ visible: false, groups: [], dateStr: '', userId: '' });

  // 导出中
  const [exporting, setExporting] = useState(false);

  // 用于防抖实时订阅触发的重新加载
  const reloadTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // 加载数据
  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const result = await fetchMonthScoreData(year, month);
      if (!isMountedRef.current) return;
      setUsers(result.users);
      setDays(result.days);
    } catch (e) {
      showAlert('加载失败', e.message || '加载数据失败');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [year, month]);

  // 初次加载 + 月份变化时加载
  useEffect(() => {
    isMountedRef.current = true;
    loadData(true);
    return () => { isMountedRef.current = false; };
  }, [loadData]);

  // 实时订阅
  useEffect(() => {
    const unsubscribe = subscribeMonthScoreData(year, month, () => {
      // 防抖：500ms 内多次变更只重新加载一次
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) loadData(false);
      }, 500);
    });
    return () => {
      unsubscribe();
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [year, month, loadData]);

  // 月份切换（仅管理员）
  const canSwitchMonth = isAdmin;
  const goPrevMonth = () => {
    if (!canSwitchMonth) return;
    let m = month - 1, y = year;
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m); setYear(y);
  };
  const goNextMonth = () => {
    if (!canSwitchMonth) return;
    let m = month + 1, y = year;
    if (m > 12) { m = 1; y += 1; }
    setMonth(m); setYear(y);
  };
  const goThisMonth = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  // 当月天数
  const daysInMonth = new Date(year, month, 0).getDate();
  const dateList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 计算每个用户的当月总工分
  const getUserMonthTotal = (userId) => {
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = days[dateStr]?.[userId];
      if (cell) total += cell.score;
    }
    return total;
  };

  // 当天是否有数据
  const getCell = (userId, dayNum) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return { dateStr, cell: days[dateStr]?.[userId] };
  };

  // 点击单元格
  const handleCellPress = (userId, dayNum) => {
    const { dateStr, cell } = getCell(userId, dayNum);
    setDetailModal({ visible: true, userId, dateStr, dayNum, cell });
  };

  // 进入作业组编辑（自己 + 未确认，或管理员）
  const handleEditGroups = async (targetUserId, dateStr) => {
    const cell = days[dateStr]?.[targetUserId];
    const groups = cell?.groups || [];

    // 管理员编辑他人作业组：暂不支持（需WorkGroupEditScreen改造），提示
    if (targetUserId !== user.id) {
      showAlert('提示', '暂不支持编辑他人作业组，请到该用户账号下修改');
      return;
    }

    if (groups.length === 0) {
      // 当天无作业组，新建一个（使用用户点击的日期）
      try {
        const newId = await createWorkGroup({ train: '', isLinxiu: false, groupDate: dateStr });
        setDetailModal({ ...detailModal, visible: false });
        navigation.navigate('WorkGroupEdit', { groupId: newId, isNew: true });
      } catch (e) {
        showAlert('错误', '创建作业组失败：' + (e.message || e));
      }
      return;
    }

    if (groups.length === 1) {
      setDetailModal({ ...detailModal, visible: false });
      navigation.navigate('WorkGroupEdit', { groupId: groups[0].id, isNew: false });
      return;
    }

    // 多个作业组：弹出选择
    setGroupPicker({ visible: true, groups, dateStr, userId: targetUserId });
  };

  // 选择具体作业组
  const handlePickGroup = (groupId) => {
    setGroupPicker({ visible: false, groups: [], dateStr: '', userId: '' });
    setDetailModal({ ...detailModal, visible: false });
    navigation.navigate('WorkGroupEdit', { groupId, isNew: false });
  };

  // 管理员确认/撤销
  const handleToggleConfirm = async (targetUserId, dateStr, currentlyConfirmed) => {
    try {
      if (currentlyConfirmed) {
        await unconfirmDay(targetUserId, dateStr);
      } else {
        await confirmDay(targetUserId, dateStr, user.id);
      }
      // 立即更新本地状态（无需等订阅）
      setDays(prev => {
        const next = { ...prev };
        if (next[dateStr]?.[targetUserId]) {
          next[dateStr] = {
            ...next[dateStr],
            [targetUserId]: {
              ...next[dateStr][targetUserId],
              confirmed: !currentlyConfirmed,
              groups: (next[dateStr][targetUserId].groups || []).map(g => ({
                ...g,
                status: !currentlyConfirmed ? 'confirmed' : 'editing',
              })),
            },
          };
        }
        return next;
      });
    } catch (e) {
      showAlert('操作失败', e.message || '操作失败');
    }
  };

  // Excel 导出
  const handleExport = async () => {
    if (users.length === 0 || Object.keys(days).length === 0) {
      showAlert('提示', '暂无数据可导出');
      return;
    }
    setExporting(true);
    try {
      const sheets = buildMonthExcelSheets(users, days, year, month);
      const wb = XLSX.utils.book_new();
      sheets.forEach(s => {
        const ws = XLSX.utils.aoa_to_sheet(s.aoa);
        // 列宽
        ws['!cols'] = s.sheetName === '当月汇总'
          ? [{ wch: 8 }, { wch: 10 }, { wch: 8 }, ...dateList.map(() => ({ wch: 8 })), { wch: 10 }]
          : [{ wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ws, s.sheetName);
      });
      const filename = `工分表_${year}年${month}月.xlsx`;
      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, filename);
      } else {
        // RN 端：生成 base64 写入文件系统并分享
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const FileSystem = (await import('expo-file-system')).default;
        const path = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(path, wbout, { encoding: FileSystem.EncodingType.Base64 });
        const Sharing = (await import('expo-sharing')).default;
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path);
        } else {
          showAlert('提示', '文件已保存至：' + path);
        }
      }
    } catch (e) {
      showAlert('导出失败', e.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  // 渲染单元格
  const renderCell = (userId, dayNum) => {
    const { dateStr, cell } = getCell(userId, dayNum);
    const isSelf = userId === user.id;
    const confirmed = cell?.confirmed;
    const hasData = cell && cell.score > 0;
    const isToday = (
      year === now.getFullYear() &&
      month === now.getMonth() + 1 &&
      dayNum === now.getDate()
    );

    let bg = COLORS.card;
    let borderColor = COLORS.border;
    let textColor = COLORS.text;

    if (!hasData && !cell) {
      bg = 'transparent';
      textColor = COLORS.textMuted;
    } else if (confirmed) {
      bg = COLORS.successBg;
      borderColor = COLORS.success;
      textColor = COLORS.success;
    } else if (isSelf) {
      bg = COLORS.accentBg;
      borderColor = COLORS.accent;
      textColor = COLORS.accent;
    } else {
      bg = '#fffbeb';
      borderColor = COLORS.warning;
      textColor = COLORS.warning;
    }

    return (
      <TouchableOpacity
        key={dayNum}
        onPress={() => handleCellPress(userId, dayNum)}
        style={[
          styles.cell,
          {
            backgroundColor: bg,
            borderColor,
            borderWidth: hasData || cell ? 1 : 0,
          },
          isToday && { borderRadius: 6, overflow: 'hidden' },
        ]}
        activeOpacity={0.7}
      >
        {hasData ? (
          <View style={styles.cellInner}>
            <Text style={[styles.cellScore, { color: textColor }]}>
              {formatScore(cell.score)}
            </Text>
            {confirmed && <Text style={styles.cellCheck}>✓</Text>}
          </View>
        ) : (
          <Text style={styles.cellEmpty}>-</Text>
        )}
      </TouchableOpacity>
    );
  };

  // 渲染用户行
  const renderRow = (u) => {
    const isSelf = u.id === user.id;
    const total = getUserMonthTotal(u.id);
    return (
      <View key={u.id} style={[styles.row, isSelf && styles.rowSelf]}>
        {/* 姓名列 */}
        <View style={[styles.nameCell, isSelf && styles.nameCellSelf]}>
          <Text style={styles.userName} numberOfLines={1}>{u.name}</Text>
          <Text style={styles.userEmpNo} numberOfLines={1}>{u.emp_no}</Text>
        </View>
        {/* 日期列 */}
        {dateList.map(d => renderCell(u.id, d))}
        {/* 合计列 */}
        <View style={[styles.totalCell, total > 0 && styles.totalCellHasData]}>
          <Text style={[styles.totalScore, total > 0 && styles.totalScoreHasData]}>
            {total > 0 ? formatScore(total) : '-'}
          </Text>
        </View>
      </View>
    );
  };

  // 详情 Modal 内容
  const renderDetailModal = () => {
    const { userId, dateStr, dayNum, cell } = detailModal;
    if (!userId) return null;
    const targetUser = users.find(u => u.id === userId);
    const isSelf = userId === user.id;
    const confirmed = cell?.confirmed;
    const canEdit = isSelf && (!confirmed || isAdmin);

    return (
      <Modal
        visible={detailModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModal({ ...detailModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 头部 */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{targetUser?.name || '用户'}</Text>
                <Text style={styles.modalSubtitle}>
                  工号 {targetUser?.emp_no} · {month}月{dayNum}日
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailModal({ ...detailModal, visible: false })}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 状态徽章 */}
            <View style={styles.statusRow}>
              {confirmed ? (
                <View style={[styles.statusBadge, { backgroundColor: COLORS.successBg }]}>
                  <Text style={[styles.statusText, { color: COLORS.success }]}>已确认 ✓</Text>
                </View>
              ) : cell ? (
                <View style={[styles.statusBadge, { backgroundColor: COLORS.warningBg }]}>
                  <Text style={[styles.statusText, { color: COLORS.warning }]}>待确认</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.statusText, { color: COLORS.textLight }]}>无记录</Text>
                </View>
              )}
              <View style={[styles.statusBadge, { backgroundColor: isSelf ? COLORS.accentBg : '#f1f5f9' }]}>
                <Text style={[styles.statusText, { color: isSelf ? COLORS.accent : COLORS.textLight }]}>
                  {isSelf ? '本人' : '他人'}
                </Text>
              </View>
            </View>

            {/* 工分明细 */}
            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
              {cell?.groups?.length ? (
                cell.groups.map((g, gi) => {
                  const multiplier = g.isLinxiu ? 1.5 : 1;
                  const groupTotal = (g.items || []).reduce((s, it) => s + it.score * it.quantity * multiplier, 0);
                  return (
                    <View key={gi} style={styles.groupBlock}>
                      <View style={styles.groupHeader}>
                        <Text style={styles.groupTrainText}>
                          {g.train || '无车号'}
                          {g.isLinxiu && <Text style={styles.linxiuTag}> · 临修×1.5</Text>}
                        </Text>
                        <Text style={styles.groupScoreText}>{formatScore(groupTotal)}分</Text>
                      </View>
                      {g.items?.length ? (
                        g.items.map((it, ii) => {
                          const sub = it.score * it.quantity * multiplier;
                          return (
                            <View key={ii} style={styles.itemRow}>
                              <View style={styles.itemLeft}>
                                <View style={styles.seqPill}>
                                  <Text style={styles.seqPillText}>{it.seq}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.itemName} numberOfLines={2}>
                                    {it.content || it.name}
                                  </Text>
                                  <View style={styles.itemMetaRow}>
                                    {it.bianhao ? (
                                      <Text style={styles.itemMeta}>编号 {it.bianhao}</Text>
                                    ) : null}
                                    {it.timeRange ? (
                                      <Text style={styles.itemMeta}>· {it.timeRange}</Text>
                                    ) : null}
                                    <Text style={styles.itemMeta}>· ×{it.quantity}</Text>
                                  </View>
                                </View>
                              </View>
                              <Text style={styles.itemScore}>{formatScore(sub)}</Text>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.emptyGroupText}>暂无工步</Text>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyDetail}>
                  <Text style={styles.emptyDetailText}>该日无作业组记录</Text>
                </View>
              )}
              <View style={{ height: 12 }} />
            </ScrollView>

            {/* 操作按钮 */}
            <View style={styles.modalActions}>
              {canEdit && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => handleEditGroups(userId, dateStr)}
                >
                  <Text style={styles.editBtnText}>
                    {cell?.groups?.length ? '编辑作业组' : '新建作业组'}
                  </Text>
                </TouchableOpacity>
              )}
              {isAdmin && cell && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    confirmed ? styles.unconfirmBtn : styles.confirmBtn,
                  ]}
                  onPress={() => handleToggleConfirm(userId, dateStr, confirmed)}
                >
                  <Text style={styles.confirmBtnText}>
                    {confirmed ? '撤销确认' : '确认当日'}
                  </Text>
                </TouchableOpacity>
              )}
              {!canEdit && !isAdmin && confirmed && (
                <View style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.editBtnText, { color: COLORS.textLight }]}>已锁定</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // 作业组选择 Modal
  const renderGroupPicker = () => {
    if (!groupPicker.visible) return null;
    return (
      <Modal
        visible={groupPicker.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupPicker({ visible: false, groups: [], dateStr: '', userId: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>选择作业组</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {groupPicker.groups.map((g, i) => {
                const multiplier = g.isLinxiu ? 1.5 : 1;
                const total = (g.items || []).reduce((s, it) => s + it.score * it.quantity * multiplier, 0);
                return (
                  <TouchableOpacity
                    key={g.id || i}
                    style={styles.pickGroupItem}
                    onPress={() => handlePickGroup(g.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickGroupTrain}>
                        {g.train || '无车号'}
                        {g.isLinxiu && <Text style={styles.linxiuTag}> · 临修×1.5</Text>}
                      </Text>
                      <Text style={styles.pickGroupMeta}>{g.items?.length || 0} 个工步</Text>
                    </View>
                    <Text style={styles.pickGroupScore}>{formatScore(total)}分</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, marginTop: 12 }]}
              onPress={() => setGroupPicker({ visible: false, groups: [], dateStr: '', userId: '' })}
            >
              <Text style={[styles.editBtnText, { color: COLORS.text }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>加载工分数据...</Text>
      </View>
    );
  }

  const totalTableWidth = NAME_COL_WIDTH + daysInMonth * DAY_COL_WIDTH + TOTAL_COL_WIDTH;

  return (
    <View style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>工分总表</Text>
            <Text style={styles.headerSubtitle}>
              {year}年{month}月 · {users.length} 人
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExport}
              disabled={exporting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {exporting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.exportBtnText}>导出</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.logoutText}>本月</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 月份切换 */}
      <View style={styles.monthBar}>
        <TouchableOpacity
          style={[styles.monthNavBtn, !canSwitchMonth && styles.monthNavBtnDisabled]}
          onPress={goPrevMonth}
          disabled={!canSwitchMonth}
        >
          <Text style={styles.monthNavIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{year}年 {month}月</Text>
        <TouchableOpacity
          style={[styles.monthNavBtn, !canSwitchMonth && styles.monthNavBtnDisabled]}
          onPress={goNextMonth}
          disabled={!canSwitchMonth}
        >
          <Text style={styles.monthNavIcon}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 表格 */}
      <ScrollView
        style={styles.tableScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(false); }}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: totalTableWidth }}
        >
          <View style={{ width: totalTableWidth }}>
            {/* 表头 */}
            <View style={[styles.row, styles.headerRow]}>
              <View style={[styles.nameCell, styles.headerCell]}>
                <Text style={styles.headerCellText}>姓名/工号</Text>
              </View>
              {dateList.map(d => {
                const isToday = (
                  year === now.getFullYear() &&
                  month === now.getMonth() + 1 &&
                  d === now.getDate()
                );
                return (
                  <View
                    key={d}
                    style={[
                      styles.headerDayCell,
                      isToday && styles.headerDayCellToday,
                    ]}
                  >
                    <Text style={[styles.headerDayText, isToday && styles.headerDayTextToday]}>
                      {d}
                    </Text>
                  </View>
                );
              })}
              <View style={[styles.totalCell, styles.headerCell]}>
                <Text style={styles.headerCellText}>合计</Text>
              </View>
            </View>

            {/* 用户行 */}
            {users.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>暂无用户</Text>
              </View>
            ) : (
              users.map(u => renderRow(u))
            )}

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>
      </ScrollView>

      {/* 图例 */}
      <View style={styles.legendBar}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.accentBg, borderColor: COLORS.accent }]} />
          <Text style={styles.legendText}>本人可编辑</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.successBg, borderColor: COLORS.success }]} />
          <Text style={styles.legendText}>已确认</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#fffbeb', borderColor: COLORS.warning }]} />
          <Text style={styles.legendText}>待确认</Text>
        </View>
      </View>

      {/* 详情 Modal */}
      {renderDetailModal()}

      {/* 作业组选择 Modal */}
      {renderGroupPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // 顶部
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  exportBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // 月份切换栏
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 16,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavBtnDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.5,
  },
  monthNavIcon: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 100,
    textAlign: 'center',
  },

  // 表格
  tableScroll: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    height: HEADER_HEIGHT,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primaryLight,
  },
  rowSelf: {
    backgroundColor: 'rgba(59,130,246,0.03)',
  },
  nameCell: {
    width: NAME_COL_WIDTH,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  nameCellSelf: {
    backgroundColor: COLORS.accentBg,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  userEmpNo: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCellText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  headerDayCell: {
    width: DAY_COL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDayCellToday: {
    backgroundColor: COLORS.accent,
  },
  headerDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  headerDayTextToday: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // 单元格
  cell: {
    width: DAY_COL_WIDTH,
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
  },
  cellInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellScore: {
    fontSize: 11,
    fontWeight: '700',
  },
  cellCheck: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
    marginLeft: 2,
  },
  cellEmpty: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // 合计列
  totalCell: {
    width: TOTAL_COL_WIDTH,
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  totalCellHasData: {
    backgroundColor: '#f0fdf4',
  },
  totalScore: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  totalScoreHasData: {
    color: COLORS.success,
    fontWeight: '800',
  },

  // 空状态
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  // 图例
  legendBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 3,
    fontWeight: '500',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailScroll: {
    maxHeight: 320,
  },
  groupBlock: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTrainText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  linxiuTag: {
    fontSize: 11,
    color: COLORS.linxiu,
    fontWeight: '600',
  },
  groupScoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accent,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  seqPill: {
    minWidth: 28,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  seqPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  itemName: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    lineHeight: 16,
  },
  itemMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  itemMeta: {
    fontSize: 10,
    color: COLORS.textLight,
    marginRight: 4,
  },
  itemScore: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  emptyGroupText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  emptyDetail: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyDetailText: {
    fontSize: 13,
    color: COLORS.textLight,
  },

  // 操作按钮
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    backgroundColor: COLORS.accent,
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: COLORS.success,
  },
  unconfirmBtn: {
    backgroundColor: COLORS.warning,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // 作业组选择
  pickGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickGroupTrain: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  pickGroupMeta: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
  },
  pickGroupScore: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accent,
  },
});

export default ScoreSheetScreen;
