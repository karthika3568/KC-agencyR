import { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, Share } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../../api/invoices';
import { itemsApi } from '../../api/catalog';
import { customersApi } from '../../api/parties';
import { friendlyErrorMessage } from '../../api/client';
import { FormModal, formStyles } from '../../components/FormModal';
import { SelectField } from '../../components/SelectField';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

const STATUS_COLOR = { paid: colors.success, partial: colors.warning, credit: colors.gold, cancelled: colors.danger, returned: colors.danger };

function buildShareText(inv) {
  const lines = inv.items.map((l) => `${l.item_name_snapshot}  x${l.qty}  @${l.rate}  = ${l.line_total}`).join('\n');
  return `AJ AGENCY\nInvoice ${inv.invoice_no || `#${inv.id}`}\nDate: ${inv.invoice_date}\nCustomer: ${inv.customer_name || 'Walk-in'}\n\n${lines}\n\nGrand Total: Rs. ${inv.grand_total}\nPayment: ${inv.payment_status}`;
}

function ViewModal({ id, onClose }) {
  const { data } = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id) });
  if (!data) return null;
  return (
    <FormModal
      visible title={data.invoice_no || `Held #${data.id}`} onClose={onClose}
      footer={
        <>
          <TouchableOpacity style={formStyles.secondaryBtn} onPress={onClose}><Text style={formStyles.secondaryBtnText}>Close</Text></TouchableOpacity>
          <TouchableOpacity style={formStyles.primaryBtn} onPress={() => Share.share({ message: buildShareText(data) })}>
            <Text style={formStyles.primaryBtnText}>Share / Print</Text>
          </TouchableOpacity>
        </>
      }
    >
      <Text style={styles.meta}>{data.customer_name || 'Walk-in'} · {data.invoice_date} · Billed by {data.employee_name}</Text>
      {data.items.map((l) => (
        <View key={l.id} style={styles.lineRow}>
          <Text style={styles.lineName} numberOfLines={1}>{l.item_name_snapshot}</Text>
          <Text style={styles.lineQty}>{l.qty} {l.unit_code}</Text>
          <Text style={styles.lineTotal}>Rs. {l.line_total}</Text>
        </View>
      ))}
      <View style={styles.grandRow}>
        <Text style={styles.grandLabel}>Grand Total</Text>
        <Text style={styles.grandValue}>Rs. {data.grand_total}</Text>
      </View>
      {data.status === 'cancelled' && (
        <View style={styles.cancelledBox}>
          <Text style={styles.cancelledText}>Cancelled by {data.cancelled_by_name || 'user'} on {data.cancelled_at}{data.cancel_reason ? ` — ${data.cancel_reason}` : ''}</Text>
        </View>
      )}
    </FormModal>
  );
}

