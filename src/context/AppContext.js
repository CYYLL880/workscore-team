import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  fetchCategoriesWithSteps,
  insertCategory as dbInsertCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
  insertStep as dbInsertStep,
  updateStep as dbUpdateStep,
  deleteStep as dbDeleteStep,
  fetchWorkGroups,
  insertWorkGroup as dbInsertWorkGroup,
  updateWorkGroup as dbUpdateWorkGroup,
  deleteWorkGroup as dbDeleteWorkGroup,
  insertWorkItem as dbInsertWorkItem,
  updateWorkItem as dbUpdateWorkItem,
  deleteWorkItem as dbDeleteWorkItem,
  clearAllWorkGroups as dbClearAllWorkGroups,
} from '../lib/dataService';

// 状态管理
const AppContext = createContext();

const initialState = {
  // 作业组列表：每个作业组对应一个车号（可为空）下的工步集合
  workGroups: [],
  // 历史记录（仍用 AsyncStorage 缓存）
  history: [],
  // 排除模式：从历史记录复用时屏蔽已选工步
  excludeMode: false,
  excludedSeqs: [],
  // 工分数据（从 Supabase 加载）
  categories: [],
};

function appReducer(state, action) {
  switch (action.type) {
    // 新建作业组，payload.id 由外部传入（Supabase UUID）
    case 'ADD_WORK_GROUP': {
      const newGroup = {
        id: action.payload.id,
        train: action.payload?.train || '',
        isLinxiu: action.payload?.isLinxiu || false,
        items: [],
      };
      return { ...state, workGroups: [...state.workGroups, newGroup] };
    }

    case 'UPDATE_WORK_GROUP': {
      const { groupId, updates } = action.payload;
      return {
        ...state,
        workGroups: state.workGroups.map(g =>
          g.id === groupId ? { ...g, ...updates } : g
        ),
      };
    }

    case 'DELETE_WORK_GROUP':
      return {
        ...state,
        workGroups: state.workGroups.filter(g => g.id !== action.payload.groupId),
      };

    case 'ADD_ITEM_TO_GROUP': {
      const { groupId, step, category } = action.payload;
      return {
        ...state,
        workGroups: state.workGroups.map(g => {
          if (g.id !== groupId) return g;
          if (g.items.some(it => it.seq === step.seq)) return g;
          const newItem = {
            seq: step.seq,
            name: step.name,
            content: step.name,
            score: step.score,
            unit: step.unit || '',
            categoryName: category?.short_name || '',
            categoryId: category?.id || null,
            quantity: 1,
            timeRange: '',
            bianhao: '',
          };
          return { ...g, items: [...g.items, newItem] };
        }),
      };
    }

    case 'REMOVE_ITEM_FROM_GROUP': {
      const { groupId, seq } = action.payload;
      return {
        ...state,
        workGroups: state.workGroups.map(g =>
          g.id === groupId
            ? { ...g, items: g.items.filter(it => it.seq !== seq) }
            : g
        ),
      };
    }

    case 'UPDATE_GROUP_ITEM': {
      const { groupId, seq, updates } = action.payload;
      return {
        ...state,
        workGroups: state.workGroups.map(g =>
          g.id === groupId
            ? {
                ...g,
                items: g.items.map(it =>
                  it.seq === seq ? { ...it, ...updates } : it
                ),
              }
            : g
        ),
      };
    }

    case 'CLEAR_ALL_GROUPS':
      return { ...state, workGroups: [] };

    case 'RESTORE_WORK_GROUPS': {
      const groups = action.payload || [];
      const restored = groups.map(g => ({
        id: g.id, // 已经是 Supabase 返回的 UUID
        train: g.train || '',
        isLinxiu: g.isLinxiu || false,
        items: (g.items || []).map(it => ({ ...it })),
      }));
      return { ...state, workGroups: restored };
    }

    case 'LOAD_HISTORY':
      return { ...state, history: action.payload };

    case 'ENTER_EXCLUDE_MODE':
      return { ...state, excludeMode: true, excludedSeqs: action.payload || [] };

    case 'EXIT_EXCLUDE_MODE':
      return { ...state, excludeMode: false, excludedSeqs: [] };

    case 'ADD_HISTORY':
      return { ...state, history: [action.payload, ...state.history] };

    case 'DELETE_HISTORY':
      return { ...state, history: state.history.filter(h => h.id !== action.payload.id) };

    case 'LOAD_CATEGORIES':
      return { ...state, categories: action.payload };

    case 'LOAD_WORK_GROUPS':
      return { ...state, workGroups: action.payload };

    case 'ADD_CATEGORY': {
      const newCat = action.payload.category; // 已包含 Supabase 生成的 id
      return { ...state, categories: [...state.categories, newCat] };
    }

    case 'UPDATE_CATEGORY': {
      const { id, updates } = action.payload;
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === id ? { ...c, ...updates } : c
        ),
      };
    }

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload.id),
      };

    case 'ADD_STEP': {
      const { categoryId, step } = action.payload;
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === categoryId
            ? { ...c, steps: [...c.steps, { ...step }] }
            : c
        ),
      };
    }

    case 'UPDATE_STEP': {
      const { categoryId, seq, updates } = action.payload;
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === categoryId
            ? {
                ...c,
                steps: c.steps.map(s =>
                  s.seq === seq ? { ...s, ...updates } : s
                ),
              }
            : c
        ),
      };
    }

    case 'DELETE_STEP': {
      const { categoryId, seq } = action.payload;
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === categoryId
            ? { ...c, steps: c.steps.filter(s => s.seq !== seq) }
            : c
        ),
      };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const { session, user } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const userIdRef = useRef(null);

  // 加载 categories 和当前用户的 workGroups
  const loadAll = useCallback(async (uid) => {
    setLoadError(null);
    try {
      const [cats, groups] = await Promise.all([
        fetchCategoriesWithSteps(),
        fetchWorkGroups(uid),
      ]);

      // 填充每个 workItem 的 categoryName（基于加载的 categories）
      const catMap = new Map(cats.map(c => [c.id, c.short_name || c.name]));
      groups.forEach(g => {
        g.items.forEach(it => {
          if (it.categoryId && catMap.has(it.categoryId)) {
            it.categoryName = catMap.get(it.categoryId);
          }
        });
      });

      dispatch({ type: 'LOAD_CATEGORIES', payload: cats });
      dispatch({ type: 'LOAD_WORK_GROUPS', payload: groups });
    } catch (e) {
      console.warn('加载数据失败', e);
      setLoadError(e.message || '加载失败');
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      // 未登录：清空状态
      dispatch({ type: 'LOAD_WORK_GROUPS', payload: [] });
      setIsLoaded(false);
      userIdRef.current = null;
      return;
    }
    if (userIdRef.current === user.id) return; // 已加载过
    userIdRef.current = user.id;
    setIsLoaded(false);
    loadAll(user.id);
  }, [user, loadAll]);

  // 加载历史记录（AsyncStorage 本地缓存）
  useEffect(() => {
    (async () => {
      try {
        const historyJson = await AsyncStorage.getItem('history');
        if (historyJson) {
          dispatch({ type: 'LOAD_HISTORY', payload: JSON.parse(historyJson) });
        }
      } catch (e) {
        console.warn('加载历史记录失败', e);
      }
    })();
  }, []);

  // 保存历史记录
  useEffect(() => {
    AsyncStorage.setItem('history', JSON.stringify(state.history)).catch(e =>
      console.warn('保存历史记录失败', e)
    );
  }, [state.history]);

  // 计算单个作业组的工分
  const getGroupScore = useCallback((group) => {
    if (!group) return 0;
    const multiplier = group.isLinxiu ? 1.5 : 1;
    return group.items.reduce(
      (sum, item) => sum + item.score * item.quantity * multiplier,
      0
    );
  }, []);

  const getTotalScore = useCallback(() => {
    return state.workGroups.reduce((sum, g) => sum + getGroupScore(g), 0);
  }, [state.workGroups, getGroupScore]);

  const getTotalItemCount = useCallback(() => {
    return state.workGroups.reduce((sum, g) => sum + g.items.length, 0);
  }, [state.workGroups]);

  const searchSteps = useCallback((keyword) => {
    if (!keyword || keyword.trim() === '') return [];
    const kw = keyword.trim().toLowerCase();
    const results = [];
    for (const category of state.categories) {
      for (const step of category.steps) {
        if (
          String(step.seq).includes(kw) ||
          step.name.toLowerCase().includes(kw)
        ) {
          results.push({ ...step, categoryName: category.short_name, categoryId: category.id });
        }
      }
    }
    return results;
  }, [state.categories]);

  const getCategoryById = useCallback((id) => state.categories.find(c => c.id === id), [state.categories]);
  const getGroupById = useCallback((id) => state.workGroups.find(g => g.id === id), [state.workGroups]);

  // ============================================
  // 作业组操作（同步 dispatch + 异步写库）
  // ============================================

  // 新建作业组：先插数据库拿 UUID，再 dispatch
  const createWorkGroup = useCallback(async (payload) => {
    if (!user) throw new Error('未登录');
    const newId = await dbInsertWorkGroup(user.id, {
      train: payload?.train || '',
      isLinxiu: payload?.isLinxiu || false,
    });
    dispatch({
      type: 'ADD_WORK_GROUP',
      payload: { id: newId, train: payload?.train || '', isLinxiu: payload?.isLinxiu || false },
    });
    return newId;
  }, [user]);

  // 通用 dispatch 包装：乐观更新（先 dispatch，再异步写库）
  const appDispatch = useCallback((action) => {
    // 同步更新本地 state
    dispatch(action);

    // 异步写库（失败仅警告，不回滚避免复杂度）
    if (!user) return;
    Promise.resolve().then(async () => {
      try {
        switch (action.type) {
          case 'UPDATE_WORK_GROUP': {
            const { groupId, updates } = action.payload;
            await dbUpdateWorkGroup(groupId, updates);
            break;
          }
          case 'DELETE_WORK_GROUP': {
            await dbDeleteWorkGroup(action.payload.groupId);
            break;
          }
          case 'ADD_ITEM_TO_GROUP': {
            const { groupId, step, category } = action.payload;
            const item = {
              seq: step.seq,
              name: step.name,
              content: step.name,
              score: step.score,
              unit: step.unit || '',
              quantity: 1,
              timeRange: '',
              bianhao: '',
              categoryId: category?.id ?? null,
            };
            await dbInsertWorkItem(groupId, user.id, item);
            break;
          }
          case 'REMOVE_ITEM_FROM_GROUP': {
            const { groupId, seq } = action.payload;
            await dbDeleteWorkItem(groupId, seq);
            break;
          }
          case 'UPDATE_GROUP_ITEM': {
            const { groupId, seq, updates } = action.payload;
            await dbUpdateWorkItem(groupId, seq, updates);
            break;
          }
          case 'CLEAR_ALL_GROUPS': {
            await dbClearAllWorkGroups(user.id);
            break;
          }
          case 'ADD_CATEGORY': {
            // category 已在 createCategory 中插入，这里跳过
            break;
          }
          case 'UPDATE_CATEGORY': {
            const { id, updates } = action.payload;
            await dbUpdateCategory(id, updates);
            break;
          }
          case 'DELETE_CATEGORY': {
            await dbDeleteCategory(action.payload.id);
            break;
          }
          case 'ADD_STEP': {
            const { categoryId, step } = action.payload;
            await dbInsertStep(categoryId, step);
            break;
          }
          case 'UPDATE_STEP': {
            const { categoryId, seq, updates } = action.payload;
            await dbUpdateStep(categoryId, seq, updates);
            break;
          }
          case 'DELETE_STEP': {
            const { categoryId, seq } = action.payload;
            await dbDeleteStep(categoryId, seq);
            break;
          }
          default:
            break;
        }
      } catch (e) {
        console.warn('同步到 Supabase 失败:', action.type, e);
      }
    });
  }, [user]);

  // ============================================
  // 工种/工步操作（仅管理员，需先插库再 dispatch）
  // ============================================

  const createCategory = useCallback(async ({ name, short_name }) => {
    const newCat = await dbInsertCategory({ name, short_name });
    dispatch({ type: 'ADD_CATEGORY', payload: { category: newCat } });
    return newCat;
  }, []);

  const restoreWorkGroups = useCallback(async (groups) => {
    if (!user) throw new Error('未登录');
    // 先清空当前所有作业组（数据库）
    await dbClearAllWorkGroups(user.id);
    // 批量插入新的作业组
    const newGroups = [];
    for (const g of groups) {
      const newId = await dbInsertWorkGroup(user.id, {
        train: g.train || '',
        isLinxiu: g.isLinxiu || false,
      });
      const items = (g.items || []).map(it => ({ ...it }));
      for (const it of items) {
        await dbInsertWorkItem(newId, user.id, {
          seq: it.seq,
          name: it.name,
          content: it.content || it.name,
          score: it.score,
          unit: it.unit || '',
          quantity: it.quantity || 1,
          timeRange: it.timeRange || '',
          bianhao: it.bianhao || '',
          categoryId: it.categoryId ?? null,
        });
      }
      newGroups.push({ id: newId, train: g.train || '', isLinxiu: !!g.isLinxiu, items });
    }
    dispatch({ type: 'RESTORE_WORK_GROUPS', payload: newGroups });
  }, [user]);

  const value = {
    ...state,
    dispatch: appDispatch, // 替换为带同步的 dispatch
    createWorkGroup,
    createCategory,
    restoreWorkGroups,
    getGroupScore,
    getTotalScore,
    getTotalItemCount,
    searchSteps,
    getCategoryById,
    getGroupById,
    isLoaded,
    loadError,
    reload: () => user && loadAll(user.id),
    categories: state.categories,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
