/**
 * 工步模板服务（本地 AsyncStorage 持久化）
 * 用于保存某天填好的作业组工步集合，之后可一键复用
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'workTemplates';
const MAX_TEMPLATES = 20;

// 加载所有模板
export async function loadTemplates() {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.warn('加载模板失败', e);
    return [];
  }
}

// 保存模板
export async function saveTemplate({ name, train, isLinxiu, items }) {
  const templates = await loadTemplates();
  const newTemplate = {
    id: 'tpl_' + Date.now(),
    name: name || '未命名模板',
    train: train || '',
    isLinxiu: !!isLinxiu,
    items: (items || []).map(it => ({
      seq: it.seq,
      name: it.name,
      content: it.content || it.name,
      score: it.score,
      unit: it.unit || '',
      quantity: it.quantity || 1,
      timeRange: it.timeRange || '',
      bianhao: it.bianhao || '',
      categoryId: it.categoryId ?? null,
      categoryName: it.categoryName || '',
    })),
    createdAt: Date.now(),
  };
  const next = [newTemplate, ...templates].slice(0, MAX_TEMPLATES);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

// 删除模板
export async function deleteTemplate(id) {
  const templates = await loadTemplates();
  const next = templates.filter(t => t.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
