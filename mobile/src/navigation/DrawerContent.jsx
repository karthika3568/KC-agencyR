import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';
import { NAV_ITEMS } from './navItems';

export function DrawerContent(props) {
  const { user, logout } = useAuth();
  const { navigation, state } = props;
  const activeRoute = state.routeNames[state.index];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
      <View style={styles.header}>
        <Text style={styles.brand}>AJ Agency</Text>
        <Text style={styles.subtitle}>DISTRIBUTOR BILLING &amp; INVENTORY</Text>
        <View style={styles.userRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name || '?').slice(0, 2).toUpperCase()}</Text></View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userRole}>{user?.role}</Text>
          </View>
        </View>
      </View>

      {NAV_ITEMS.filter((item) => !item.perm || user?.permissions?.includes(item.perm)).map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.item, activeRoute === item.key && styles.itemActive]}
          onPress={() => navigation.navigate(item.key)}
        >
          <Text style={styles.itemIcon}>{item.icon}</Text>
          <Text style={[styles.itemLabel, activeRoute === item.key && styles.itemLabelActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.logoutItem}
        onPress={() => Alert.alert('Logout?', '', [{ text: 'Cancel' }, { text: 'Logout', style: 'destructive', onPress: logout }])}
      >
        <Text style={styles.itemIcon}>⎋</Text>
        <Text style={styles.logoutLabel}>Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.navbar, padding: 20, paddingTop: 40, marginBottom: 8 },
  brand: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  subtitle: { color: 'rgba(245,241,230,0.5)', fontSize: 9, letterSpacing: 1, marginBottom: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.navbar, fontWeight: '700', fontSize: 12 },
  userName: { color: colors.inkOnNavy, fontWeight: '700', fontSize: 13 },
  userRole: { color: 'rgba(245,241,230,0.6)', fontSize: 11 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  itemActive: { backgroundColor: colors.highlight },
  itemIcon: { width: 24, fontSize: 15, color: colors.inkMuted },
  itemLabel: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  itemLabelActive: { color: colors.gold, fontWeight: '700' },
  logoutItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  logoutLabel: { fontSize: 14, color: colors.danger, fontWeight: '700' },
});
