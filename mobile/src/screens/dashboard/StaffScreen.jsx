import { FlatList, Text, View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { staffApi } from '../../api/admin';
import { colors } from '../../theme/colors';

export function StaffScreen() {
  const listQuery = useQuery({ queryKey: ['users'], queryFn: staffApi.list });
  return (
    <View style={styles.screen}>
      <FlatList
        data={listQuery.data || []}
        keyExtractor={(r) => String(r.id)}
        refreshing={listQuery.isFetching}
        onRefresh={listQuery.refetch}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.role_name || item.role} · {item.status}</Text>
            <Text style={styles.meta}>{item.email}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSoft },
  name: { fontWeight: '700', color: colors.ink },
  meta: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
});
