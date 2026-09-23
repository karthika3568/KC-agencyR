import { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { stockHubApi } from '../../api/purchasing';
import { colors } from '../../theme/colors';

export function InventoryScreen() {
  const [search, setSearch] = useState('');
  const stockQuery = useQuery({ queryKey: ['stock-hub', 'branch'], queryFn: () => stockHubApi.list({ owner_type: 'branch' }) });
  const rows = stockQuery.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.item_name || '').toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <View style={styles.screen}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search stock…" style={styles.search} />
      <FlatList
        data={filtered}
        keyExtractor={(r, idx) => `${r.item_id}-${idx}`}
        refreshing={stockQuery.isFetching}
        onRefresh={stockQuery.refetch}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>No stock data.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{item.item_name}</Text>
            <Text style={[styles.qty, Number(item.quantity_on_hand) <= 0 && styles.qtyLow]}>{item.quantity_on_hand}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  search: { margin: 12, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 10 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.borderSoft },
  name: { flex: 1, color: colors.ink, fontWeight: '600' },
  qty: { fontWeight: '700', color: colors.success },
  qtyLow: { color: colors.danger },
});
