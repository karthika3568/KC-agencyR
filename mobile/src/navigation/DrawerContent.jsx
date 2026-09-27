import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useAuth } from '../hooks/useAuth';
import { NAV_ITEMS } from './navItems';
import { Icon } from '../components/Icon';

export function DrawerContent(props) {
  const { user, logout } = useAuth();
  const { navigation, state } = props;
  const activeRoute = (state && state.routeNames && state.routeNames[state.index]) ? state.routeNames[state.index] : 'Dashboard';

  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || !user?.role;

  const allowedNavItems = NAV_ITEMS.filter((item) => {
    if (!item.perm || isAdmin) return true;
    return userPermissions.includes(item.perm);
  });

  const handleNav = (screenKey) => {
    if (navigation) {
      navigation.navigate(screenKey);
    }
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0, flexGrow: 1 }}>
        <View style={styles.header}>
          <Text style={styles.brand}>AJ Agency</Text>
          <Text style={styles.subtitle}>DISTRIBUTOR BILLING &amp; INVENTORY</Text>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name || '?').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Staff'}</Text>
              <Text style={styles.userRole}>{user?.role || 'User'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuBox}>
          {allowedNavItems.map((item) => {
            const isActive = activeRoute === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.item, isActive && styles.itemActive]}
                activeOpacity={0.7}
                onPress={() => handleNav(item.key)}
              >
                <View style={styles.iconBox}>
                  <Icon name={item.icon} size={18} color={isActive ? '#fbbf24' : '#94a3b8'} />
                </View>
                <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.logoutItem}
          activeOpacity={0.7}
          onPress={() => Alert.alert('Logout?', 'Are you sure you want to log out?', [{ text: 'Cancel' }, { text: 'Logout', style: 'destructive', onPress: logout }])}
        >
          <View style={styles.iconBox}>
            <Icon name="close" size={18} color="#ef4444" />
          </View>
          <Text style={styles.logoutLabel}>Logout</Text>
        </TouchableOpacity>
      </DrawerContentScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 54,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brand: { color: '#fbbf24', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { color: '#64748b', fontSize: 9, letterSpacing: 1, fontWeight: '700', marginTop: 2, marginBottom: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fbbf24', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#0f172a', fontWeight: '900', fontSize: 13 },
  userName: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },
  userRole: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginTop: 1 },
  menuBox: { paddingTop: 8, paddingBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginHorizontal: 8, marginVertical: 2 },
  itemActive: { backgroundColor: '#1e293b' },
  iconBox: { width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemLabel: { fontSize: 14, color: '#cbd5e1', fontWeight: '600' },
  itemLabelActive: { color: '#fbbf24', fontWeight: '800' },
  logoutItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, marginTop: 'auto', marginBottom: 24, borderTopWidth: 1, borderTopColor: '#1e293b' },
  logoutLabel: { fontSize: 14, color: '#ef4444', fontWeight: '800' },
});
