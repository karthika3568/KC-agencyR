import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockHubApi, stockAdjustmentsApi } from '../../api/purchasing';
import { itemsApi } from '../../api/catalog';
import { friendlyErrorMessage } from '../../api/client';
import { FormModal, formStyles } from '../../components/FormModal';
import { SelectField } from '../../components/SelectField';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { ExcelToolbar } from '../../components/ExcelToolbar';
import { ImportExcelModal } from '../../components/ImportExcelModal';
import { Icon } from '../../components/Icon';
import { usePermission } from '../../hooks/useAuth';
import { saveAndShareBase64 } from '../../utils/fileExportService';
import { buildXlsxBase64 } from '../../utils/excelWriter';
import { downloadReportPdf } from '../../utils/pdfService';
import { colors } from '../../theme/colors';

const ADJUSTMENT_REASONS = [
  { id: 'damage', name: 'Stock Damage' },
  { id: 'spoilage', name: 'Spoilage' },
  { id: 'count_correction', name: 'Count Correction' },
  { id: 'other', name: 'Other' },
];

const STOCK_EXPORT_COLUMNS = {
  item_name: 'Item', item_code: 'Item Code', quantity_on_hand: 'Current Stock', unit_code: 'Unit',
};

const VAN_STOCK_EXPORT_COLUMNS = {
  item_name: 'Item', item_code: 'SKU', barcode: 'Barcode', unit_code: 'Unit', quantity_on_hand: 'Quantity',
  cost_price: 'Purchase/Cost Price', selling_price: 'Selling Price', stock_value: 'Stock Value',
  owner_name: 'Van/Salesman', branch_name: 'Branch',
};

export function InventoryScreen() {
  const canView = usePermission('inventory.view_stock');
  const canAdjust = usePermission('inventory.stock_adjustment');
  const [tab, setTab] = useState('stock');

  return (
    <View style={styles.screen}>
      <SegmentedTabs
        tabs={[{ key: 'stock', label: 'Stock' }, { key: 'van', label: 'Van / Salesman' }, { key: 'adjust', label: 'Stock Adjustment' }]}
        active={tab}
        onChange={setTab}
      />
      <View style={{ flex: 1, marginTop: 8 }}>
        {tab === 'stock' && canView && <StockListPanel />}
        {tab === 'van' && canView && <VanSalesmanStockPanel />}
        {tab === 'adjust' && <StockAdjustmentPanel canAdjust={canAdjust} />}
      </View>
    </View>
  );
}

/**
 * Van/Salesman Stock (section 11) — same stockHubApi.list() the web Stock
 * Hub uses, filtered to owner_type=employee, with export honoring whatever
 * is currently selected (or, with nothing selected, whatever the search box
 * currently filters to) — never a full unfiltered dump.
 */
