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
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const listQuery = useQuery({ queryKey: ['cash-handovers'], queryFn: cashHandoversApi.list });

  const submitMutation = useMutation({
    mutationFn: cashHandoversApi.submit,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cash-handovers'] }); setAmount(''); },
    onError: (e) => setError(friendlyErrorMessage(e)),
  });

  const submit = () => {
    setError('');
    if (!amount) return setError('Enter an amount.');
    submitMutation.mutate({ amount: Number(amount) });
  };

  return (
    <View style={styles.screen}>
      {canSubmit && (
        <View style={styles.form}>
          <Text style={formStyles.label}>Cash Amount to Hand Over</Text>
          <TextInput keyboardType="numeric" value={amount} onChangeText={setAmount} style={formStyles.input} />
          {error ? <Text style={formStyles.error}>{error}</Text> : null}
          <TouchableOpacity style={[formStyles.primaryBtn, { marginTop: 10 }]} onPress={submit}>
            <Text style={formStyles.primaryBtnText}>Submit Handover</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={listQuery.data || []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        ListEmptyComponent={<Text style={styles.empty}>No handovers yet.</Text>}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rs. {r.amount}</Text>
            <Text style={styles.cardMeta}>{r.status} · {r.submitted_at}</Text>
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
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardTitle: { fontWeight: '700', color: colors.ink },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
});
