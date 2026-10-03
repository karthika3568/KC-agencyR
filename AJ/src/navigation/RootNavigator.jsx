import { useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { POSScreen } from '../screens/pos/POSScreen';
import { InvoiceManagementScreen } from '../screens/pos/InvoiceManagementScreen';
import { CatalogScreen } from '../screens/products/CatalogScreen';
import { PartiesScreen } from '../screens/customers/PartiesScreen';
import { PurchasingScreen } from '../screens/purchases/PurchasingScreen';
import { InventoryScreen } from '../screens/purchases/InventoryScreen';
import { ReturnsScreen } from '../screens/purchases/ReturnsScreen';
import { ExpensesScreen } from '../screens/purchases/ExpensesScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { CollectionsScreen } from '../screens/collections/CollectionsScreen';
import { CashHandoverScreen } from '../screens/collections/CashHandoverScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { StaffScreen } from '../screens/dashboard/StaffScreen';
import { SettingsScreen } from '../screens/dashboard/SettingsScreen';
import { BranchesScreen } from '../screens/dashboard/BranchesScreen';
import { DrawerContent } from './DrawerContent';
import { PersistentBottomBar } from '../components/PersistentBottomBar';
import { NAV_ITEMS } from './navItems';
import { navigationRef } from './navigationRef';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const SCREEN_COMPONENTS = {
  Dashboard: DashboardScreen,
  Billing: POSScreen,
  Catalog: CatalogScreen,
  Parties: PartiesScreen,
  Purchasing: PurchasingScreen,
  Orders: OrdersScreen,
  Inventory: InventoryScreen,
  Returns: ReturnsScreen,
  Invoices: InvoiceManagementScreen,
  Collections: CollectionsScreen,
  CashHandover: CashHandoverScreen,
  Expenses: ExpensesScreen,
  Reports: ReportsScreen,
  Staff: StaffScreen,
  Settings: SettingsScreen,
  Branches: BranchesScreen,
};

const DRAWER_SCREEN_OPTIONS = {
  headerStyle: { backgroundColor: colors.navbar },
  headerTintColor: colors.inkOnNavy,
  headerTitleStyle: { fontWeight: '700' },
  drawerType: 'front',
  // The installed react-native-reanimated@4.7.0 / react-native-worklets@0.13.0
  // pairing throws "[Worklets] Tried to synchronously call a Remote Function.
  // Called 'callback' on the UI Runtime" the instant the drawer's swipe
  // gesture (Gesture.Pan(), wired up inside react-native-drawer-layout) is
  // dispatched via Reanimated's UI-runtime worklet path — reproducible with
  // zero app code involved, purely from opening/closing the drawer, on the
  // current stable release of every package involved (confirmed no newer
  // stable version exists for reanimated/worklets/gesture-handler/drawer-layout
  // at time of writing). runOnJS(true) is gesture-handler's own documented
  // escape hatch for exactly this situation: it keeps the swipe gesture and
  // its animation fully working, just dispatches its callbacks over the
  // normal JS-thread bridge instead of the Worklets UI runtime, which sidesteps
  // the crash without touching Reanimated/Worklets or any package version.
  configureGestureHandler: (gesture) => gesture.runOnJS(true),
  drawerStyle: {
    backgroundColor: '#090d16',
    width: '80%',
  },
  sceneContainerStyle: {
    backgroundColor: colors.page,
  },
};

function MainDrawer() {
  return (
    <View style={{ flex: 1, backgroundColor: '#090d16' }}>
      <Drawer.Navigator
        initialRouteName="Dashboard"
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={DRAWER_SCREEN_OPTIONS}
      >
        {NAV_ITEMS.map((item) => (
          <Drawer.Screen key={item.key} name={item.key} component={SCREEN_COMPONENTS[item.key]} options={{ title: item.label }} />
        ))}
      </Drawer.Navigator>
      <PersistentBottomBar />
    </View>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainDrawer} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.page },
});
