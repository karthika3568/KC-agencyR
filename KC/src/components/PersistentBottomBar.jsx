import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef, navigate, openDrawer } from '../navigation/navigationRef';
import { useAuth } from '../hooks/useAuth';
import { Icon } from './Icon';

export function PersistentBottomBar() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeRoute, setActiveRoute] = useState('Dashboard');

  useEffect(() => {
    const syncRoute = () => {
      if (navigationRef.isReady()) {
        const route = navigationRef.getCurrentRoute();
        if (route?.name) {
          setActiveRoute(route.name);
        }
      }
    };

    syncRoute();

    const unsubscribe = navigationRef.addListener('state', () => {
      syncRoute();
    });

    return unsubscribe;
  }, []);

  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || !user?.role;

  const allTabs = [
    { key: 'Menu', label: 'Menu', icon: 'Menu', perm: null, action: openDrawer },
    { key: 'Dashboard', label: 'Dashboard', icon: 'Dashboard', perm: 'dashboard.view_financial_summary', action: () => navigate('Dashboard') },
    { key: 'Billing', label: 'Sale / POS', icon: 'Billing', perm: 'pos.access', action: () => navigate('Billing') },
    { key: 'Catalog', label: 'Items', icon: 'Catalog', perm: 'catalog.manage_items', action: () => navigate('Catalog') },
    { key: 'Orders', label: 'Orders', icon: 'Orders', perm: 'orders.create_prebooking', action: () => navigate('Orders') },
  ];

  const tabs = allTabs.filter((tab) => !tab.perm || isAdmin || userPermissions.includes(tab.perm));

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 6);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPadding }]}>
      {tabs.map((tab) => {
        const isActive = tab.key !== 'Menu' && activeRoute === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={tab.action}
          >
            <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
              <Icon name={tab.icon} size={20} color={isActive ? '#fbbf24' : '#94a3b8'} />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    padding: 4,
    borderRadius: 8,
  },
  iconBoxActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  labelActive: {
    color: '#fbbf24',
    fontWeight: '800',
  },
});
