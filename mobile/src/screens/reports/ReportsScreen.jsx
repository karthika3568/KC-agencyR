import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/admin';
import { colors } from '../../theme/colors';

const REPORTS = [
  { key: 'credit_outstanding', label: 'Credit Outstanding', fetch: reportsApi.creditOutstanding },
  { key: 'low_stock', label: 'Low Stock', fetch: reportsApi.lowStock },
  { key: 'gst_register', label: 'GST Register (this month)', fetch: () => reportsApi.gstRegister({}) },
  { key: 'non_gst_register', label: 'Non-GST Register (this month)', fetch: () => reportsApi.nonGstRegister({}) },
  { key: 'purchase_register', label: 'Purchase Register (this month)', fetch: () => reportsApi.purchaseRegister({}) },
  { key: 'item_wise_sales', label: 'Item-wise Sales (this month)', fetch: () => reportsApi.itemWiseSales({}) },
  { key: 'expense_income', label: 'Expense vs Income (this month)', fetch: () => reportsApi.expenseIncome({}) },
  { key: 'profit', label: 'Profit (this month)', fetch: () => reportsApi.profit({}) },
];

function ReportDetail({ report, onBack }) {
  const query = useQuery({ queryKey: ['report', report.key], queryFn: report.fetch });
  const rows = Array.isArray(query.data) ? query.data : query.data ? [query.data] : [];
  const columns = rows[0] ? Object.keys(rows[0]).slice(0, 4) : [];

  return (
    <View style={styles.screen}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.detailTitle}>{report.label}</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(_, idx) => String(idx)}
        refreshing={query.isFetching}
        onRefresh={query.refetch}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>No data for this report yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {columns.map((c) => (
              <View key={c} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{c.replace(/_/g, ' ')}</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>{String(item[c])}</Text>
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

export function ReportsScreen() {
  const [active, setActive] = useState(null);
  if (active) return <ReportDetail report={active} onBack={() => setActive(null)} />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={REPORTS}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.menuRow} onPress={() => setActive(item)}>
            <Text style={styles.menuText}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSoft },
  menuText: { color: colors.ink, fontWeight: '600' },
  chevron: { color: colors.inkMuted, fontSize: 18 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  back: { color: colors.gold, fontWeight: '700', marginRight: 12 },
  detailTitle: { fontWeight: '700', color: colors.ink, flex: 1 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSoft },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  fieldLabel: { color: colors.inkMuted, fontSize: 11, textTransform: 'capitalize' },
  fieldValue: { color: colors.ink, fontSize: 12, fontWeight: '600', flexShrink: 1, marginLeft: 8 },
});
