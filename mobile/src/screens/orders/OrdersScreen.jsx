import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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
  const [lines, setLines] = useState([{ key: '1', item_id: null, qty: '1', rate: '' }]);
  const [error, setError] = useState('');

  const items = itemsQuery.data || [];
  const validLines = lines.filter((l) => l.item_id);
  const subtotal = validLines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.rate || 0), 0);
  const gst = validLines.reduce((s, l) => {
    const item = items.find((i) => i.id === l.item_id);
    return s + Number(l.qty || 0) * Number(l.rate || 0) * (Number(item?.gst_percent || 0) / 100);
  }, 0);

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
    setCustomerId(null); setRouteId(null); setEmployeeId(null); setBookingSource('direct');
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

      <View style={styles.totalsBox}>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{subtotal.toFixed(2)}</Text></View>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>GST</Text><Text style={styles.totalValue}>{gst.toFixed(2)}</Text></View>
        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>Estimated Total</Text>
          <Text style={styles.grandValue}>Rs. {(subtotal + gst).toFixed(2)}</Text>
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

function PrebookingsTab() {
  const canManageStatus = usePermission('orders.manage_prebooking_status');
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
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
        contentContainerStyle={{ padding: 12 }}
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
            {canManageStatus && r.status === 'pending' && (
              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => Alert.alert('Cancel pre-booking?', r.prebooking_no, [
                  { text: 'No' }, { text: 'Yes, cancel', style: 'destructive', onPress: () => cancelMutation.mutate(r.id) },
                ])}
              >
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ New Pre-Booking</Text>
      </TouchableOpacity>
      <PrebookingFormModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

function RequestsTab() {
  const canApprove = usePermission('orders.approve_purchase_request');
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
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
        contentContainerStyle={{ padding: 12 }}
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
            {canApprove && r.status === 'open' && (
              <TouchableOpacity style={styles.approveLink} onPress={() => approveMutation.mutate(r.id)}>
                <Text style={styles.approveLinkText}>Approve</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ New Request</Text>
      </TouchableOpacity>
      <RequestFormModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

export function OrdersScreen() {
  const [tab, setTab] = useState('prebookings');
  return (
    <View style={styles.screen}>
      <SegmentedTabs
        tabs={[{ key: 'prebookings', label: 'Customer Pre-Bookings' }, { key: 'requests', label: 'Supplier Requests' }]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'prebookings' ? <PrebookingsTab /> : <RequestsTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '700', color: colors.ink },
  status: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink, marginTop: 6 },
  cancelLink: { marginTop: 8, alignSelf: 'flex-start' },
  cancelLinkText: { color: colors.danger, fontWeight: '600', fontSize: 12 },
  approveLink: { marginTop: 8, alignSelf: 'flex-start' },
  approveLinkText: { color: colors.success, fontWeight: '700', fontSize: 12 },
  fab: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: colors.navbar, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  fabText: { color: colors.gold, fontWeight: '700' },
  totalsBox: { backgroundColor: colors.page, borderRadius: 10, padding: 12, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { color: colors.inkMuted, fontSize: 12 },
  totalValue: { color: colors.ink, fontSize: 12 },
  grandRow: { marginTop: 4, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 6 },
  grandLabel: { fontWeight: '700', color: colors.ink },
  grandValue: { fontWeight: '700', color: colors.ink, fontSize: 15 },
});
