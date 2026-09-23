import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi, supplierPaymentsApi } from '../../api/purchasing';
import { suppliersApi } from '../../api/parties';
import { itemsApi } from '../../api/catalog';
import { friendlyErrorMessage } from '../../api/client';
import { FormModal, formStyles } from '../../components/FormModal';
import { SelectField } from '../../components/SelectField';
import { ItemLineEditor } from '../../components/ItemLineEditor';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

function GrnFormModal({ visible, onClose }) {
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list, enabled: visible });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list(''), enabled: visible });
  const [supplierId, setSupplierId] = useState(null);
  const [paidAmount, setPaidAmount] = useState('0');
  const [lines, setLines] = useState([{ key: '1', item_id: null, qty: '1', rate: '' }]);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setSupplierId(null); setPaidAmount('0'); setLines([{ key: '1', item_id: null, qty: '1', rate: '' }]);
      onClose();
    },
    onError: (e) => setError(friendlyErrorMessage(e)),
  });

  const validLines = lines.filter((l) => l.item_id);
  const total = validLines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.rate || 0), 0);

  const submit = () => {
    setError('');
    if (!supplierId) return setError('Select a supplier.');
    if (validLines.length === 0) return setError('Add at least one item.');
    createMutation.mutate({
      supplier_id: supplierId,
      payment_mode: 'credit',
      paid_amount: Number(paidAmount || 0),
      items: validLines.map((l) => ({ item_id: l.item_id, qty: Number(l.qty), rate: Number(l.rate || 0), free_qty: 0, tax_percent: 0 })),
    });
  };

  return (
    <FormModal
      visible={visible} title="New GRN (Goods Received)" onClose={onClose}
      footer={
        <>
          <TouchableOpacity style={formStyles.secondaryBtn} onPress={onClose}><Text style={formStyles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[formStyles.primaryBtn, createMutation.isPending && formStyles.disabled]} onPress={submit} disabled={createMutation.isPending}>
            <Text style={formStyles.primaryBtnText}>Save GRN</Text>
          </TouchableOpacity>
        </>
      }
    >
      <SelectField label="Supplier" required value={supplierId} options={suppliersQuery.data || []} onChange={setSupplierId} />
      <Text style={formStyles.label}>Items</Text>
      <ItemLineEditor lines={lines} setLines={setLines} items={itemsQuery.data || []} rateLabel="Rate" />
      <Text style={formStyles.label}>Paid Amount</Text>
      <TextInput keyboardType="numeric" value={paidAmount} onChangeText={setPaidAmount} style={formStyles.input} />
      <Text style={styles.total}>Grand Total: Rs. {total.toFixed(2)}</Text>
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormModal>
  );
}

function GrnTab() {
  const canManage = usePermission('purchases.create_grn');
  const [modalVisible, setModalVisible] = useState(false);
  const listQuery = useQuery({ queryKey: ['purchases'], queryFn: purchasesApi.list });
  const rows = listQuery.data || [];

  return (
    <>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        ListEmptyComponent={<Text style={styles.empty}>No GRNs yet.</Text>}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{r.grn_no}</Text>
              <Text style={styles.status}>{r.status}</Text>
            </View>
            <Text style={styles.cardMeta}>{r.supplier_name}</Text>
            <Text style={styles.cardTotal}>Rs. {r.grand_total} · Pending Rs. {r.pending_balance}</Text>
          </View>
        )}
      />
      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}><Text style={styles.fabText}>+ New GRN</Text></TouchableOpacity>
      )}
      <GrnFormModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

function PaymentsTab() {
  const canManage = usePermission('purchases.settle_supplier_payment');
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
  const paymentsQuery = useQuery({ queryKey: ['supplier-payments'], queryFn: supplierPaymentsApi.list });
  const [supplierId, setSupplierId] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: supplierPaymentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      setAmount('');
    },
    onError: (e) => setError(friendlyErrorMessage(e)),
  });

  const submit = () => {
    setError('');
    if (!supplierId || !amount) return setError('Select a supplier and amount.');
    createMutation.mutate({ supplier_id: supplierId, amount: Number(amount), payment_mode: 'cash' });
  };

  return (
    <View style={{ flex: 1 }}>
      {canManage && (
        <View style={styles.paymentForm}>
          <SelectField label="Supplier" value={supplierId} options={suppliersQuery.data || []} onChange={setSupplierId} />
          <Text style={formStyles.label}>Amount</Text>
          <TextInput keyboardType="numeric" value={amount} onChangeText={setAmount} style={formStyles.input} />
          {error ? <Text style={formStyles.error}>{error}</Text> : null}
          <TouchableOpacity style={[formStyles.primaryBtn, { marginTop: 10 }]} onPress={submit}>
            <Text style={formStyles.primaryBtnText}>Settle Payment</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={paymentsQuery.data || []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>No payments yet.</Text>}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{r.payment_code}</Text>
            <Text style={styles.cardMeta}>{r.supplier_name} · {r.payment_mode}</Text>
            <Text style={styles.cardTotal}>Rs. {r.amount}</Text>
          </View>
        )}
      />
    </View>
  );
}

export function PurchasingScreen() {
  const [tab, setTab] = useState('grn');
  return (
    <View style={styles.screen}>
      <SegmentedTabs tabs={[{ key: 'grn', label: 'GRN' }, { key: 'payments', label: 'Supplier Payments' }]} active={tab} onChange={setTab} />
      <View style={{ flex: 1, marginTop: 8 }}>
        {tab === 'grn' ? <GrnTab /> : <PaymentsTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '700', color: colors.ink },
  status: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase', color: colors.gold },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink, marginTop: 6 },
  fab: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: colors.navbar, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  fabText: { color: colors.gold, fontWeight: '700' },
  total: { textAlign: 'right', fontWeight: '700', marginTop: 8, color: colors.ink },
  paymentForm: { padding: 12, backgroundColor: colors.card, margin: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft },
});
