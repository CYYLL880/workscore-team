/**
 * Supabase 数据服务层
 * 封装 categories / steps / work_groups / work_items 的 CRUD 操作
 * 提供本地格式 <-> 数据库格式 互转
 */
import { supabase } from './supabase';

// ============================================
// categories + steps（全局共享，仅管理员可写）
// ============================================

/**
 * 加载所有工种 + 工步，组装成本地格式
 * 本地格式：[{ id, name, short_name, steps: [{ seq, name, score, unit }] }]
 */
export async function fetchCategoriesWithSteps() {
  const [{ data: cats, error: catErr }, { data: steps, error: stepErr }] =
    await Promise.all([
      supabase.from('categories').select('*').order('display_order', { ascending: true }),
      supabase.from('steps').select('*').order('seq', { ascending: true }),
    ]);

  if (catErr) throw catErr;
  if (stepErr) throw stepErr;

  const stepsByCat = new Map();
  (steps || []).forEach(s => {
    if (!stepsByCat.has(s.category_id)) stepsByCat.set(s.category_id, []);
    stepsByCat.get(s.category_id).push({
      seq: s.seq,
      name: s.name,
      score: Number(s.score),
      unit: s.unit || '',
    });
  });

  return (cats || []).map(c => ({
    id: c.id,
    name: c.name,
    short_name: c.short_name || c.name,
    display_order: c.display_order || 0,
    steps: stepsByCat.get(c.id) || [],
  }));
}

// 新增工种（返回新记录）
export async function insertCategory({ name, short_name }) {
  // 计算最大 id + display_order
  const { data: existing } = await supabase
    .from('categories')
    .select('id, display_order')
    .order('id', { ascending: false })
    .limit(1);

  const nextId = existing && existing.length > 0 ? existing[0].id + 1 : 1;
  const nextOrder = existing && existing.length > 0 ? (existing[0].display_order || 0) + 1 : 1;

  const { data, error } = await supabase
    .from('categories')
    .insert({
      id: nextId,
      name,
      short_name,
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, name: data.name, short_name: data.short_name, steps: [] };
}

// 更新工种
export async function updateCategory(id, updates) {
  const patch = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.short_name !== undefined) patch.short_name = updates.short_name;
  if (updates.display_order !== undefined) patch.display_order = updates.display_order;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from('categories').update(patch).eq('id', id);
  if (error) throw error;
}

// 删除工种（级联删除工步）
export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// 新增工步
export async function insertStep(categoryId, step) {
  const { error } = await supabase.from('steps').insert({
    category_id: categoryId,
    seq: step.seq,
    name: step.name,
    score: step.score,
    unit: step.unit || null,
  });
  if (error) throw error;
}

// 更新工步（通过 category_id + seq 定位）
export async function updateStep(categoryId, seq, updates) {
  const patch = {};
  if (updates.seq !== undefined) patch.seq = updates.seq;
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.score !== undefined) patch.score = updates.score;
  if (updates.unit !== undefined) patch.unit = updates.unit || null;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from('steps')
    .update(patch)
    .eq('category_id', categoryId)
    .eq('seq', seq);
  if (error) throw error;
}

// 删除工步
export async function deleteStep(categoryId, seq) {
  const { error } = await supabase
    .from('steps')
    .delete()
    .eq('category_id', categoryId)
    .eq('seq', seq);
  if (error) throw error;
}

// ============================================
// work_groups + work_items（按用户）
// ============================================

/**
 * 加载指定用户的所有作业组 + 工步，组装成本地格式
 * 本地格式：[{ id, train, isLinxiu, items: [{ seq, name, content, score, unit, categoryName, categoryId, quantity, timeRange, bianhao }] }]
 */