function VanSalesmanStockPanel() {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const stockQuery = useQuery({ queryKey: ['stock-hub', 'employee'], queryFn: () => stockHubApi.list({ owner_type: 'employee' }) });
  const rows = useMemo(() => stockQuery.data || [], [stockQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.item_name || '').toLowerCase().includes(q) || (r.owner_name || '').toLowerCase().includes(q));
  }, [rows, search]);

  const rowKey = (r) => `${r.item_id}-${r.owner_id}`;
  const toggleSelect = (r) => setSelectedIds((prev) => (prev.includes(rowKey(r)) ? prev.filter((x) => x !== rowKey(r)) : [...prev, rowKey(r)]));
  const selectAll = () => setSelectedIds(filtered.map(rowKey));
  const clearSelection = () => setSelectedIds([]);
  const exportRows = selectedIds.length > 0 ? filtered.filter((r) => selectedIds.includes(rowKey(r))) : filtered;

  const runExport = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Export failed', friendlyErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const exportExcel = () => {
    if (exportRows.length === 0) return Alert.alert('Nothing to export', 'No van/salesman stock rows match the current filter.');
    runExport(async () => {
      const base64 = buildXlsxBase64(VAN_STOCK_EXPORT_COLUMNS, exportRows, 'Van-Salesman Stock');
      await saveAndShareBase64(base64, 'van_salesman_stock.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  };
  const exportPdf = () => {
    if (exportRows.length === 0) return Alert.alert('Nothing to export', 'No van/salesman stock rows match the current filter.');
    runExport(() => downloadReportPdf({
      title: 'Van / Salesman Stock',
      filtersText: selectedIds.length > 0 ? `${exportRows.length} row(s) selected` : (search ? `Search: "${search}"` : 'All van/salesman stock'),
      columns: VAN_STOCK_EXPORT_COLUMNS, rows: exportRows,
    }, 'van_salesman_stock.pdf'));
  };

  return (
    <View style={{ flex: 1 }}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search by item or salesman…" style={styles.search} />

      <View style={styles.selectionBar}>
        <Text style={styles.selectionText}>{selectedIds.length > 0 ? `${selectedIds.length} selected` : `${filtered.length} row(s)`}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={selectAll}><Text style={styles.linkBtn}>Select All</Text></TouchableOpacity>
          <TouchableOpacity onPress={clearSelection}><Text style={styles.linkBtn}>Clear</Text></TouchableOpacity>
        </View>
      </View>
      <View style={styles.selectionBar}>
        <TouchableOpacity style={styles.selectedExportBtn} onPress={exportExcel} disabled={busy}>
          <Text style={styles.selectedExportText}>{busy ? 'Working…' : 'Export Excel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectedExportBtn} onPress={exportPdf} disabled={busy}>
          <Text style={styles.selectedExportText}>Export PDF</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={rowKey}
        refreshing={stockQuery.isFetching}
        onRefresh={stockQuery.refetch}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>No van/salesman stock.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={styles.checkbox} onPress={() => toggleSelect(item)}>
              {selectedIds.includes(rowKey(item)) && <View style={styles.checkboxFill} />}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.item_name}</Text>
              <Text style={styles.code}>{item.owner_name} · {item.branch_name || '-'}</Text>
            </View>
            <Text style={[styles.qty, Number(item.quantity_on_hand) <= 0 && styles.qtyLow]}>
              {item.quantity_on_hand} {item.unit_code || 'units'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

function StockListPanel() {
  const [search, setSearch] = useState('');
  const [viewStock, setViewStock] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const stockQuery = useQuery({ queryKey: ['stock-hub', 'branch'], queryFn: () => stockHubApi.list({ owner_type: 'branch' }) });
  const rows = useMemo(() => stockQuery.data || [], [stockQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.item_name || '').toLowerCase().includes(q));
  }, [rows, search]);

  const toggleSelect = (itemId) => setSelectedIds((prev) => (prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]));
  const selectAll = () => setSelectedIds(filtered.map((r) => r.item_id));
  const clearSelection = () => setSelectedIds([]);
  const selectedRows = filtered.filter((r) => selectedIds.includes(r.item_id));

  const runExport = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Export failed', friendlyErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const exportSelectedExcel = () => {
    if (selectedIds.length === 0) return Alert.alert('Nothing selected', 'Select at least one item to export.');
    runExport(async () => {
      const base64 = buildXlsxBase64(STOCK_EXPORT_COLUMNS, selectedRows, 'Selected Stock');
      await saveAndShareBase64(base64, 'inventory_selected.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  };
  const exportSelectedPdf = () => {
    if (selectedIds.length === 0) return Alert.alert('Nothing selected', 'Select at least one item to export.');
    runExport(() => downloadReportPdf({
      title: 'Inventory — Selected Items', filtersText: `${selectedRows.length} item(s) selected`,
      columns: STOCK_EXPORT_COLUMNS, rows: selectedRows,
    }, 'inventory_selected.pdf'));
  };

  return (
    <View style={{ flex: 1 }}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search stock by item name…" style={styles.search} />

      <ExcelToolbar onGetList={stockQuery.refetch} onImportPress={() => setImportOpen(true)} busy={busy} setBusy={setBusy} />

      <View style={styles.selectionBar}>
        <Text style={styles.selectionText}>{selectedIds.length > 0 ? `${selectedIds.length} item(s) selected` : `${filtered.length} item(s)`}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={selectAll}><Text style={styles.linkBtn}>Select All</Text></TouchableOpacity>
          <TouchableOpacity onPress={clearSelection}><Text style={styles.linkBtn}>Clear</Text></TouchableOpacity>
        </View>
      </View>
      {selectedIds.length > 0 && (
        <View style={styles.selectionBar}>
          <TouchableOpacity style={styles.selectedExportBtn} onPress={exportSelectedExcel} disabled={busy}>
            <Text style={styles.selectedExportText}>Export Selected Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectedExportBtn} onPress={exportSelectedPdf} disabled={busy}>
            <Text style={styles.selectedExportText}>Export Selected PDF</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(r, idx) => `${r.item_id}-${idx}`}
        refreshing={stockQuery.isFetching}
        onRefresh={stockQuery.refetch}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>No stock data.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={styles.checkbox} onPress={() => toggleSelect(item.item_id)}>
              {selectedIds.includes(item.item_id) && <View style={styles.checkboxFill} />}
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewStock(item)}>
              <Text style={styles.name} numberOfLines={1}>{item.item_name}</Text>
              <Text style={styles.code}>{item.item_code || 'No code'}</Text>
            </TouchableOpacity>
            <Text style={[styles.qty, Number(item.quantity_on_hand) <= 0 && styles.qtyLow]}>
              {item.quantity_on_hand} {item.unit_code || 'units'}
            </Text>
            <TouchableOpacity onPress={() => setViewStock(item)} style={{ marginLeft: 12 }}>
              <Icon name="view" size={16} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
        )}
      />

      {viewStock && (
        <FormModal
          visible
          title={`Stock Detail: ${viewStock.item_name}`}
          onClose={() => setViewStock(null)}
          footer={
            <TouchableOpacity style={formStyles.primaryBtn} onPress={() => setViewStock(null)}>
              <Text style={formStyles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          }
        >
          <View style={styles.detailBox}>
            <DetailRow label="Item Name" value={viewStock.item_name} />
            <DetailRow label="Item Code" value={viewStock.item_code || '-'} />
            <DetailRow label="Stock On Hand" value={`${viewStock.quantity_on_hand} ${viewStock.unit_code || ''}`} />
            <DetailRow label="Owner Type" value={viewStock.owner_type || 'Branch'} />
          </View>
        </FormModal>
      )}

      {importOpen && (
        <ImportExcelModal
          onClose={() => setImportOpen(false)}
          onImported={() => stockQuery.refetch()}
        />
      )}
    </View>
  );
}

function StockAdjustmentPanel({ canAdjust }) {
  const queryClient = useQueryClient();
  const [itemId, setItemId] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('addition');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('damage');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [historyView, setHistoryView] = useState(null);

  const itemsQuery = useQuery({ queryKey: ['items-all-for-adjustment'], queryFn: () => itemsApi.list('') });
  const stockQuery = useQuery({ queryKey: ['stock-hub', 'branch'], queryFn: () => stockHubApi.list({ owner_type: 'branch' }) });
  const historyQuery = useQuery({ queryKey: ['stock-adjustments'], queryFn: stockAdjustmentsApi.list });

  const items = itemsQuery.data || [];
  const stockRows = stockQuery.data || [];
  const history = historyQuery.data || [];

  const selectedItem = items.find((i) => i.id === itemId);
  const currentStock = Number(stockRows.find((r) => r.item_id === itemId)?.quantity_on_hand ?? 0);
  const qtyNum = Number(qty || 0);
  const newStock = adjustmentType === 'addition' ? currentStock + qtyNum : currentStock - qtyNum;

  const createMutation = useMutation({
    mutationFn: stockAdjustmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['stock-hub', 'branch'] });
      setConfirmVisible(false);
      setItemId(null); setQty(''); setRemarks(''); setReason('damage'); setAdjustmentType('addition');
      Alert.alert('Saved', 'Stock adjustment recorded and inventory updated.');
    },
    onError: (e) => { setConfirmVisible(false); setError(friendlyErrorMessage(e)); },
  });

  const openConfirm = () => {
    setError('');
    if (!itemId) return setError('Select an item.');
    if (!qty || qtyNum <= 0) return setError('Enter a valid quantity.');
    if (adjustmentType === 'deduction' && qtyNum > currentStock) {
      return setError(`Cannot deduct ${qtyNum} — only ${currentStock} in stock.`);
    }
    setConfirmVisible(true);
  };

  const submit = () => {
    createMutation.mutate({ item_id: itemId, adjustment_type: adjustmentType, qty: qtyNum, reason, remarks: remarks || null });
  };

  return (
    <>
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12 }}
      data={[{ type: 'form' }, { type: 'historyHeader' }, ...history.map((h) => ({ type: 'history', ...h }))]}
      keyExtractor={(r, idx) => `${r.type}-${r.id || idx}`}
      renderItem={({ item }) => {
        if (item.type === 'form') {
          if (!canAdjust) return <Text style={styles.empty}>You don't have permission to adjust stock.</Text>;
          return (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>New Stock Adjustment</Text>
              <SelectField label="Item" value={itemId} options={items} labelKey="item_name" valueKey="id" onChange={setItemId} placeholder="Select item" required />
              {itemId != null && <Text style={styles.currentStockText}>Current Stock: {currentStock} {selectedItem?.base_unit_code || ''}</Text>}

              <Text style={formStyles.label}>Adjustment Type</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity style={[styles.typeBtn, adjustmentType === 'addition' && styles.typeBtnActive]} onPress={() => setAdjustmentType('addition')}>
                  <Text style={adjustmentType === 'addition' ? styles.typeTextActive : styles.typeText}>Increase (+)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, adjustmentType === 'deduction' && styles.typeBtnActive]} onPress={() => setAdjustmentType('deduction')}>
                  <Text style={adjustmentType === 'deduction' ? styles.typeTextActive : styles.typeText}>Decrease (-)</Text>
                </TouchableOpacity>
              </View>

              <Text style={formStyles.label}>Quantity</Text>
              <TextInput keyboardType="numeric" value={qty} onChangeText={setQty} style={formStyles.input} />

              <SelectField label="Reason" value={reason} options={ADJUSTMENT_REASONS} onChange={setReason} required />

              <Text style={formStyles.label}>Notes (optional)</Text>
              <TextInput value={remarks} onChangeText={setRemarks} style={[formStyles.input, { height: 70 }]} multiline />

              {error ? <Text style={formStyles.error}>{error}</Text> : null}
              <TouchableOpacity style={[formStyles.primaryBtn, { marginTop: 10 }]} onPress={openConfirm}>
                <Text style={formStyles.primaryBtnText}>Save Adjustment</Text>
              </TouchableOpacity>
            </View>
          );
        }
        if (item.type === 'historyHeader') return <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Adjustment History</Text>;
        return (
          <TouchableOpacity style={styles.card} onPress={() => setHistoryView(item)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.name}>{item.item_name}</Text>
              <Text style={item.adjustment_type === 'addition' ? styles.qty : styles.qtyLow}>
                {item.adjustment_type === 'addition' ? '+' : '-'}{item.qty}
              </Text>
            </View>
            <Text style={styles.code}>{item.reason} · {item.created_by_name} · {item.created_at}</Text>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={null}
    />
    <ConfirmAndDetailModals
      confirmVisible={confirmVisible}
      setConfirmVisible={setConfirmVisible}
      currentStock={currentStock}
      qtyNum={qtyNum}
      newStock={newStock}
      adjustmentType={adjustmentType}
      submit={submit}
      saving={createMutation.isPending}
      historyView={historyView}
      setHistoryView={setHistoryView}
    />
    </>
  );
}

