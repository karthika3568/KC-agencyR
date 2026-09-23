import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, expenseCategoriesApi } from '../../api/postsale';
import { friendlyErrorMessage } from '../../api/client';
import { SelectField } from '../../components/SelectField';
import { formStyles } from '../../components/FormModal';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

export function ExpensesScreen() {
  const canManage = usePermission('expenses.manage');
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const categoriesQuery = useQuery({ queryKey: ['expense-categories'], queryFn: expenseCategoriesApi.list });
  const listQuery = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list });
  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setAmount(''); },
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
      {canManage && (
        <View style={styles.form}>
          <SelectField label="Category" value={categoryId} options={categoriesQuery.data || []} onChange={setCategoryId} />
          <Text style={formStyles.label}>Amount</Text>
          <TextInput keyboardType="numeric" value={amount} onChangeText={setAmount} style={formStyles.input} />
          {error ? <Text style={formStyles.error}>{error}</Text> : null}
          <TouchableOpacity style={[formStyles.primaryBtn, { marginTop: 10 }]} onPress={submit}>
            <Text style={formStyles.primaryBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={listQuery.data || []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        ListEmptyComponent={<Text style={styles.empty}>No expenses yet.</Text>}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{r.category_name}</Text>
              <Text style={styles.cardMeta}>{r.expense_date}</Text>
            </View>
            <Text style={styles.cardTotal}>Rs. {r.amount}</Text>
            {canManage && (
              <TouchableOpacity onPress={() => Alert.alert('Delete?', '', [{ text: 'No' }, { text: 'Yes', onPress: () => removeMutation.mutate(r.id) }])} style={{ marginLeft: 10 }}>
                <Text style={{ color: colors.danger }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  form: { margin: 12, padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardTitle: { fontWeight: '700', color: colors.ink },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink },
});