export async function fetchWorkGroups(userId) {
  const [{ data: groups, error: gErr }, { data: items, error: iErr }] = await Promise.all([
    supabase
      .from('work_groups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('work_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  if (gErr) throw gErr;
  if (iErr) throw iErr;

  const itemsByGroup = new Map();
  (items || []).forEach(it => {
    if (!itemsByGroup.has(it.group_id)) itemsByGroup.set(it.group_id, []);
    itemsByGroup.get(it.group_id).push({
      seq: it.seq,
      name: it.name,
      content: it.content || it.name,
      score: Number(it.score),
      unit: it.unit || '',
      quantity: Number(it.quantity) || 1,
      timeRange: it.time_range || '',
      bianhao: it.bianhao || '',
      categoryId: it.category_id ?? null,
      categoryName: '', // 由 AppContext 加载后填充
    });
  });

  return (groups || []).map(g => ({
    id: g.id,
    train: g.train_no || '',
    isLinxiu: !!g.is_linxiu,
    items: itemsByGroup.get(g.id) || [],
  }));
}

// 按ID加载单个作业组 + 工步（管理员编辑他人作业组用）
export async function fetchGroupById(groupId) {
  const [{ data: group, error: gErr }, { data: items, error: iErr }] = await Promise.all([
    supabase.from('work_groups').select('*').eq('id', groupId).single(),
    supabase.from('work_items').select('*').eq('group_id', groupId).order('created_at', { ascending: true }),
  ]);

  if (gErr) throw gErr;
  if (iErr) throw iErr;

  return {
    id: group.id,
    train: group.train_no || '',
    isLinxiu: !!group.is_linxiu,
    items: (items || []).map(it => ({
      seq: it.seq,
      name: it.name,
      content: it.content || it.name,
      score: Number(it.score),
      unit: it.unit || '',
      quantity: Number(it.quantity) || 1,
      timeRange: it.time_range || '',
      bianhao: it.bianhao || '',
      categoryId: it.category_id ?? null,
      categoryName: '',
    })),
  };
}

// 新增作业组，返回数据库 UUID
export async function insertWorkGroup(userId, { train, isLinxiu, groupDate }) {
  // userId 可以是当前用户或目标用户（管理员为他人创建）
  const { data, error } = await supabase
    .from('work_groups')
    .insert({
      user_id: userId,
      group_date: groupDate || new Date().toISOString().slice(0, 10),
      train_no: train || null,
      is_linxiu: !!isLinxiu,
      status: 'editing',
    })
    .select()
    .single();

  if (error) throw error;
  return data.id; // UUID
}

// 更新作业组
export async function updateWorkGroup(groupId, updates) {
  const patch = {};
  if (updates.train !== undefined) patch.train_no = updates.train || null;
  if (updates.isLinxiu !== undefined) patch.is_linxiu = !!updates.isLinxiu;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from('work_groups').update(patch).eq('id', groupId);
  if (error) throw error;
}

// 删除作业组（级联删除 work_items，由外键 ON DELETE CASCADE 处理）
export async function deleteWorkGroup(groupId) {
  const { error } = await supabase.from('work_groups').delete().eq('id', groupId);
  if (error) throw error;
}

// 新增工步到作业组
export async function insertWorkItem(groupId, userId, item) {
  const { error } = await supabase.from('work_items').insert({
    group_id: groupId,
    user_id: userId,
    seq: item.seq,
    name: item.name,
    content: item.content || item.name,
    score: item.score,
    unit: item.unit || null,
    quantity: item.quantity || 1,
    time_range: item.timeRange || null,
    bianhao: item.bianhao || null,
    category_id: item.categoryId ?? null,
  });
  if (error) throw error;
}

// 更新作业组内工步（通过 group_id + seq 定位）
export async function updateWorkItem(groupId, seq, updates) {
  const patch = {};
  if (updates.content !== undefined) patch.content = updates.content;
  if (updates.quantity !== undefined) patch.quantity = updates.quantity;
  if (updates.timeRange !== undefined) patch.time_range = updates.timeRange || null;
  if (updates.bianhao !== undefined) patch.bianhao = updates.bianhao || null;
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.score !== undefined) patch.score = updates.score;
  if (updates.unit !== undefined) patch.unit = updates.unit || null;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from('work_items')
    .update(patch)
    .eq('group_id', groupId)
    .eq('seq', seq);
  if (error) throw error;
}

// 删除作业组内工步
export async function deleteWorkItem(groupId, seq) {
  const { error } = await supabase
    .from('work_items')
    .delete()
    .eq('group_id', groupId)
    .eq('seq', seq);
  if (error) throw error;
}

// 清空用户所有作业组（保留 history 概念时使用）
export async function clearAllWorkGroups(userId) {
  const { error } = await supabase.from('work_groups').delete().eq('user_id', userId);
  if (error) throw error;
}

// ============================================
// 工分总表（按月汇总）
// ============================================

/**
 * 加载某月所有用户的工分数据
 * @param {number} year 如 2026
 * @param {number} month 1-12
 * @returns {Promise<{users: Array, days: Object}>}
 *   users: [{ id, emp_no, name, role }]
 *   days: { 'YYYY-MM-DD': { [userId]: { score, groupCount, confirmed, groups: [{id, train, isLinxiu, items}] } } }
 */
export async function fetchMonthScoreData(year, month) {
  // 计算月份范围
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  // 并行加载用户和作业组
  const [
    { data: profiles, error: pErr },
    { data: groups, error: gErr },
  ] = await Promise.all([
    supabase.from('profiles').select('id, emp_no, name, role').order('emp_no', { ascending: true }),
    supabase.from('work_groups').select('*').gte('group_date', startDate).lt('group_date', endDate),
  ]);

  if (pErr) throw pErr;
  if (gErr) throw gErr;

  // 提取当月所有 group_id，查询对应的 work_items（避免用 created_at 误过滤补录数据）
  const groupIds = (groups || []).map(g => g.id);
  let items = [];
  if (groupIds.length > 0) {
    // 分批查询（Supabase URL 长度限制，每批最多约 300 个 UUID）
    const BATCH = 200;
    for (let i = 0; i < groupIds.length; i += BATCH) {
      const batch = groupIds.slice(i, i + BATCH);
      const { data: batchItems, error: iErr } = await supabase
        .from('work_items')
        .select('*')
        .in('group_id', batch);
      if (iErr) throw iErr;
      if (batchItems) items = items.concat(batchItems);
    }
  }

  // 按 group_id 分组工步
  const itemsByGroup = new Map();
  items.forEach(it => {
    if (!itemsByGroup.has(it.group_id)) itemsByGroup.set(it.group_id, []);
    itemsByGroup.get(it.group_id).push(it);
  });

  // 按 date -> userId 组织数据
  const days = {};
  (groups || []).forEach(g => {
    const dateKey = g.group_date; // YYYY-MM-DD
    if (!days[dateKey]) days[dateKey] = {};
    const groupItems = (itemsByGroup.get(g.id) || []).map(it => ({
      seq: it.seq,
      name: it.name,
      content: it.content || it.name,
      score: Number(it.score),
      unit: it.unit || '',
      quantity: Number(it.quantity) || 1,
      timeRange: it.time_range || '',
      bianhao: it.bianhao || '',
      categoryId: it.category_id ?? null,
    }));
    const groupScore = groupItems.reduce((s, it) => s + it.score * it.quantity * (g.is_linxiu ? 1.5 : 1), 0);
    if (!days[dateKey][g.user_id]) {
      days[dateKey][g.user_id] = { score: 0, groupCount: 0, confirmed: true, groups: [] };
    }
    days[dateKey][g.user_id].score += groupScore;
    days[dateKey][g.user_id].groupCount += 1;
    if (g.status !== 'confirmed') days[dateKey][g.user_id].confirmed = false;
    days[dateKey][g.user_id].groups.push({
      id: g.id,
      train: g.train_no || '',
      isLinxiu: !!g.is_linxiu,
      status: g.status,
      items: groupItems,
    });
  });

  return { users: profiles || [], days };
}

/**
 * 管理员确认某用户某天的所有作业组
 */
export async function confirmDay(targetUserId, dateStr, adminUserId) {
  const { error } = await supabase
    .from('work_groups')
    .update({
      status: 'confirmed',
      confirmed_by: adminUserId,
      confirmed_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId)
    .eq('group_date', dateStr);
  if (error) throw error;
}

/**
 * 管理员撤销确认某用户某天的所有作业组
 */
export async function unconfirmDay(targetUserId, dateStr) {
  const { error } = await supabase
    .from('work_groups')
    .update({
      status: 'editing',
      confirmed_by: null,
      confirmed_at: null,
    })
    .eq('user_id', targetUserId)
    .eq('group_date', dateStr);
  if (error) throw error;
}

/**
 * 检查某用户某天的工分是否已确认
 */
export function isDayConfirmed(days, dateStr, userId) {
  const day = days[dateStr];
  if (!day || !day[userId]) return false;
  return day[userId].confirmed;
}

/**
 * 订阅某月工分数据变更（work_groups / work_items / profiles）
 * @param {number} year
 * @param {number} month
 * @param {() => void} onChange 数据变更回调
 * @returns {() => void} 取消订阅函数
 */
export function subscribeMonthScoreData(year, month, onChange) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const filters = [
    `group_date=gte.${startDate}`,
    `group_date=lt.${endDate}`,
  ];

  const channels = [];
  let disposed = false;

  const makeChannel = (name, table, extraFilter) => {
    const ch = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: extraFilter }, () => {
        if (!disposed) onChange();
      })
      .subscribe();
    channels.push(ch);
  };

  makeChannel(`score-groups-${year}-${month}`, 'work_groups', `${filters[0]}`);
  // work_items 用 created_at 范围过滤（与 fetchMonthScoreData 一致）
  makeChannel(`score-items-${year}-${month}`, 'work_items', `created_at=gte.${startDate}`);
  makeChannel(`score-profiles-${year}-${month}`, 'profiles', undefined);

  return () => {
    disposed = true;
    channels.forEach(ch => supabase.removeChannel(ch));
  };
}