function ConfirmAndDetailModals({ confirmVisible, setConfirmVisible, currentStock, qtyNum, newStock, adjustmentType, submit, saving, historyView, setHistoryView }) {
  return (
    <>
      {confirmVisible && (
        <FormModal
          visible
          title="Confirm Stock Adjustment"
          onClose={() => setConfirmVisible(false)}
          footer={
            <>
              <TouchableOpacity style={formStyles.secondaryBtn} onPress={() => setConfirmVisible(false)}><Text style={formStyles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[formStyles.primaryBtn, saving && formStyles.disabled]} onPress={submit} disabled={saving}>
                <Text style={formStyles.primaryBtnText}>{saving ? 'Saving…' : 'Confirm & Save'}</Text>
              </TouchableOpacity>
            </>
          }
        >
          <View style={styles.detailBox}>
            <DetailRow label="Current Stock" value={String(currentStock)} />
            <DetailRow label="Adjustment" value={`${adjustmentType === 'addition' ? '+' : '-'}${qtyNum}`} />
            <DetailRow label="New Stock" value={String(newStock)} />
          </View>
        </FormModal>
      )}
      {historyView && (
        <FormModal
          visible
          title="Adjustment Detail"
          onClose={() => setHistoryView(null)}
          footer={<TouchableOpacity style={formStyles.primaryBtn} onPress={() => setHistoryView(null)}><Text style={formStyles.primaryBtnText}>Close</Text></TouchableOpacity>}
        >
          <View style={styles.detailBox}>
            <DetailRow label="Item" value={historyView.item_name} />
            <DetailRow label="Type" value={historyView.adjustment_type} />
            <DetailRow label="Quantity" value={String(historyView.qty)} />
            <DetailRow label="Reason" value={historyView.reason} />
            <DetailRow label="Notes" value={historyView.remarks || '-'} />
            <DetailRow label="Created By" value={historyView.created_by_name || '-'} />
            <DetailRow label="Date" value={historyView.created_at} />
          </View>
        </FormModal>
      )}
    </>
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
  search: { margin: 12, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 10 },
  selectionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginBottom: 6, gap: 8 },
  selectionText: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' },
  linkBtn: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  selectedExportBtn: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  selectedExportText: { color: colors.ink, fontWeight: '700', fontSize: 11 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.borderSoft },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.borderSoft, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxFill: { width: 12, height: 12, borderRadius: 2, backgroundColor: colors.gold },
  name: { color: colors.ink, fontWeight: '600' },
  code: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  qty: { fontWeight: '700', color: colors.success },
  qtyLow: { color: colors.danger, fontWeight: '700' },
  detailBox: { backgroundColor: colors.page, borderRadius: 10, padding: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  detailLabel: { fontWeight: '600', color: colors.inkMuted, fontSize: 13 },
  detailVal: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  sectionTitle: { fontWeight: '700', color: colors.ink, marginBottom: 10, fontSize: 14 },
  currentStockText: { color: colors.inkMuted, fontSize: 12, marginBottom: 10, marginTop: -4 },
  typeToggle: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.page },
  typeBtnActive: { backgroundColor: colors.gold },
  typeText: { fontSize: 12, color: colors.inkMuted, fontWeight: '600' },
  typeTextActive: { fontSize: 12, color: '#fff', fontWeight: '700' },
});
