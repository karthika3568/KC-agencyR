import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendlyErrorMessage } from '../api/client';
import { FormModal, formStyles } from './FormModal';
import { colors } from '../theme/colors';

/**
 * Generic add/edit/delete list for simple lookup entities (categories,
 * brands, routes, cities, tax codes, stock units, …) — mirrors the web's
 * EntityTable so those ~6 simple modules don't each need a bespoke screen.
 * `fields` describes the form (name/label/keyboardType); `renderTitle`/
 * `renderSubtitle` control the card text.
 */
export function EntityListScreen({ queryKey, api, title, fields, renderTitle, renderSubtitle, canManage = true }) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null closed, {} create, {...row} edit
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const listQuery = useQuery({ queryKey: [queryKey], queryFn: api.list });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({ mutationFn: api.create, onSuccess: () => { invalidate(); closeModal(); }, onError: (e) => setError(friendlyErrorMessage(e)) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => api.update(id, data), onSuccess: () => { invalidate(); closeModal(); }, onError: (e) => setError(friendlyErrorMessage(e)) });
  const removeMutation = useMutation({ mutationFn: api.remove, onSuccess: invalidate, onError: (e) => Alert.alert('Error', friendlyErrorMessage(e)) });

  const openCreate = () => { setForm(Object.fromEntries(fields.map((f) => [f.name, f.default ?? '']))); setError(''); setModal({}); };
  const openEdit = (row) => { setForm(Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? '']))); setError(''); setModal(row); };
  const closeModal = () => setModal(null);

  const submit = () => {
    setError('');
    if (modal && modal.id) {
      updateMutation.mutate({ id: modal.id, data: form });
    } else {
      createMutation.mutate(form);
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
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        ListEmptyComponent={<Text style={styles.empty}>No {title.toLowerCase()} yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => canManage && openEdit(item)}>
              <Text style={styles.rowTitle}>{renderTitle(item)}</Text>
              {renderSubtitle ? <Text style={styles.rowSubtitle}>{renderSubtitle(item)}</Text> : null}
            </TouchableOpacity>
            {canManage && (
              <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={openCreate}>
          <Text style={styles.fabText}>+ Add {title}</Text>
        </TouchableOpacity>
      )}

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
            <TextInput
              value={String(form[f.name] ?? '')}
              onChangeText={(v) => setForm((p) => ({ ...p, [f.name]: v }))}
              keyboardType={f.keyboardType || 'default'}
              style={formStyles.input}
            />
          </View>
        ))}
        {error ? <Text style={formStyles.error}>{error}</Text> : null}
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSoft },
  rowTitle: { fontWeight: '600', color: colors.ink, fontSize: 14 },
  rowSubtitle: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 6, marginLeft: 8 },
  deleteText: { color: colors.danger },
  fab: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: colors.navbar, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  fabText: { color: colors.gold, fontWeight: '700' },
});
