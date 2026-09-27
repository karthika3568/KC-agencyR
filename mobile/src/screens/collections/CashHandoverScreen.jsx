import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashHandoversApi } from '../../api/postsale';
import { friendlyErrorMessage } from '../../api/client';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { formStyles } from '../../components/FormModal';

export function CashHandoverScreen() {
  const canSubmit = usePermission('handover.submit_cash_handover');
  const canVerify = usePermission('handover.verify_reconcile');
  const queryClient = useQueryClient();
  const [submittedAmounts, setSubmittedAmounts] = useState({});
  const [verifyAmounts, setVerifyAmounts] = useState({});
  const [error, setError] = useState('');

  const pendingQuery = useQuery({ queryKey: ['handover-pending'], queryFn: cashHandoversApi.pending });
  const registerQuery = useQuery({ queryKey: ['handovers'], queryFn: cashHandoversApi.list });

  const submitMutation = useMutation({
    mutationFn: cashHandoversApi.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-pending'] });
      queryClient.invalidateQueries({ queryKey: ['handovers'] });
    },
    onError: (e) => setError(friendlyErrorMessage(e)),
  });
  const verifyMutation = useMutation({
    mutationFn: ({ id, amount }) => cashHandoversApi.verify(id, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['handovers'] }),
    onError: (e) => setError(friendlyErrorMessage(e)),
  });

  const pending = pendingQuery.data || [];
  const register = registerQuery.data || [];

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: 12 }}
      refreshing={pendingQuery.isFetching || registerQuery.isFetching}
      onRefresh={() => { pendingQuery.refetch(); registerQuery.refetch(); }}
      data={[{ type: 'pendingHeader' }, ...pending.map((p) => ({ type: 'pending', ...p })), { type: 'registerHeader' }, ...register.map((h) => ({ type: 'register', ...h }))]}
      keyExtractor={(r, idx) => `${r.type}-${r.employee_id || r.id || idx}`}
      ListHeaderComponent={error ? <Text style={formStyles.error}>{error}</Text> : null}
      renderItem={({ item }) => {
        if (item.type === 'pendingHeader') return <Text style={styles.sectionTitle}>Pending Salesman Collections</Text>;
        if (item.type === 'registerHeader') return <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Reconciliation Audit Register</Text>;

        if (item.type === 'pending') {
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.employee_name}</Text>
              <Text style={styles.cardMeta}>Cash Rs. {item.cash_amount} · Digital Rs. {item.digital_amount} · Total Rs. {item.total_amount}</Text>
              {canSubmit && (
                <View style={styles.row}>
                  <TextInput
                    keyboardType="numeric"
                    placeholder={String(item.cash_amount)}
                    value={submittedAmounts[item.employee_id] ?? ''}
                    onChangeText={(v) => setSubmittedAmounts((prev) => ({ ...prev, [item.employee_id]: v }))}
                    style={[formStyles.input, styles.amountInput]}
                  />
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setError('');
                      submitMutation.mutate({
                        employee_id: item.employee_id,
                        submitted_amount: Number(submittedAmounts[item.employee_id] ?? item.cash_amount),
                      });
                    }}
                  >
                    <Text style={styles.actionBtnText}>Handover Cash</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }

        if (item.type === 'register') {
          const hasDiscrepancy = item.discrepancy != null && Math.abs(item.discrepancy) > 0.009;
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.handover_no} · {item.employee_name}</Text>
              <Text style={styles.cardMeta}>
                Submitted Rs. {item.submitted_amount} · Verified {item.verified_amount ?? '-'}
                {item.discrepancy != null ? ` · Discrepancy ` : ''}
                {item.discrepancy != null && <Text style={hasDiscrepancy ? styles.discrepancyBad : styles.discrepancyOk}>{item.discrepancy}</Text>}
              </Text>
              <Text style={styles.statusText}>{String(item.status).replace('_', ' ')}</Text>
              {item.status === 'pending' && canVerify && (
                <View style={styles.row}>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Counted amount"
                    value={verifyAmounts[item.id] ?? ''}
                    onChangeText={(v) => setVerifyAmounts((prev) => ({ ...prev, [item.id]: v }))}
                    style={[formStyles.input, styles.amountInput]}
                  />
                  <TouchableOpacity
                    style={styles.actionBtnDark}
                    onPress={() => {
                      setError('');
                      verifyMutation.mutate({ id: item.id, amount: Number(verifyAmounts[item.id] ?? item.submitted_amount) });
                    }}
                  >
                    <Text style={styles.actionBtnText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }
        return null;
      }}
      ListEmptyComponent={<Text style={styles.empty}>No handovers yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  sectionTitle: { fontWeight: '700', color: colors.ink, marginBottom: 8 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardTitle: { fontWeight: '700', color: colors.ink },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  statusText: { color: colors.inkMuted, fontSize: 11, marginTop: 4, textTransform: 'capitalize', fontWeight: '600' },
  discrepancyOk: { color: colors.success, fontWeight: '700' },
  discrepancyBad: { color: colors.danger, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  amountInput: { flex: 1, marginBottom: 0 },
  actionBtn: { backgroundColor: colors.gold, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  actionBtnDark: { backgroundColor: colors.navbar, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
