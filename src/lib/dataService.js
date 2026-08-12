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

// 新增作业组，返回数据库 UUID
export async function insertWorkGroup(userId, { train, isLinxiu }) {
  const { data, error } = await supabase
    .from('work_groups')
    .insert({
      user_id: userId,
      group_date: new Date().toISOString().slice(0, 10),
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
