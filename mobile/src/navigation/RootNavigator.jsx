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
import { NAV_ITEMS } from './navItems';
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

function MainDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.navbar },
        headerTintColor: colors.inkOnNavy,
        headerTitleStyle: { fontWeight: '700' },
        drawerType: 'front',
      }}
    >
      {NAV_ITEMS.map((item) => (
        <Drawer.Screen key={item.key} name={item.key} component={SCREEN_COMPONENTS[item.key]} options={{ title: item.label }} />
      ))}
    </Drawer.Navigator>
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
    <NavigationContainer>
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