/**
 * 生成 Excel 导出数据
 * @param {Array} users [{ id, emp_no, name, role }]
 * @param {Object} days { 'YYYY-MM-DD': { [userId]: { score, groupCount, confirmed, groups } } }
 * @param {number} year
 * @param {number} month
 * @returns {Array<{sheetName, aoa}>} 每天一个 Sheet（二维数组形式）
 */
export function buildMonthExcelSheets(users, days, year, month) {
  const sheets = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const sortedDates = Object.keys(days).sort();
  const noDataSheets = [];

  // 汇总 sheet：用户 × 日 工分
  const summaryHeader = ['工号', '姓名', '角色'];
  for (let d = 1; d <= daysInMonth; d++) {
    summaryHeader.push(`${month}月${d}日`);
  }
  summaryHeader.push('当月总计');
  const summaryRows = users.map(u => {
    const row = [u.emp_no, u.name, u.role === 'admin' ? '管理员' : '成员'];
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = days[dateStr]?.[u.id];
      const score = cell ? Number(cell.score.toFixed(2)) : 0;
      row.push(score || 0);
      total += score;
    }
    row.push(Number(total.toFixed(2)));
    return row;
  });
  sheets.push({ sheetName: '当月汇总', aoa: [summaryHeader, ...summaryRows] });

  // 每天明细 sheet：作业内容 + 工分
  sortedDates.forEach(dateStr => {
    const day = days[dateStr];
    if (!day) return;
    const dayDate = new Date(dateStr);
    const dayNum = dayDate.getDate();

    const header = ['工号', '姓名', '车号/临修', '序号', '工作内容', '编号', '时间段', '数量', '单次工分', '小计'];
    const rows = [];
    users.forEach(u => {
      const cell = day[u.id];
      if (!cell || !cell.groups || cell.groups.length === 0) return;
      cell.groups.forEach(g => {
        const multiplier = g.isLinxiu ? 1.5 : 1;
        const trainLabel = g.train || '无';
        const linxiuTag = g.isLinxiu ? ' [临修×1.5]' : '';
        if (!g.items || g.items.length === 0) {
          rows.push([u.emp_no, u.name, `${trainLabel}${linxiuTag}`, '', '', '', '', '', '', '']);
        } else {
          g.items.forEach(it => {
            const subtotal = it.score * it.quantity * multiplier;
            rows.push([
              u.emp_no,
              u.name,
              `${trainLabel}${linxiuTag}`,
              it.seq,
              it.content || it.name,
              it.bianhao || '',
              it.timeRange || '',
              it.quantity,
              it.score,
              Number(subtotal.toFixed(2)),
            ]);
          });
        }
      });
    });

    if (rows.length === 0) {
      noDataSheets.push(dateStr);
      return;
    }

    // 合计行
    const totalScore = rows.reduce((s, r) => s + (typeof r[9] === 'number' ? r[9] : 0), 0);
    rows.push(['', '', '', '', '', '', '', '', '当日合计', Number(totalScore.toFixed(2))]);

    sheets.push({
      sheetName: `${month}月${dayNum}日`,
      aoa: [header, ...rows],
    });
  });

  return sheets;
}