function EditModal({ id, onClose }) {
  const queryClient = useQueryClient();
  const canDiscount = usePermission('pos.apply_discount');
  const invoiceQuery = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id) });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });

  const [customerId, setCustomerId] = useState(undefined);
  const [lines, setLines] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (invoiceQuery.data && lines === null) {
      setCustomerId(invoiceQuery.data.customer_id ?? null);
      setLines(invoiceQuery.data.items.map((it, idx) => ({
        key: String(idx), item_id: it.item_id, item_name: it.item_name_snapshot,
        qty: String(it.qty), rate: String(it.rate), discount_percent: String(it.discount_percent || 0),
      })));
    }
  }, [invoiceQuery.data, lines]);

  const items = itemsQuery.data || [];
  const validLines = (lines || []).filter((l) => l.item_id);
  const newTotal = validLines.reduce((s, l) => {
    const item = items.find((i) => i.id === l.item_id);
    const gross = Number(l.qty || 0) * Number(l.rate || 0);
    const disc = gross * (Number(l.discount_percent || 0) / 100);
    const taxable = gross - disc;
    const gst = taxable * (Number(item?.gst_percent || 0) / 100);
    return s + taxable + gst;
  }, 0);

  const editMutation = useMutation({
    mutationFn: () => invoicesApi.editCompleted(id, {
      customer_id: customerId,
      items: validLines.map((l) => ({ item_id: l.item_id, qty: Number(l.qty), unit_id: items.find((i) => i.id === l.item_id)?.base_unit_id, ...(canDiscount ? { discount_percent: Number(l.discount_percent || 0) } : {}), rate: Number(l.rate) })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      Alert.alert('Invoice updated successfully.');
      onClose();
    },
    onError: (err) => { setError(friendlyErrorMessage(err)); setConfirming(false); },
  });

  if (!invoiceQuery.data || lines === null) {
    return <FormModal visible title="Loading…" onClose={onClose}><Text>Loading invoice…</Text></FormModal>;
  }

  const updateLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <FormModal
      visible title={`Edit ${invoiceQuery.data.invoice_no}`} onClose={onClose}
      footer={
        confirming ? (
          <>
            <TouchableOpacity style={formStyles.secondaryBtn} onPress={() => setConfirming(false)}><Text style={formStyles.secondaryBtnText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={[formStyles.primaryBtn, editMutation.isPending && formStyles.disabled]} onPress={() => editMutation.mutate()} disabled={editMutation.isPending}>
              <Text style={formStyles.primaryBtnText}>Yes, Update</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={formStyles.secondaryBtn} onPress={onClose}><Text style={formStyles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={formStyles.primaryBtn} onPress={() => setConfirming(true)}><Text style={formStyles.primaryBtnText}>Save Changes</Text></TouchableOpacity>
          </>
        )
      }
    >
      <Text style={styles.warnText}>Original total: Rs. {invoiceQuery.data.grand_total}. Payments already collected are never altered.</Text>
      <SelectField label="Customer" value={customerId} options={customersQuery.data || []} labelKey="ledger_name" onChange={setCustomerId} />

      {validLines.map((l) => (
        <View key={l.key} style={styles.editLine}>
          <Text style={styles.editLineName}>{l.item_name}</Text>
          <View style={formStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={formStyles.label}>Qty</Text>
              <TextInput keyboardType="numeric" value={l.qty} onChangeText={(v) => updateLine(l.key, { qty: v })} style={formStyles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={formStyles.label}>Rate</Text>
              <TextInput keyboardType="numeric" value={l.rate} onChangeText={(v) => updateLine(l.key, { rate: v })} style={formStyles.input} />
            </View>
          </View>
          {canDiscount && (
            <>
              <Text style={formStyles.label}>Discount %</Text>
              <TextInput keyboardType="numeric" value={l.discount_percent} onChangeText={(v) => updateLine(l.key, { discount_percent: v })} style={formStyles.input} />
            </>
          )}
        </View>
      ))}

      {confirming && (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>Are you sure you want to update this invoice?</Text>
          <Text style={styles.confirmSub}>New total: Rs. {newTotal.toFixed(2)}. Stock and customer credit will be adjusted accordingly.</Text>
        </View>
      )}
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormModal>
  );
}

export function InvoiceManagementScreen() {
  const canCancel = usePermission('pos.cancel_completed_invoice');
  const canEdit = usePermission('pos.edit_completed_invoice');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewingId, setViewingId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const listQuery = useQuery({ queryKey: ['invoices'], queryFn: () => invoicesApi.list() });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => invoicesApi.cancel(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    onError: (e) => Alert.alert('Error', friendlyErrorMessage(e)),
  });

  const rows = listQuery.data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.invoice_no || '').toLowerCase().includes(q) || (r.customer_name || '').toLowerCase().includes(q));
  }, [rows, search]);

  const confirmCancel = (inv) => {
    Alert.prompt
      ? Alert.prompt('Cancel invoice?', `Reverses stock/credit for ${inv.invoice_no}. Reason (optional):`, (reason) => cancelMutation.mutate({ id: inv.id, reason }))
      : Alert.alert('Cancel invoice?', inv.invoice_no, [{ text: 'No' }, { text: 'Yes', style: 'destructive', onPress: () => cancelMutation.mutate({ id: inv.id, reason: null }) }]);
  };

  return (
    <View style={styles.screen}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search invoice # or customer" style={styles.search} />
      <FlatList
        data={filtered}
        keyExtractor={(r) => String(r.id)}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>No invoices found.</Text>}
        renderItem={({ item: r }) => (
          <TouchableOpacity style={styles.card} onPress={() => setViewingId(r.id)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{r.invoice_no || `Held #${r.id}`}</Text>
              <Text style={[styles.status, { color: STATUS_COLOR[r.payment_status] || colors.inkMuted }]}>{r.payment_status || r.status}</Text>
            </View>
            <Text style={styles.cardMeta}>{r.customer_name || 'Walk-in'} · {r.invoice_date}</Text>
            <Text style={styles.cardTotal}>Rs. {r.grand_total}</Text>
            {r.status === 'completed' && (
              <View style={styles.actionsRow}>
                {canEdit && (
                  <TouchableOpacity onPress={() => setEditingId(r.id)}><Text style={styles.actionLink}>Edit</Text></TouchableOpacity>
                )}
                {canCancel && (
                  <TouchableOpacity onPress={() => confirmCancel(r)}><Text style={styles.actionLinkDanger}>Cancel</Text></TouchableOpacity>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}
      />
      {viewingId && <ViewModal id={viewingId} onClose={() => setViewingId(null)} />}
      {editingId && <EditModal id={editingId} onClose={() => setEditingId(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  search: { margin: 12, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 10 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '700', color: colors.ink },
  status: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink, marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  actionLink: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  actionLinkDanger: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  meta: { color: colors.inkMuted, fontSize: 12, marginBottom: 10 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  lineName: { flex: 1, color: colors.ink, fontSize: 13 },
  lineQty: { width: 60, textAlign: 'center', color: colors.inkMuted, fontSize: 12 },
  lineTotal: { width: 70, textAlign: 'right', fontWeight: '600', color: colors.ink, fontSize: 13 },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, backgroundColor: colors.highlight, borderRadius: 8, padding: 10 },
  grandLabel: { fontWeight: '700', color: colors.ink },
  grandValue: { fontWeight: '700', color: colors.ink },
  cancelledBox: { marginTop: 12, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10 },
  cancelledText: { color: colors.danger, fontSize: 12 },
  warnText: { fontSize: 12, color: colors.inkMuted, marginBottom: 8 },
  editLine: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, padding: 10, marginTop: 10, backgroundColor: colors.card },
  editLineName: { fontWeight: '700', color: colors.ink, marginBottom: 6 },
  confirmBox: { backgroundColor: colors.warningBg, borderRadius: 10, padding: 12, marginTop: 12 },
  confirmText: { fontWeight: '700', color: colors.warning, marginBottom: 4 },
  confirmSub: { fontSize: 12, color: colors.warning },
});
