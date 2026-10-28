import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';
import { NAV_ITEMS } from '../../navigation/navItems';
import { Icon } from '../../components/Icon';

export function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const summaryQuery = useQuery({ queryKey: ['dashboard-summary'], queryFn: dashboardApi.summary });

  const refreshing = summaryQuery.isFetching;
  const onRefresh = () => {
    summaryQuery.refetch();
  };

  const handleLogout = () => {
    Alert.alert('Logout?', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // Filter NAV_ITEMS to show as dashboard cards (excluding Dashboard itself)
  const navCards = NAV_ITEMS.filter(
    (item) => item.key !== 'Dashboard' && (!item.perm || user?.permissions?.includes(item.perm))
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Top Banner Header with KC Agency Title */}
      <View style={styles.topBanner}>
        <View style={{ flex: 1 }}>
          <View style={styles.logoRow}>
            <Text style={styles.brandTitle}>KC </Text>
            <Text style={styles.brandTitleGold}>Agency</Text>
          </View>
          <Text style={styles.brandSub}>DISTRIBUTOR BILLING & INVENTORY</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={styles.userBadge}>
            <Text style={styles.userNameText}>👤 {user?.name || 'User'}</Text>
          </View>
          <Text style={styles.branchText}>📍 Branch: {user?.branch || 'MAIN'}</Text>
        </View>
      </View>

      {/* 2-Column Grid of Navigation Module Cards matching the design */}
      <Text style={styles.sectionHeader}>Quick Navigation</Text>
      <View style={styles.cardsGrid}>
        {navCards.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.navCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.key)}
          >
            <View style={styles.iconCircle}>
              <Icon name={item.icon} size={26} color="#1e3a8a" />
            </View>
            <Text style={styles.navCardLabel} numberOfLines={2}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        {/* Logout Card at the end */}
        <TouchableOpacity
          style={[styles.navCard, styles.logoutCard]}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <View style={[styles.iconCircle, styles.logoutIconCircle]}>
            <Icon name="Logout" size={26} color="#ef4444" />
          </View>
          <Text style={[styles.navCardLabel, styles.logoutCardLabel]} numberOfLines={1}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 14, paddingBottom: 140 },
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  brandTitle: { fontSize: 22, fontWeight: '900', color: '#1e3a8a' },
  brandTitleGold: { fontSize: 22, fontWeight: '900', color: '#d97706' },
  brandSub: { fontSize: 9, color: '#64748b', fontWeight: '700', marginTop: 1, letterSpacing: 0.5 },
  userBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  userNameText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  branchText: { fontSize: 11, fontWeight: '700', color: '#dc2626', marginTop: 4 },
  sectionHeader: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  navCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  logoutCard: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoutIconCircle: {
    backgroundColor: '#fee2e2',
  },
  navCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 18,
  },
  logoutCardLabel: {
    color: '#dc2626',
    fontWeight: '800',
  },
});

