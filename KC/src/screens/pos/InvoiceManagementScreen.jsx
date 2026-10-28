import { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../../api/invoices';
import { itemsApi } from '../../api/catalog';
import { customersApi } from '../../api/parties';
import { friendlyErrorMessage } from '../../api/client';
import { FormModal, formStyles } from '../../components/FormModal';
import { SelectField } from '../../components/SelectField';
import { Icon } from '../../components/Icon';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

const STATUS_COLOR = { paid: colors.success, partial: colors.warning, credit: colors.gold, cancelled: colors.danger, returned: colors.danger };
const GST_STATUS_COLOR = { not_generated: colors.inkMuted, generated: colors.success, failed: colors.danger, cancelled: colors.danger };
const GST_STATUS_LABEL = { not_generated: 'Not Generated', generated: 'Generated', failed: 'Failed', cancelled: 'Cancelled' };

/**
 * E-Invoice (IRN) / E-Way Bill panel — mirrors web's GstFilingPanel exactly:
 * same backend endpoints, same honest "not configured" behavior when no GSP
 * account exists (App\Services\GstEInvoiceService), never a fabricated
 * IRN/EWB number.
 */
function GstFilingModal({ invoiceId, onClose, canManage }) {
  const queryClient = useQueryClient();
  const { data: invoice } = useQuery({ queryKey: ['invoice', invoiceId], queryFn: () => invoicesApi.get(invoiceId) });
  const [transportOpen, setTransportOpen] = useState(false);
  const [transporterName, setTransporterName] = useState('');
  const [transporterGstin, setTransporterGstin] = useState('');
  const [distance, setDistance] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (invoice) {
      setTransporterName(invoice.transporter_name || '');
      setTransporterGstin(invoice.transporter_gstin || '');
      setDistance(invoice.transport_distance_km ? String(invoice.transport_distance_km) : '');
      setVehicleNo(invoice.vehicle_no || '');
    }
  }, [invoice]);

  if (!invoice) return null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });

  const runAction = async (key, fn) => {
    setActionError('');
    setBusy(key);
    try {
      await fn();
      invalidate();
    } catch (e) {
      setActionError(e?.response?.data?.result?.error || e?.response?.data?.error || friendlyErrorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const saveTransport = () => runAction('transport', async () => {
    await invoicesApi.updateTransport(invoiceId, {
      transporter_name: transporterName || null,
      transporter_gstin: transporterGstin || null,
      transport_distance_km: distance ? Number(distance) : null,
      vehicle_no: vehicleNo || null,
    });
    setTransportOpen(false);
  });

  return (
    <FormModal
      visible
      title={`GST Filing — ${invoice.invoice_no}`}
      onClose={onClose}
      footer={<TouchableOpacity style={formStyles.secondaryBtn} onPress={onClose}><Text style={formStyles.secondaryBtnText}>Close</Text></TouchableOpacity>}
    >
      <Text style={formStyles.label}>E-Invoice (IRN)</Text>
      <Text style={{ color: GST_STATUS_COLOR[invoice.einvoice_status], fontWeight: '700', marginBottom: 8 }}>
        {GST_STATUS_LABEL[invoice.einvoice_status]}
      </Text>
      {invoice.irn ? (
        <Text style={styles.cardMeta}>IRN: {invoice.irn} · Ack# {invoice.ack_no} · {invoice.ack_date}</Text>
      ) : null}
      {invoice.einvoice_status === 'failed' && invoice.einvoice_error ? (
        <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{invoice.einvoice_error}</Text>
      ) : null}
      {canManage && (
        invoice.einvoice_status === 'generated' ? (
          <TouchableOpacity style={[formStyles.secondaryBtn, styles.gstBtn, busy === 'einvoice_cancel' && formStyles.disabled]} disabled={busy === 'einvoice_cancel'} onPress={() => runAction('einvoice_cancel', () => invoicesApi.cancelEInvoice(invoiceId, 'Cancelled from mobile'))}>
            <Text style={formStyles.secondaryBtnText}>{busy === 'einvoice_cancel' ? 'Cancelling…' : 'Cancel E-Invoice'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[formStyles.primaryBtn, styles.gstBtn, busy === 'einvoice' && formStyles.disabled]} disabled={busy === 'einvoice'} onPress={() => runAction('einvoice', () => invoicesApi.generateEInvoice(invoiceId))}>
            <Text style={formStyles.primaryBtnText}>{busy === 'einvoice' ? 'Generating…' : 'Generate E-Invoice'}</Text>
          </TouchableOpacity>
        )
      )}

      <Text style={[formStyles.label, { marginTop: 20 }]}>E-Way Bill</Text>
      <Text style={{ color: GST_STATUS_COLOR[invoice.eway_bill_status], fontWeight: '700', marginBottom: 8 }}>
        {GST_STATUS_LABEL[invoice.eway_bill_status]}
      </Text>
      {invoice.eway_bill_no ? (
        <Text style={styles.cardMeta}>EWB# {invoice.eway_bill_no} · Valid until {invoice.eway_bill_valid_until || '-'}</Text>
      ) : null}
      {invoice.eway_bill_status === 'failed' && invoice.eway_bill_error ? (
        <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{invoice.eway_bill_error}</Text>
      ) : null}
      {canManage && (
        <>
          <TouchableOpacity style={[formStyles.secondaryBtn, styles.gstBtn]} onPress={() => setTransportOpen((v) => !v)}>
            <Text style={formStyles.secondaryBtnText}>{transportOpen ? 'Hide Transport Details' : 'Transport Details'}</Text>
          </TouchableOpacity>
          {transportOpen && (
            <View style={{ marginTop: 8 }}>
              <TextInput value={transporterName} onChangeText={setTransporterName} placeholder="Transporter name" style={formStyles.input} />
              <TextInput value={transporterGstin} onChangeText={setTransporterGstin} placeholder="Transporter GSTIN" style={[formStyles.input, { marginTop: 8 }]} />
              <TextInput value={distance} onChangeText={setDistance} placeholder="Distance (km)" keyboardType="numeric" style={[formStyles.input, { marginTop: 8 }]} />
              <TextInput value={vehicleNo} onChangeText={setVehicleNo} placeholder="Vehicle No" style={[formStyles.input, { marginTop: 8 }]} />
              <TouchableOpacity style={[formStyles.primaryBtn, styles.gstBtn, busy === 'transport' && formStyles.disabled]} disabled={busy === 'transport'} onPress={saveTransport}>
                <Text style={formStyles.primaryBtnText}>{busy === 'transport' ? 'Saving…' : 'Save Transport Details'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {invoice.eway_bill_status === 'generated' ? (
            <TouchableOpacity style={[formStyles.secondaryBtn, styles.gstBtn, busy === 'eway_cancel' && formStyles.disabled]} disabled={busy === 'eway_cancel'} onPress={() => runAction('eway_cancel', () => invoicesApi.cancelEWayBill(invoiceId, 'Cancelled from mobile'))}>
              <Text style={formStyles.secondaryBtnText}>{busy === 'eway_cancel' ? 'Cancelling…' : 'Cancel E-Way Bill'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[formStyles.primaryBtn, styles.gstBtn, busy === 'eway' && formStyles.disabled]} disabled={busy === 'eway'} onPress={() => runAction('eway', () => invoicesApi.generateEWayBill(invoiceId))}>
              <Text style={formStyles.primaryBtnText}>{busy === 'eway' ? 'Generating…' : 'Generate E-Way Bill'}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      {actionError ? <Text style={formStyles.error}>{actionError}</Text> : null}
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
  const canManageGst = usePermission('pos.manage_gst_filing');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [thermalInvoice, setThermalInvoice] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [gstInvoiceId, setGstInvoiceId] = useState(null);

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

  const openViewThermal = async (inv) => {
    try {
      const full = await invoicesApi.get(inv.id);
      setThermalInvoice(full);
    } catch (_e) {
      setThermalInvoice(inv);
    }
  };

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
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{r.invoice_no || `Held #${r.id}`}</Text>
              <Text style={[styles.status, { color: STATUS_COLOR[r.payment_status] || colors.inkMuted }]}>{r.payment_status || r.status}</Text>
            </View>
            <Text style={styles.cardMeta}>{r.customer_name || 'Walk-in'} · {r.invoice_date}</Text>
            <Text style={styles.cardTotal}>Rs. {r.grand_total}</Text>

            {/* Explicit CRUD Action Buttons: View, Edit, Cancel */}
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => openViewThermal(r)} style={styles.actionBtnView}>
                <Icon name="view" size={14} color={colors.ink} style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnViewText}>View / Print</Text>
              </TouchableOpacity>

              {r.status === 'completed' && canEdit && (
                <TouchableOpacity onPress={() => setEditingId(r.id)} style={styles.actionBtnEdit}>
                  <Icon name="edit" size={14} color={colors.gold} style={{ marginRight: 4 }} />
                  <Text style={styles.actionBtnEditText}>Edit</Text>
                </TouchableOpacity>
              )}

              {r.status === 'completed' && canCancel && (
                <TouchableOpacity onPress={() => confirmCancel(r)} style={styles.actionBtnDanger}>
                  <Icon name="delete" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                  <Text style={styles.actionBtnDangerText}>Cancel</Text>
                </TouchableOpacity>
              )}

              {r.status === 'completed' && r.bill_type === 'gst' && (
                <TouchableOpacity onPress={() => setGstInvoiceId(r.id)} style={styles.actionBtnEdit}>
                  <Icon name="reports" size={14} color={colors.gold} style={{ marginRight: 4 }} />
                  <Text style={styles.actionBtnEditText}>GST</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      <ThermalReceiptModal
        visible={!!thermalInvoice}
        invoice={thermalInvoice}
        onClose={() => setThermalInvoice(null)}
      />

      {editingId && <EditModal id={editingId} onClose={() => setEditingId(null)} />}
      {gstInvoiceId && <GstFilingModal invoiceId={gstInvoiceId} onClose={() => setGstInvoiceId(null)} canManage={canManageGst} />}
    </View>
  );
}

const styles = StyleSheet.create({
  gstBtn: { marginTop: 8 },
  screen: { flex: 1, backgroundColor: colors.page },
  search: { margin: 12, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 10 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '700', color: colors.ink },
  status: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink, marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 10 },
  actionBtnView: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.page, borderWidth: 1, borderColor: colors.borderSoft },
  actionBtnViewText: { color: colors.ink, fontWeight: '600', fontSize: 12 },
  actionBtnEdit: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FDF8EC', borderWidth: 1, borderColor: colors.gold },
  actionBtnEditText: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  actionBtnDanger: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: colors.danger },
  actionBtnDangerText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  warnText: { fontSize: 12, color: colors.inkMuted, marginBottom: 8 },
  editLine: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, padding: 10, marginTop: 10, backgroundColor: colors.card },
  editLineName: { fontWeight: '700', color: colors.ink, marginBottom: 6 },
  confirmBox: { backgroundColor: colors.warningBg, borderRadius: 10, padding: 12, marginTop: 12 },
  confirmText: { fontWeight: '700', color: colors.warning, marginBottom: 4 },
  confirmSub: { fontSize: 12, color: colors.warning },
});
