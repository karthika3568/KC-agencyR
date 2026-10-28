import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi, supplierPaymentsApi } from '../../api/purchasing';
import { suppliersApi } from '../../api/parties';
import { itemsApi } from '../../api/catalog';
import { friendlyErrorMessage } from '../../api/client';
import { FormModal, formStyles } from '../../components/FormModal';
import { SelectField } from '../../components/SelectField';
import { GrnItemLineEditor } from '../../components/GrnItemLineEditor';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { Icon } from '../../components/Icon';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

function GrnFormModal({ visible, onClose }) {
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list, enabled: visible });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list(''), enabled: visible });
  const [supplierId, setSupplierId] = useState(null);
  const [paidAmount, setPaidAmount] = useState('0');
  const [userEditedPaid, setUserEditedPaid] = useState(false);
  const emptyLine = () => ({ key: `${Date.now()}`, item_id: null, qty: '1', free_qty: '0', mrp: '', rate: '', discount_mode: 'percent', discount_percent: '0', discount_amount: '' });
  const [lines, setLines] = useState([emptyLine()]);
  const [error, setError] = useState('');

  const validLines = lines.filter((l) => l.item_id);
  const total = validLines.reduce((s, l) => {
    const gross = Number(l.qty || 0) * Number(l.rate || 0);
    const disc = l.discount_mode === 'amount' ? Number(l.discount_amount || 0) : gross * (Number(l.discount_percent || 0) / 100);
    return s + Math.max(gross - disc, 0);
  }, 0);

  useEffect(() => {
    if (visible && !userEditedPaid) {
      setPaidAmount(total > 0 ? total.toFixed(2) : '0');
    }
  }, [total, visible, userEditedPaid]);

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setSupplierId(null); setPaidAmount('0'); setUserEditedPaid(false); setLines([emptyLine()]);
      onClose();
    },
    onError: (e) => setError(friendlyErrorMessage(e)),
  });

  const handlePaidChange = (text) => {
    setUserEditedPaid(true);
    const num = Number(text || 0);
    if (num > total) {
      setPaidAmount(total > 0 ? String(total) : '0');
      setError(`Paid amount cannot exceed the net Grand Total (Rs. ${total.toFixed(2)})`);
    } else {
      setPaidAmount(text);
      setError('');
    }
  };

  const submit = () => {
    setError('');
    if (!supplierId) return setError('Select a supplier.');
    if (validLines.length === 0) return setError('Add at least one item.');
    if (Number(paidAmount || 0) > total) {
      return setError(`Paid amount cannot exceed net Grand Total (Rs. ${total.toFixed(2)})`);
    }
    createMutation.mutate({
      supplier_id: supplierId,
      payment_mode: 'credit',
      paid_amount: Number(paidAmount || 0),
      items: validLines.map((l) => ({
        item_id: l.item_id,
        qty: Number(l.qty),
        free_qty: Number(l.free_qty || 0),
        mrp: l.mrp !== '' ? Number(l.mrp) : undefined,
        rate: Number(l.rate || 0),
        ...(l.discount_mode === 'amount' ? { discount_amount: Number(l.discount_amount || 0) } : { discount_percent: Number(l.discount_percent || 0) }),
      })),
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
      <GrnItemLineEditor lines={lines} setLines={setLines} items={itemsQuery.data || []} />
      <Text style={formStyles.label}>Paid Amount (Max Rs. {total.toFixed(2)})</Text>
      <TextInput keyboardType="numeric" value={paidAmount} onChangeText={handlePaidChange} style={formStyles.input} />
      <Text style={styles.total}>Grand Total: Rs. {total.toFixed(2)}</Text>
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormModal>
  );
}

function SupplierPaymentFormModal({ visible, onClose }) {
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list, enabled: visible });
  const [supplierId, setSupplierId] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: supplierPaymentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      setSupplierId(null); setAmount(''); setError('');
      onClose();
    },
    onError: (e) => setError(friendlyErrorMessage(e)),
  });

  const submit = () => {
    setError('');
    if (!supplierId || !amount) return setError('Select a supplier and enter payment amount.');
    createMutation.mutate({ supplier_id: supplierId, amount: Number(amount), payment_mode: paymentMode });
  };

  return (
    <FormModal
      visible={visible}
      title="Settle Supplier Payment"
      onClose={onClose}
      footer={
        <>
          <TouchableOpacity style={formStyles.secondaryBtn} onPress={onClose}><Text style={formStyles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[formStyles.primaryBtn, createMutation.isPending && formStyles.disabled]} onPress={submit} disabled={createMutation.isPending}>
            <Text style={formStyles.primaryBtnText}>{createMutation.isPending ? 'Saving…' : 'Save Payment'}</Text>
          </TouchableOpacity>
        </>
      }
    >
      <SelectField label="Supplier *" required value={supplierId} options={suppliersQuery.data || []} onChange={setSupplierId} />
      <Text style={formStyles.label}>Payment Amount (Rs.) *</Text>
      <TextInput keyboardType="numeric" value={amount} onChangeText={setAmount} style={formStyles.input} placeholder="0.00" />
      <SelectField
        label="Payment Mode"
        value={paymentMode}
        options={[{ id: 'cash', name: 'Cash' }, { id: 'bank_transfer', name: 'Bank Transfer / UPI' }, { id: 'cheque', name: 'Cheque' }]}
        onChange={setPaymentMode}
      />
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormModal>
  );
}

