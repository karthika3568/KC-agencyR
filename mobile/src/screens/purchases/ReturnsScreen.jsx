import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { salesReturnsApi, purchaseReturnsApi } from '../../api/postsale';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { colors } from '../../theme/colors';

function SalesReturnsTab() {
  const listQuery = useQuery({ queryKey: ['sales-returns'], queryFn: salesReturnsApi.list });
  return (
    <FlatList
      data={listQuery.data || []}
      keyExtractor={(r) => String(r.id)}
      refreshing={listQuery.isFetching}
      onRefresh={listQuery.refetch}
      contentContainerStyle={{ padding: 12 }}
      ListEmptyComponent={<Text style={styles.empty}>No sales returns yet.</Text>}
      renderItem={({ item: r }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{r.return_no}</Text>
          <Text style={styles.cardMeta}>{r.customer_name || 'Walk-in'} · {r.status}</Text>
          <Text style={styles.cardTotal}>Rs. {r.total_amount}</Text>
        </View>
      )}
    />
  );
}

function PurchaseReturnsTab() {
  const listQuery = useQuery({ queryKey: ['purchase-returns'], queryFn: purchaseReturnsApi.list });
  return (
    <FlatList
      data={listQuery.data || []}
      keyExtractor={(r) => String(r.id)}
      refreshing={listQuery.isFetching}
      onRefresh={listQuery.refetch}
      contentContainerStyle={{ padding: 12 }}
      ListEmptyComponent={<Text style={styles.empty}>No purchase returns yet.</Text>}
      renderItem={({ item: r }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{r.return_no}</Text>
          <Text style={styles.cardMeta}>{r.supplier_name}</Text>
          <Text style={styles.cardTotal}>Rs. {r.total_amount}</Text>
        </View>
      )}
    />
  );
}

export function ReturnsScreen() {
  const [tab, setTab] = useState('sales');
  return (
    <View style={styles.screen}>
      <SegmentedTabs tabs={[{ key: 'sales', label: 'Sales Returns' }, { key: 'purchase', label: 'Purchase Returns' }]} active={tab} onChange={setTab} />
      <View style={{ flex: 1, marginTop: 8 }}>
        {tab === 'sales' ? <SalesReturnsTab /> : <PurchaseReturnsTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft },
  cardTitle: { fontWeight: '700', color: colors.ink },
  cardMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  cardTotal: { fontWeight: '700', color: colors.ink, marginTop: 6 },
});
