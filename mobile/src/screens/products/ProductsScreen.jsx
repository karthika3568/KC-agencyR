import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../../api/catalog';
import { friendlyErrorMessage } from '../../api/client';
import { ProductImage } from '../../components/ProductImage';
import { ItemFormModal } from './ItemFormModal';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

export function ProductsScreen() {
  const canManage = usePermission('catalog.manage_items');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(undefined); // undefined closed, null create, obj edit
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const removeMutation = useMutation({
    mutationFn: itemsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
    onError: (e) => Alert.alert('Error', friendlyErrorMessage(e)),
  });

  const items = itemsQuery.data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.item_name.toLowerCase().includes(q) || (i.item_code || '').toLowerCase().includes(q));
  }, [items, search]);

  const openEdit = async (item) => setModal(await itemsApi.get(item.id));

  const confirmDelete = (item) => {
    Alert.alert('Delete item?', item.item_name, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate(item.id) },
    ]);
  };

  return (
    <View style={styles.screen}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search products…" style={styles.search} />
      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        refreshing={itemsQuery.isFetching}
        onRefresh={itemsQuery.refetch}
        contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <ProductImage path={item.image} size={48} />
            <TouchableOpacity style={{ marginLeft: 12, flex: 1 }} onPress={() => canManage && openEdit(item)}>
              <Text style={styles.name}>{item.item_name}</Text>
              <Text style={styles.meta}>{item.item_code} · {item.category_name || 'Uncategorized'}</Text>
            </TouchableOpacity>
            <Text style={styles.price}>Rs. {item.retail_price}</Text>
            {canManage && (
              <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={() => setModal(null)}>
          <Text style={styles.fabText}>+ Add Item</Text>
        </TouchableOpacity>
      )}
      {modal !== undefined && <ItemFormModal item={modal} onClose={() => setModal(undefined)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  search: { margin: 12, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSoft },
  name: { fontWeight: '600', color: colors.ink },
  meta: { fontSize: 11, color: colors.inkMuted },
  price: { fontWeight: '700', color: colors.ink },
  deleteBtn: { marginLeft: 8, padding: 6 },
  deleteText: { color: colors.danger },
  fab: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: colors.navbar, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  fabText: { color: colors.gold, fontWeight: '700' },
});
