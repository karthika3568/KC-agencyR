import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Switch, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendlyErrorMessage } from '../api/client';
import { FormModal, formStyles } from './FormModal';
import { Icon } from './Icon';
import { colors } from '../theme/colors';

/**
 * Generic add/edit/delete/view list for simple lookup entities (categories,
 * brands, routes, cities, tax codes, stock units, …)
 */
export function EntityListScreen({ queryKey, api, title, fields, renderTitle, renderSubtitle, canManage = true, transformSubmit }) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null closed, {} create, {...row} edit
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const listQuery = useQuery({ queryKey: [queryKey], queryFn: api.list });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({ mutationFn: api.create, onSuccess: () => { invalidate(); closeModal(); }, onError: (e) => setError(friendlyErrorMessage(e)) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => api.update(id, data), onSuccess: () => { invalidate(); closeModal(); }, onError: (e) => setError(friendlyErrorMessage(e)) });
  const removeMutation = useMutation({ mutationFn: api.remove, onSuccess: invalidate, onError: (e) => Alert.alert('Error', friendlyErrorMessage(e)) });

  const openCreate = () => { setForm(Object.fromEntries(fields.map((f) => [f.name, f.default ?? (f.type === 'switch' ? 1 : '')]))); setError(''); setModal({}); };
  const openEdit = (row) => { setForm(Object.fromEntries(fields.map((f) => [f.name, f.type === 'switch' ? Number(row[f.name] ?? 1) : (row[f.name] ?? '')]))); setError(''); setModal(row); };
  const openView = (row) => setViewItem(row);
  const closeModal = () => setModal(null);

  const submit = () => {
    setError('');
    const payload = transformSubmit ? transformSubmit(form) : form;
    if (modal && modal.id) {
      updateMutation.mutate({ id: modal.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const confirmDelete = (row) => {
    Alert.alert('Delete?', renderTitle(row), [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate(row.id) },
    ]);
  };

  const rows = listQuery.data || [];
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={styles.screen}>
      {/* Top Header Row with Title and Top-Right "+ Add [Title]" Button */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>{title}s</Text>
        {canManage && (
          <TouchableOpacity style={styles.topRightBtn} onPress={openCreate}>
            <Icon name="plus" size={14} color={colors.gold} style={{ marginRight: 4 }} />
            <Text style={styles.topRightBtnText}>+ Add {title}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 140, flexGrow: 1 }}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        ListEmptyComponent={<Text style={styles.empty}>No {title.toLowerCase()} yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => openView(item)}>
              <Text style={styles.rowTitle}>{renderTitle(item)}</Text>
              {renderSubtitle ? <Text style={styles.rowSubtitle}>{renderSubtitle(item)}</Text> : null}
            </TouchableOpacity>

            {/* Explicit CRUD Action Buttons: View, Edit, Delete */}
            <View style={styles.actionsBox}>
              <TouchableOpacity onPress={() => openView(item)} style={styles.actionBtn}>
                <Icon name="view" size={16} color={colors.inkMuted} />
              </TouchableOpacity>
              {canManage && (
                <>
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                    <Icon name="edit" size={16} color={colors.gold} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionBtn}>
                    <Icon name="delete" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      />

      {/* Form Modal (Create / Edit) */}
      <FormModal
        visible={!!modal}
        title={modal?.id ? `Edit ${title}` : `Add ${title}`}
        onClose={closeModal}
        footer={
          <>
            <TouchableOpacity style={formStyles.secondaryBtn} onPress={closeModal}><Text style={formStyles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[formStyles.primaryBtn, saving && formStyles.disabled]} onPress={submit} disabled={saving}>
              <Text style={formStyles.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </>
        }
      >
        {fields.map((f) => (
          <View key={f.name}>
            <Text style={formStyles.label}>{f.label}</Text>
            {f.type === 'switch' ? (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{form[f.name] ? 'Active' : 'Inactive'}</Text>
                <Switch value={!!form[f.name]} onValueChange={(v) => setForm((p) => ({ ...p, [f.name]: v ? 1 : 0 }))} />
              </View>
            ) : (
              <TextInput
                value={String(form[f.name] ?? '')}
                onChangeText={(v) => setForm((p) => ({ ...p, [f.name]: v }))}
                keyboardType={f.keyboardType || 'default'}
                style={formStyles.input}
              />
            )}
          </View>
        ))}
        {error ? <Text style={formStyles.error}>{error}</Text> : null}
      </FormModal>

      {/* View Detail Modal */}
      {viewItem && (
        <FormModal
          visible
          title={`View ${title}`}
          onClose={() => setViewItem(null)}
          footer={
            <TouchableOpacity style={formStyles.primaryBtn} onPress={() => setViewItem(null)}>
              <Text style={formStyles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          }
        >
          <View style={styles.detailBox}>
            {fields.map((f) => (
              <View key={f.name} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{f.label}:</Text>
                <Text style={styles.detailVal}>
                  {f.type === 'switch' ? (Number(viewItem[f.name] ?? 1) ? 'Active' : 'Inactive') : String(viewItem[f.name] ?? '-')}
                </Text>
              </View>
            ))}
          </View>
        </FormModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  topRightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navbar,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  topRightBtnText: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSoft },
  rowTitle: { fontWeight: '600', color: colors.ink, fontSize: 14 },
  rowSubtitle: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  actionsBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 },
  actionBtn: { padding: 4 },
  detailBox: { backgroundColor: colors.page, borderRadius: 10, padding: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  detailLabel: { fontWeight: '600', color: colors.inkMuted, fontSize: 13 },
  detailVal: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { color: colors.ink, fontWeight: '600', fontSize: 13 },
});
