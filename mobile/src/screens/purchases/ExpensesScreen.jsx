import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, expenseCategoriesApi } from '../../api/postsale';
import { friendlyErrorMessage } from '../../api/client';
import { SelectField } from '../../components/SelectField';
import { FormModal, formStyles } from '../../components/FormModal';
import { Icon } from '../../components/Icon';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

export function ExpensesScreen() {
  const canManage = usePermission('expenses.manage');
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [viewExpense, setViewExpense] = useState(null);

  const categoriesQuery = useQuery({ queryKey: ['expense-categories'], queryFn: expenseCategoriesApi.list });
  const listQuery = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list });
  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setAmount('');
      setCategoryId(null);
      setAddModal(false);
    },
    onError: (e) => setError(friendlyErrorMessage(e)),
  });
  const removeMutation = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const submit = () => {
    setError('');
    if (!categoryId || !amount) return setError('Select a category and amount.');
    createMutation.mutate({ expense_category_id: categoryId, amount: Number(amount) });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topHeader}>
        <Text style={styles.topTitle}>Expense Log</Text>
        {canManage && (
          <TouchableOpacity style={styles.topRightBtn} onPress={() => { setError(''); setAddModal(true); }}>
            <Icon name="plus" size={14} color={colors.gold} style={{ marginRight: 4 }} />
            <Text style={styles.topRightBtnText}>+ Add Expense</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={listQuery.data || []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        ListEmptyComponent={<Text style={styles.empty}>No expenses yet.</Text>}
        renderItem={({ item: r }) => {
          const categoryName = r.category_name || r.expense_category_name || (typeof r.category === 'object' ? r.category?.name : r.category) || r.category_code || 'General Expense';
          return (
            <View style={styles.card}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewExpense(r)}>
                <Text style={styles.cardTitle}>{categoryName}</Text>
                <Text style={styles.cardMeta}>{r.expense_date || r.created_at || 'Recorded'}{r.remarks ? ` · ${r.remarks}` : ''}</Text>
              </TouchableOpacity>
              <Text style={styles.cardTotal}>Rs. {Number(r.amount || 0).toFixed(2)}</Text>

              <View style={styles.actionBtns}>
                <TouchableOpacity onPress={() => setViewExpense(r)} style={styles.actionBtn}>
                  <Icon name="view" size={16} color={colors.inkMuted} />
                </TouchableOpacity>
                {canManage && (
                  <TouchableOpacity
                    onPress={() => Alert.alert('Delete expense?', `Delete Rs. ${r.amount} for ${categoryName}?`, [{ text: 'No' }, { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate(r.id) }])}
                    style={styles.actionBtn}
                  >
                    <Icon name="delete" size={16} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Add Expense Form Modal */}
      <FormModal
        visible={addModal}
        title="Add Expense"
        onClose={() => setAddModal(false)}
        footer={
          <>
            <TouchableOpacity style={formStyles.secondaryBtn} onPress={() => setAddModal(false)}><Text style={formStyles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[formStyles.primaryBtn, createMutation.isPending && formStyles.disabled]} onPress={submit} disabled={createMutation.isPending}>
              <Text style={formStyles.primaryBtnText}>{createMutation.isPending ? 'Saving…' : 'Save Expense'}</Text>
            </TouchableOpacity>
          </>
        }
      >
        <SelectField label="Category" value={categoryId} options={categoriesQuery.data || []} onChange={setCategoryId} />
        <Text style={formStyles.label}>Amount (Rs.)</Text>
        <TextInput keyboardType="numeric" value={amount} onChangeText={setAmount} style={formStyles.input} placeholder="0.00" />
        {error ? <Text style={formStyles.error}>{error}</Text> : null}
      </FormModal>

      {/* View Detail Modal */}
      {viewExpense && (
        <FormModal
          visible
          title={`Expense Detail`}
          onClose={() => setViewExpense(null)}
          footer={
            <TouchableOpacity style={formStyles.primaryBtn} onPress={() => setViewExpense(null)}>
              <Text style={formStyles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          }
        >
          <View style={styles.detailBox}>
            <DetailRow
              label="Category"
              value={viewExpense.category_name || viewExpense.expense_category_name || (typeof viewExpense.category === 'object' ? viewExpense.category?.name : viewExpense.category) || 'General Expense'}
            />
            <DetailRow label="Amount" value={`Rs. ${Number(viewExpense.amount || 0).toFixed(2)}`} />
            <DetailRow label="Date" value={viewExpense.expense_date || viewExpense.created_at || '-'} />
            <DetailRow label="Recorded By" value={viewExpense.employee_name || 'Staff'} />
          </View>
        </FormModal>
      )}
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  topRightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navbar,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  topRightBtnText: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardTitle: { fontWeight: '700', color: colors.ink },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12 },
  actionBtn: { padding: 4 },
  detailBox: { backgroundColor: colors.page, borderRadius: 10, padding: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  detailLabel: { fontWeight: '600', color: colors.inkMuted, fontSize: 13 },
  detailVal: { fontWeight: '700', color: colors.ink, fontSize: 13 },
});
