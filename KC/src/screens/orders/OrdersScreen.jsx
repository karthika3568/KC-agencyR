import { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerPrebookingsApi, purchaseRequestsApi, routeSuppliersApi } from '../../api/purchasing';
import { customersApi, suppliersApi, routesApi } from '../../api/parties';
import { itemsApi } from '../../api/catalog';
import { usersApi } from '../../api/users';
import { friendlyErrorMessage } from '../../api/client';
import { FormModal, formStyles } from '../../components/FormModal';
import { SelectField } from '../../components/SelectField';
import { ItemLineEditor } from '../../components/ItemLineEditor';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { usePermission } from '../../hooks/useAuth';

const PB_STATUS_COLOR = { pending: colors.warning, confirmed: colors.gold, processing: colors.gold, ready: colors.success, completed: colors.success, cancelled: colors.danger };
const PR_STATUS_COLOR = { open: colors.warning, approved: colors.gold, partially_received: colors.gold, converted_to_grn: colors.success, cancelled: colors.danger };
const BOOKING_SOURCES = [
  { id: 'direct', name: 'Direct Walk-in' }, { id: 'salesman', name: 'Salesman' },
  { id: 'phone', name: 'Phone' }, { id: 'whatsapp', name: 'WhatsApp' },
];

function PrebookingFormModal({ visible, onClose }) {
  const queryClient = useQueryClient();
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list, enabled: visible });
  const routesQuery = useQuery({ queryKey: ['routes'], queryFn: routesApi.list, enabled: visible });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: usersApi.list, enabled: visible });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list(''), enabled: visible });

  const [customerId, setCustomerId] = useState(null);
  const [routeId, setRouteId] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [bookingSource, setBookingSource] = useState('direct');
  const [customEstimatedTotal, setCustomEstimatedTotal] = useState('');
  const [lines, setLines] = useState([{ key: '1', item_id: null, qty: '1', rate: '' }]);
  const [error, setError] = useState('');

  const items = itemsQuery.data || [];
  const validLines = lines.filter((l) => l.item_id);
  const subtotal = validLines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.rate || 0), 0);
  const gst = validLines.reduce((s, l) => {
    const item = items.find((i) => i.id === l.item_id);
    return s + Number(l.qty || 0) * Number(l.rate || 0) * (Number(item?.gst_percent || 0) / 100);
  }, 0);
  const autoEstimatedTotal = (subtotal + gst).toFixed(2);

  const createMutation = useMutation({
    mutationFn: customerPrebookingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-prebookings'] });
      reset();
      onClose();
    },
    onError: (err) => setError(friendlyErrorMessage(err)),
  });

  const reset = () => {
    setCustomerId(null); setRouteId(null); setEmployeeId(null); setBookingSource('direct'); setCustomEstimatedTotal('');
    setLines([{ key: '1', item_id: null, qty: '1', rate: '' }]);
    setError('');
  };

  const submit = () => {
    setError('');
    if (!customerId) return setError('Select a customer.');
    if (validLines.length === 0) return setError('Add at least one item.');
    createMutation.mutate({
      customer_id: customerId,
      route_id: routeId,
      employee_id: employeeId,
      booking_source: bookingSource,
      estimated_total: Number(customEstimatedTotal !== '' ? customEstimatedTotal : (subtotal + gst)),
      items: validLines.map((l) => ({ item_id: l.item_id, qty: Number(l.qty), rate: l.rate !== '' ? Number(l.rate) : undefined })),
    });
  };

  return (
    <FormModal
      visible={visible}
      title="New Customer Pre-Booking"
      onClose={() => { reset(); onClose(); }}
      footer={
        <>
          <TouchableOpacity style={formStyles.secondaryBtn} onPress={() => { reset(); onClose(); }}>
            <Text style={formStyles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[formStyles.primaryBtn, createMutation.isPending && formStyles.disabled]}
            onPress={submit}
            disabled={createMutation.isPending}
          >
            <Text style={formStyles.primaryBtnText}>{createMutation.isPending ? 'Saving…' : 'Create Pre-Booking'}</Text>
          </TouchableOpacity>
        </>
      }
    >
      <SelectField label="Customer" required value={customerId} options={customersQuery.data || []} labelKey="ledger_name" onChange={setCustomerId} />
      <SelectField label="Booking Source" value={bookingSource} options={BOOKING_SOURCES} onChange={setBookingSource} />
      <SelectField label="Route" value={routeId} options={routesQuery.data || []} onChange={setRouteId} />
      <SelectField label="Salesman / Employee" value={employeeId} options={usersQuery.data || []} onChange={setEmployeeId} />

      <Text style={formStyles.label}>Items</Text>
      <ItemLineEditor lines={lines} setLines={setLines} items={items} />

      <Text style={formStyles.label}>Estimated Total (Rs.) (Editable)</Text>
      <TextInput
        keyboardType="numeric"
        value={customEstimatedTotal !== '' ? customEstimatedTotal : autoEstimatedTotal}
        onChangeText={setCustomEstimatedTotal}
        style={formStyles.input}
        placeholder={autoEstimatedTotal}
      />

      <View style={styles.totalsBox}>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{subtotal.toFixed(2)}</Text></View>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>GST</Text><Text style={styles.totalValue}>{gst.toFixed(2)}</Text></View>
        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>Final Estimated Total</Text>
          <Text style={styles.grandValue}>Rs. {customEstimatedTotal !== '' ? Number(customEstimatedTotal).toFixed(2) : autoEstimatedTotal}</Text>
        </View>
      </View>

      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormModal>
  );
}

