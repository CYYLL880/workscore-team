import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Platform } from 'react-native';
import { useApp } from '../context/AppContext';
import { showAlert, showConfirm } from '../lib/alert';

const COLORS = {
  primary: '#0f172a',
  accent: '#3b82f6',
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textLight: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
  danger: '#ef4444',
  linxiu: '#f97316',
};

function CustomizeScreen({ navigation }) {
  const { categories, dispatch, createCategory, reload } = useApp();
  const [level, setLevel] = useState('list'); // list | steps | edit
  const [selCategoryId, setSelCategoryId] = useState(null);
  const [selStepSeq, setSelStepSeq] = useState(null);
  const [isNewStep, setIsNewStep] = useState(false);

  // 工种编辑弹窗
  const [catEditModal, setCatEditModal] = useState(false);
  const [catEditName, setCatEditName] = useState('');
  const [catEditShort, setCatEditShort] = useState('');
  const [catEditId, setCatEditId] = useState(null);

  // 新增工种弹窗
  const [addCatModal, setAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatShort, setNewCatShort] = useState('');

  // 工步编辑表单
  const [editSeq, setEditSeq] = useState('');
  const [editName, setEditName] = useState('');
  const [editScore, setEditScore] = useState('');
  const [editUnit, setEditUnit] = useState('');

  const selCategory = categories.find(c => c.id === selCategoryId);

  // === 第一层：工种列表 ===
  const renderCategoryList = () => (
    <View>
      <View style={styles.tipBar}>
        <Text style={styles.tipText}>点击工种查看工步，可增删改所有属性</Text>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => showConfirm('确认', '重新加载将丢弃未保存的本地修改，确定吗？', () => {
            reload();
          })}
        >
          <Text style={styles.resetBtnText}>刷新数据</Text>
        </TouchableOpacity>
      </View>

      {categories.map(cat => (
        <TouchableOpacity
          key={cat.id}
          style={styles.catCard}
          onPress={() => {
            setSelCategoryId(cat.id);
            setLevel('steps');
          }}
          activeOpacity={0.85}
        >
          <View style={styles.catCardInfo}>
            <Text style={styles.catName} numberOfLines={1}>{cat.short_name}</Text>
            <Text style={styles.catFullName} numberOfLines={1}>{cat.name}</Text>
          </View>
          <View style={styles.catCardRight}>
            <Text style={styles.catCount}>{cat.steps.length} 项</Text>
            <Text style={styles.arrow}>›</Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.addCatBtn}
        onPress={() => {
          setNewCatName('');
          setNewCatShort('');
          setAddCatModal(true);
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.addCatBtnText}>+ 新增工种</Text>
      </TouchableOpacity>
    </View>
  );

  // === 第二层：工步列表 ===
  const renderStepList = () => {
    if (!selCategory) return null;
    return (
      <View>
        <View style={styles.catHeader}>
          <View style={styles.catHeaderInfo}>
            <Text style={styles.catHeaderName}>{selCategory.short_name}</Text>
            <Text style={styles.catHeaderFull}>{selCategory.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.editCatBtn}
            onPress={() => {
              setCatEditId(selCategory.id);
              setCatEditName(selCategory.name);
              setCatEditShort(selCategory.short_name);
              setCatEditModal(true);
            }}
          >
            <Text style={styles.editCatBtnText}>编辑</Text>
          </TouchableOpacity>
        </View>

        {selCategory.steps.length === 0 ? (
          <Text style={styles.emptyText}>暂无工步</Text>
        ) : (
          selCategory.steps.map(step => (
            <TouchableOpacity
              key={step.seq}
              style={styles.stepCard}
              onPress={() => {
                setSelStepSeq(step.seq);
                setIsNewStep(false);
                setEditSeq(String(step.seq));
                setEditName(step.name);
                setEditScore(String(step.score));
                setEditUnit(step.unit || '');
                setLevel('edit');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.stepSeqTag}>
                <Text style={styles.stepSeqText}>{step.seq}</Text>
              </View>
              <View style={styles.stepCardInfo}>
                <Text style={styles.stepCardName} numberOfLines={2}>{step.name}</Text>
                <Text style={styles.stepCardSub}>
                  {step.unit ? `每${step.unit} · ` : ''}工分 {step.score}
                </Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.addStepBtn}
          onPress={() => {
            setIsNewStep(true);
            setEditSeq(String(Date.now()));
            setEditName('');
            setEditScore('');
            setEditUnit('');
            setLevel('edit');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.addStepBtnText}>+ 新增工步</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteCatBtn}
          onPress={() => showConfirm('确认', `确定删除工种"${selCategory.short_name}"及其所有工步吗？`, () => {
            dispatch({ type: 'DELETE_CATEGORY', payload: { id: selCategory.id } });
            setLevel('list');
            setSelCategoryId(null);
          })}
          activeOpacity={0.85}
        >
          <Text style={styles.deleteCatBtnText}>删除该工种</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // === 第三层：工步编辑 ===
  const renderStepEdit = () => {
    const canSave = editName.trim() && editScore.trim() && editSeq.trim();
    const handleSave = () => {
      if (!canSave) return;
      const stepData = {
        seq: parseInt(editSeq) || Date.now(),
        name: editName.trim(),
        score: parseFloat(editScore) || 0,
        unit: editUnit.trim(),
      };
      if (isNewStep) {
        dispatch({ type: 'ADD_STEP', payload: { categoryId: selCategoryId, step: stepData } });
      } else {
        dispatch({ type: 'UPDATE_STEP', payload: { categoryId: selCategoryId, seq: selStepSeq, updates: stepData } });
      }
      setLevel('steps');
    };
    const handleDelete = () => {
      showConfirm('确认', '确定删除该工步吗？', () => {
        dispatch({ type: 'DELETE_STEP', payload: { categoryId: selCategoryId, seq: selStepSeq } });
        setLevel('steps');
      });
    };

    return (
      <View style={styles.editForm}>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>序号</Text>
          <TextInput
            style={styles.formInput}
            value={editSeq}
            onChangeText={setEditSeq}
            keyboardType="numeric"
            placeholder="输入序号"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>名称</Text>
          <TextInput
            style={[styles.formInput, styles.formInputMulti]}
            value={editName}
            onChangeText={setEditName}
            placeholder="输入工步名称"
            placeholderTextColor={COLORS.textLight}
            multiline
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>工分</Text>
          <TextInput
            style={styles.formInput}
            value={editScore}
            onChangeText={setEditScore}
            keyboardType="numeric"
            placeholder="输入工分值"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>单位</Text>
          <TextInput
            style={styles.formInput}
            value={editUnit}
            onChangeText={setEditUnit}
            placeholder="如：个、台、根（可空）"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.editActions}>
          {!isNewStep && (
            <TouchableOpacity style={styles.deleteStepBtn} onPress={handleDelete} activeOpacity={0.85}>
              <Text style={styles.deleteStepBtnText}>删除</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveStepBtn, !canSave && styles.saveStepBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveStepBtnText}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const titles = { list: '自定义工种', steps: selCategory ? selCategory.short_name : '', edit: isNewStep ? '新增工步' : '编辑工步' };

  return (
    <View style={styles.container}>
      {/* 导航栏 */}
      <View style={styles.navbar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (level === 'edit') setLevel('steps');
            else if (level === 'steps') { setLevel('list'); setSelCategoryId(null); }
            else navigation.goBack();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{titles[level]}</Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {level === 'list' && renderCategoryList()}
        {level === 'steps' && renderStepList()}
        {level === 'edit' && renderStepEdit()}
      </ScrollView>

      {/* 编辑工种弹窗 */}
      <Modal visible={catEditModal} transparent animationType="fade" onRequestClose={() => setCatEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>编辑工种</Text>
            <Text style={styles.modalLabel}>全称</Text>
            <TextInput
              style={styles.modalInput}
              value={catEditName}
              onChangeText={setCatEditName}
              placeholder="输入工种全称"
              placeholderTextColor={COLORS.textLight}
            />
            <Text style={styles.modalLabel}>简称</Text>
            <TextInput
              style={styles.modalInput}
              value={catEditShort}
              onChangeText={setCatEditShort}
              placeholder="输入工种简称"
              placeholderTextColor={COLORS.textLight}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCatEditModal(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  dispatch({ type: 'UPDATE_CATEGORY', payload: { id: catEditId, updates: { name: catEditName.trim(), short_name: catEditShort.trim() } } });
                  setCatEditModal(false);
                }}
              >
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 新增工种弹窗 */}
      <Modal visible={addCatModal} transparent animationType="fade" onRequestClose={() => setAddCatModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新增工种</Text>
            <Text style={styles.modalLabel}>全称</Text>
            <TextInput
              style={styles.modalInput}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="输入工种全称"
              placeholderTextColor={COLORS.textLight}
              autoFocus
            />
            <Text style={styles.modalLabel}>简称</Text>
            <TextInput
              style={styles.modalInput}
              value={newCatShort}
              onChangeText={setNewCatShort}
              placeholder="输入工种简称"
              placeholderTextColor={COLORS.textLight}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddCatModal(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, (!newCatName.trim() || !newCatShort.trim()) && styles.saveStepBtnDisabled]}
                disabled={!newCatName.trim() || !newCatShort.trim()}
                onPress={async () => {
                  try {
                    await createCategory({ name: newCatName.trim(), short_name: newCatShort.trim() });
                    setAddCatModal(false);
                  } catch (e) {
                    showAlert('错误', '创建工种失败：' + (e.message || e));
                  }
                }}
              >
                <Text style={styles.modalSaveText}>创建</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  navbar: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backBtn: { marginRight: 12, width: 28, alignItems: 'center' },
  backText: { color: '#fff', fontSize: 22 },
  navTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  navRight: { width: 28 },
  body: { flex: 1, padding: 16, paddingBottom: 60 },

  // 提示栏
  tipBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, },
  tipText: { flex: 1, fontSize: 12, color: COLORS.textLight, fontWeight: '500' },
  resetBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  resetBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '700' },

  // 工种卡片
  catCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  catCardInfo: { flex: 1, marginRight: 10 },
  catName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  catFullName: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  catCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catCount: { fontSize: 12, color: COLORS.textLight, fontWeight: '500' },
  arrow: { fontSize: 20, color: COLORS.textLight, fontWeight: '300' },

  // 新增工种按钮
  addCatBtn: {
    borderWidth: 1.5, borderColor: COLORS.accent, borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  addCatBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },

  // 工步列表头部
  catHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  catHeaderInfo: { flex: 1, marginRight: 10 },
  catHeaderName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  catHeaderFull: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  editCatBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  editCatBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },

  emptyText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', paddingVertical: 40, fontWeight: '500' },

  // 工步卡片
  stepCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  stepSeqTag: {
    minWidth: 38, height: 26, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  stepSeqText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepCardInfo: { flex: 1, marginRight: 10 },
  stepCardName: { fontSize: 13, fontWeight: '600', color: COLORS.text, lineHeight: 18 },
  stepCardSub: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },

  addStepBtn: {
    borderWidth: 1.5, borderColor: COLORS.accent, borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  addStepBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },

  deleteCatBtn: {
    marginTop: 20, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#fee2e2', borderRadius: 12,
  },
  deleteCatBtnText: { color: COLORS.danger, fontSize: 14, fontWeight: '700' },

  // 工步编辑表单
  editForm: { padding: 4 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  formInput: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  formInputMulti: { minHeight: 60, textAlignVertical: 'top' },

  editActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  deleteStepBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fee2e2', borderRadius: 12,
  },
  deleteStepBtnText: { color: COLORS.danger, fontSize: 14, fontWeight: '700' },
  saveStepBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.success, borderRadius: 12,
  },
  saveStepBtnDisabled: { opacity: 0.4 },
  saveStepBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // 弹窗
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 400,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 6, marginTop: 10, fontWeight: '500' },
  modalInput: {
    backgroundColor: COLORS.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalCancelText: { color: COLORS.textLight, fontSize: 14, fontWeight: '600' },
  modalSaveBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.accent, borderRadius: 10,
  },
  modalSaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default CustomizeScreen;