function GrnTab({ modalVisible, setModalVisible }) {
  const [viewGrn, setViewGrn] = useState(null);
  const listQuery = useQuery({ queryKey: ['purchases'], queryFn: purchasesApi.list });
  const rows = listQuery.data || [];

  return (
    <>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 140, flexGrow: 1 }}
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

            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => setViewGrn(r)} style={styles.actionBtn}>
                <Icon name="view" size={14} color={colors.ink} style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <GrnFormModal visible={modalVisible} onClose={() => setModalVisible(false)} />

      {/* View GRN Modal */}
      {viewGrn && (
        <FormModal
          visible
          title={`GRN: ${viewGrn.grn_no}`}
          onClose={() => setViewGrn(null)}
          footer={
            <TouchableOpacity style={formStyles.primaryBtn} onPress={() => setViewGrn(null)}>
              <Text style={formStyles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          }
        >
          <View style={styles.detailBox}>
            <DetailRow label="GRN Number" value={viewGrn.grn_no} />
            <DetailRow label="Supplier" value={viewGrn.supplier_name} />
            <DetailRow label="Grand Total" value={`Rs. ${viewGrn.grand_total}`} />
            <DetailRow label="Paid Amount" value={`Rs. ${viewGrn.paid_amount || 0}`} />
            <DetailRow label="Pending Balance" value={`Rs. ${viewGrn.pending_balance || 0}`} />
            <DetailRow label="Status" value={viewGrn.status} />
          </View>
        </FormModal>
      )}
    </>
  );
}

function PaymentsTab({ modalVisible, setModalVisible }) {
  const paymentsQuery = useQuery({ queryKey: ['supplier-payments'], queryFn: supplierPaymentsApi.list });

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={paymentsQuery.data || []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 140 }}
        refreshing={paymentsQuery.isFetching}
        onRefresh={paymentsQuery.refetch}
        ListEmptyComponent={<Text style={styles.empty}>No payments yet.</Text>}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{r.payment_code}</Text>
            <Text style={styles.cardMeta}>{r.supplier_name} · {r.payment_mode}</Text>
            <Text style={styles.cardTotal}>Rs. {r.amount}</Text>
          </View>
        )}
      />
      <SupplierPaymentFormModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}

export function PurchasingScreen() {
  const canManageGrn = usePermission('purchases.create_grn');
  const canSettlePayment = usePermission('purchases.settle_supplier_payment');
  const [tab, setTab] = useState('grn');
  const [modalVisible, setModalVisible] = useState(false);

  const canCreate = tab === 'grn' ? canManageGrn : canSettlePayment;

  return (
    <View style={styles.screen}>
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <SegmentedTabs
            tabs={[{ key: 'grn', label: 'GRN' }, { key: 'payments', label: 'Supplier Payments' }]}
            active={tab}
            onChange={(t) => { setTab(t); setModalVisible(false); }}
          />
        </View>
        {canCreate && (
          <TouchableOpacity style={styles.topRightBtn} onPress={() => setModalVisible(true)}>
            <Icon name="plus" size={14} color={colors.gold} style={{ marginRight: 4 }} />
            <Text style={styles.topRightBtnText}>
              {tab === 'grn' ? '+ New GRN' : '+ Settle Payment'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ flex: 1, marginTop: 4 }}>
        {tab === 'grn'
          ? <GrnTab modalVisible={modalVisible} setModalVisible={setModalVisible} />
          : <PaymentsTab modalVisible={modalVisible} setModalVisible={setModalVisible} />}
      </View>
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
    paddingRight: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  topRightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navbar,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  topRightBtnText: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '700', color: colors.ink },
  status: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase', color: colors.gold },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink, marginTop: 6 },
  cardActions: { flexDirection: 'row', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.page, borderWidth: 1, borderColor: colors.borderSoft },
  actionBtnText: { color: colors.ink, fontWeight: '600', fontSize: 12 },
  total: { textAlign: 'right', fontWeight: '700', marginTop: 8, color: colors.ink },
  paymentForm: { padding: 12, backgroundColor: colors.card, margin: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft },
  detailBox: { backgroundColor: colors.page, borderRadius: 10, padding: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  detailLabel: { fontWeight: '600', color: colors.inkMuted, fontSize: 13 },
  detailVal: { fontWeight: '700', color: colors.ink, fontSize: 13 },
});