function RequestFormModal({ visible, onClose }) {
  const queryClient = useQueryClient();
  const routesQuery = useQuery({ queryKey: ['routes'], queryFn: routesApi.list, enabled: visible });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list, enabled: visible });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list(''), enabled: visible });

  const [routeId, setRouteId] = useState(null);
  const [supplierId, setSupplierId] = useState(null);
  const [lines, setLines] = useState([{ key: '1', item_id: null, qty: '1', rate: '' }]);
  const [error, setError] = useState('');

  const mappedSuppliersQuery = useQuery({
    queryKey: ['route-suppliers', routeId],
    queryFn: () => routeSuppliersApi.get(routeId),
    enabled: visible && !!routeId,
  });
  const allSuppliers = suppliersQuery.data || [];
  const mappedIds = mappedSuppliersQuery.data?.supplier_ids;
  const suppliers = routeId && mappedIds && mappedIds.length > 0 ? allSuppliers.filter((s) => mappedIds.includes(s.id)) : allSuppliers;

  const items = itemsQuery.data || [];
  const validLines = lines.filter((l) => l.item_id);
  const total = validLines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.rate || 0), 0);

  const createMutation = useMutation({
    mutationFn: purchaseRequestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      reset();
      onClose();
    },
    onError: (err) => setError(friendlyErrorMessage(err)),
  });

  const reset = () => {
    setRouteId(null); setSupplierId(null);
    setLines([{ key: '1', item_id: null, qty: '1', rate: '' }]);
    setError('');
  };

  const submit = () => {
    setError('');
    if (!supplierId) return setError('Select a supplier.');
    if (validLines.length === 0) return setError('Add at least one item.');
    createMutation.mutate({
      supplier_id: supplierId,
      route_id: routeId,
      items: validLines.map((l) => ({ item_id: l.item_id, qty: Number(l.qty), rate: Number(l.rate || 0) })),
    });
  };

  return (
    <FormModal
      visible={visible}
      title="New Supplier Purchase Request"
      onClose={() => { reset(); onClose(); }}
      footer={
        <>
          <TouchableOpacity style={formStyles.secondaryBtn} onPress={() => { reset(); onClose(); }}>
            <Text style={formStyles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[formStyles.primaryBtn, createMutation.isPending && formStyles.disabled]}
            onPress={submit}
            disabled={createMutation.isPending}
          >
            <Text style={formStyles.primaryBtnText}>{createMutation.isPending ? 'Saving…' : 'Generate Request'}</Text>
          </TouchableOpacity>
        </>
      }
    >
      <SelectField label="Route (optional — filters suppliers)" value={routeId} options={routesQuery.data || []} onChange={(v) => { setRouteId(v); setSupplierId(null); }} />
      <SelectField label="Supplier" required value={supplierId} options={suppliers} onChange={setSupplierId} />

      <Text style={formStyles.label}>Items</Text>
      <ItemLineEditor lines={lines} setLines={setLines} items={items} rateLabel="Purchase Rate" />

      <View style={styles.totalsBox}>
        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>Estimated Total</Text>
          <Text style={styles.grandValue}>Rs. {total.toFixed(2)}</Text>
        </View>
      </View>

      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormModal>
  );
}

