import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/admin';
import { customerPrebookingsApi, purchaseRequestsApi } from '../../api/purchasing';
import { useAuth, usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

function StatCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const { user } = useAuth();
  const canViewSummary = usePermission('dashboard.view_financial_summary');
  const summaryQuery = useQuery({ queryKey: ['dashboard-summary'], queryFn: dashboardApi.summary, enabled: canViewSummary });
  const prebookingsQuery = useQuery({ queryKey: ['customer-prebookings'], queryFn: customerPrebookingsApi.list });
  const requestsQuery = useQuery({ queryKey: ['purchase-requests'], queryFn: purchaseRequestsApi.list });

  const prebookings = prebookingsQuery.data || [];
  const requests = requestsQuery.data || [];
  const s = summaryQuery.data || {};

  const countByStatus = (rows, status) => rows.filter((r) => r.status === status).length;

  const refreshing = summaryQuery.isFetching || prebookingsQuery.isFetching || requestsQuery.isFetching;
  const onRefresh = () => {
    summaryQuery.refetch();
    prebookingsQuery.refetch();
    requestsQuery.refetch();
  };

  return (
    <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.greeting}>Hi, {user?.name}</Text>
      <Text style={styles.role}>{user?.role}</Text>

      <View style={styles.grid}>
        {s.today_sales_revenue !== undefined && <StatCard label="Today's Sales" value={`Rs. ${s.today_sales_revenue}`} />}
        {s.customer_net_outstanding !== undefined && <StatCard label="Customer Outstanding" value={`Rs. ${s.customer_net_outstanding}`} />}
        <StatCard label="Pre-Bookings" value={prebookings.length} />
        <StatCard label="Pending Requests" value={countByStatus(requests, 'open')} />
        <StatCard label="Approved Requests" value={countByStatus(requests, 'approved')} />
        <StatCard label="Converted to GRN" value={countByStatus(requests, 'converted_to_grn')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page, padding: 16 },
  greeting: { fontSize: 20, fontWeight: '700', color: colors.ink },
  role: { fontSize: 13, color: colors.inkMuted, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  cardLabel: { fontSize: 11, color: colors.inkMuted, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase' },
  cardValue: { fontSize: 20, fontWeight: '700', color: colors.ink },
});
