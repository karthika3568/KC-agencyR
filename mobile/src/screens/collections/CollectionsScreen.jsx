import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsApi } from '../../api/postsale';
import { friendlyErrorMessage } from '../../api/client';
import { FormModal, formStyles } from '../../components/FormModal';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

function CollectModal({ customer, onClose }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: collectionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections-pending'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      onClose();
    },
    onError: (e) => setError(friendlyErrorMessage(e)),
  });

  const submit = () => {
    setError('');
    if (!amount) return setError('Enter an amount.');
    createMutation.mutate({ customer_id: customer.customer_id, amount: Number(amount), payment_method: 'cash' });
  };

  return (
    <FormModal
      visible title={`Collect from ${customer.ledger_name}`} onClose={onClose}
      footer={
        <>
          <TouchableOpacity style={formStyles.secondaryBtn} onPress={onClose}><Text style={formStyles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[formStyles.primaryBtn, createMutation.isPending && formStyles.disabled]} onPress={submit} disabled={createMutation.isPending}>
            <Text style={formStyles.primaryBtnText}>Collect</Text>
          </TouchableOpacity>
        </>
      }
    >
      <Text style={styles.meta}>Outstanding: Rs. {customer.total_due}</Text>
      <Text style={formStyles.label}>Amount Collected (Cash)</Text>
      <TextInput keyboardType="numeric" value={amount} onChangeText={setAmount} style={formStyles.input} />
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormModal>
  );
}

export function CollectionsScreen() {
  const canViewAll = usePermission('credit.view_shopwide_outstanding');
  const canCollect = usePermission('collections.field_collection_entry');
  const [selected, setSelected] = useState(null);
  const pendingQuery = useQuery({ queryKey: ['collections-pending'], queryFn: () => collectionsApi.pending(), enabled: canViewAll });
  const historyQuery = useQuery({ queryKey: ['collections'], queryFn: collectionsApi.list });

  const pending = pendingQuery.data || [];
  const history = historyQuery.data || [];
  const historyTotal = history.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <View style={styles.screen}>
      <FlatList
        data={[{ type: 'header' }, ...(canViewAll ? pending.map((p) => ({ type: 'pending', ...p })) : []), { type: 'historyHeader', total: historyTotal }, ...history.map((h) => ({ type: 'history', ...h }))]}
        keyExtractor={(r, idx) => `${r.type}-${r.customer_id || r.id || idx}`}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          if (item.type === 'header') return canViewAll ? <Text style={styles.sectionTitle}>Pending Credit Balances</Text> : null;
          if (item.type === 'historyHeader') return <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Collection History · Total Rs. {item.total.toFixed(2)}</Text>;
          if (item.type === 'pending') {
            return (
              <TouchableOpacity style={styles.card} onPress={() => canCollect && setSelected(item)}>
                <Text style={styles.cardTitle}>{item.ledger_name}</Text>
                <Text style={styles.cardMeta}>{item.unpaid_invoice_count} unpaid bill(s)</Text>
                <Text style={styles.cardTotalDanger}>Due Rs. {item.total_due}</Text>
              </TouchableOpacity>
            );
          }
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.receipt_no}</Text>
              <Text style={styles.cardMeta}>{item.customer_name} · {item.payment_method}</Text>
              <Text style={styles.cardTotal}>Rs. {item.amount}</Text>
            </View>
          );
        }}
      />
      {selected && <CollectModal customer={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  sectionTitle: { fontWeight: '700', color: colors.ink, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardTitle: { fontWeight: '700', color: colors.ink },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink, marginTop: 6 },
  cardTotalDanger: { fontWeight: '700', color: colors.danger, marginTop: 6 },
  meta: { color: colors.inkMuted, fontSize: 12, marginBottom: 10 },
});