function PrebookingsTab({ modalVisible, setModalVisible }) {
  const canManageStatus = usePermission('orders.manage_prebooking_status');
  const queryClient = useQueryClient();
  const [viewBooking, setViewBooking] = useState(null);
  const listQuery = useQuery({ queryKey: ['customer-prebookings'], queryFn: customerPrebookingsApi.list });
  const cancelMutation = useMutation({
    mutationFn: customerPrebookingsApi.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-prebookings'] }),
  });
  const rows = listQuery.data || [];

  return (
    <>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 140, flexGrow: 1 }}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        ListEmptyComponent={<Text style={styles.empty}>No pre-bookings yet.</Text>}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{r.prebooking_no}</Text>
              <Text style={[styles.status, { color: PB_STATUS_COLOR[r.status] }]}>{r.status}</Text>
            </View>
            <Text style={styles.cardMeta}>{r.customer_name} · {r.item_count} item(s)</Text>
            {r.route_name ? <Text style={styles.cardMeta}>Route: {r.route_name}</Text> : null}
            <Text style={styles.cardTotal}>Rs. {Number(r.estimated_total).toFixed(2)}</Text>

            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => setViewBooking(r)} style={styles.actionBtn}>
                <Icon name="view" size={14} color={colors.ink} style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnText}>View</Text>
              </TouchableOpacity>

              {canManageStatus && r.status === 'pending' && (
                <TouchableOpacity
                  style={styles.actionBtnDanger}
                  onPress={() => Alert.alert('Cancel pre-booking?', r.prebooking_no, [
                    { text: 'No' }, { text: 'Yes, cancel', style: 'destructive', onPress: () => cancelMutation.mutate(r.id) },
                  ])}
                >
                  <Icon name="delete" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                  <Text style={styles.actionBtnDangerText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
      <PrebookingFormModal visible={modalVisible} onClose={() => setModalVisible(false)} />

      {/* View Modal */}
      {viewBooking && (
        <FormModal
          visible
          title={`Pre-Booking: ${viewBooking.prebooking_no}`}
          onClose={() => setViewBooking(null)}
          footer={
            <TouchableOpacity style={formStyles.primaryBtn} onPress={() => setViewBooking(null)}>
              <Text style={formStyles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          }
        >
          <View style={styles.detailBox}>
            <DetailRow label="Pre-Booking #" value={viewBooking.prebooking_no} />
            <DetailRow label="Customer" value={viewBooking.customer_name} />
            <DetailRow label="Route" value={viewBooking.route_name || '-'} />
            <DetailRow label="Items Count" value={viewBooking.item_count} />
            <DetailRow label="Estimated Total" value={`Rs. ${Number(viewBooking.estimated_total).toFixed(2)}`} />
            <DetailRow label="Status" value={viewBooking.status} />
          </View>
        </FormModal>
      )}
    </>
  );
}

function RequestsTab({ modalVisible, setModalVisible }) {
  const canApprove = usePermission('orders.approve_purchase_request');
  const queryClient = useQueryClient();
  const [viewRequest, setViewRequest] = useState(null);
  const listQuery = useQuery({ queryKey: ['purchase-requests'], queryFn: purchaseRequestsApi.list });
  const approveMutation = useMutation({
    mutationFn: purchaseRequestsApi.approve,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-requests'] }),
  });
  const rows = listQuery.data || [];

  return (
    <>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 140, flexGrow: 1 }}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        ListEmptyComponent={<Text style={styles.empty}>No requests yet.</Text>}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{r.request_no}</Text>
              <Text style={[styles.status, { color: PR_STATUS_COLOR[r.status] }]}>{r.status.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.cardMeta}>{r.supplier_name} · {r.item_count} item(s)</Text>
            {r.route_name ? <Text style={styles.cardMeta}>Route: {r.route_name}</Text> : null}
            <Text style={styles.cardTotal}>Rs. {Number(r.estimated_total).toFixed(2)}</Text>

            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => setViewRequest(r)} style={styles.actionBtn}>
                <Icon name="view" size={14} color={colors.ink} style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnText}>View</Text>
              </TouchableOpacity>

              {canApprove && r.status === 'open' && (
                <TouchableOpacity style={styles.actionBtnSuccess} onPress={() => approveMutation.mutate(r.id)}>
                  <Icon name="check" size={14} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={styles.actionBtnSuccessText}>Approve</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
      <RequestFormModal visible={modalVisible} onClose={() => setModalVisible(false)} />

      {/* View Modal */}
      {viewRequest && (
        <FormModal
          visible
          title={`Request: ${viewRequest.request_no}`}
          onClose={() => setViewRequest(null)}
          footer={
            <TouchableOpacity style={formStyles.primaryBtn} onPress={() => setViewRequest(null)}>
              <Text style={formStyles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          }
        >
          <View style={styles.detailBox}>
            <DetailRow label="Request #" value={viewRequest.request_no} />
            <DetailRow label="Supplier" value={viewRequest.supplier_name} />
            <DetailRow label="Route" value={viewRequest.route_name || '-'} />
            <DetailRow label="Items Count" value={viewRequest.item_count} />
            <DetailRow label="Estimated Total" value={`Rs. ${Number(viewRequest.estimated_total).toFixed(2)}`} />
            <DetailRow label="Status" value={viewRequest.status} />
          </View>
        </FormModal>
      )}
    </>
  );
}

export function OrdersScreen() {
  const [tab, setTab] = useState('prebookings');
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <SegmentedTabs
            tabs={[{ key: 'prebookings', label: 'Customer Pre-Bookings' }, { key: 'requests', label: 'Supplier Requests' }]}
            active={tab}
            onChange={(t) => { setTab(t); setModalVisible(false); }}
          />
        </View>
        <TouchableOpacity style={styles.topRightBtn} onPress={() => setModalVisible(true)}>
          <Icon name="plus" size={14} color={colors.gold} style={{ marginRight: 4 }} />
          <Text style={styles.topRightBtnText}>
            {tab === 'prebookings' ? '+ Pre-Booking' : '+ Request'}
          </Text>
        </TouchableOpacity>
      </View>
      {tab === 'prebookings' ? (
        <PrebookingsTab modalVisible={modalVisible} setModalVisible={setModalVisible} />
      ) : (
        <RequestsTab modalVisible={modalVisible} setModalVisible={setModalVisible} />
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
  status: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink, marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.page, borderWidth: 1, borderColor: colors.borderSoft },
  actionBtnText: { color: colors.ink, fontWeight: '600', fontSize: 12 },
  actionBtnDanger: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: colors.danger },
  actionBtnDangerText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  actionBtnSuccess: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: colors.success },
  actionBtnSuccessText: { color: colors.success, fontWeight: '700', fontSize: 12 },
  totalsBox: { backgroundColor: colors.page, borderRadius: 10, padding: 12, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { color: colors.inkMuted, fontSize: 12 },
  totalValue: { color: colors.ink, fontSize: 12 },
  grandRow: { marginTop: 4, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 6 },
  grandLabel: { fontWeight: '700', color: colors.ink },
  grandValue: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  detailBox: { backgroundColor: colors.page, borderRadius: 10, padding: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  detailLabel: { fontWeight: '600', color: colors.inkMuted, fontSize: 13 },
  detailVal: { fontWeight: '700', color: colors.ink, fontSize: 13 },
});
