import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { categoriesApi, brandsApi, stockUnitsApi, taxCodesApi } from '../../api/catalog';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { EntityListScreen } from '../../components/EntityListScreen';
import { ProductsScreen } from './ProductsScreen';
import { usePermission } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

export function CatalogScreen() {
  const canManage = usePermission('catalog.manage_items');
  const [tab, setTab] = useState('items');

  return (
    <View style={styles.screen}>
      <SegmentedTabs
        tabs={[
          { key: 'items', label: 'Items' },
          { key: 'categories', label: 'Categories' },
          { key: 'brands', label: 'Brands' },
          { key: 'units', label: 'Units' },
        ]}
        active={tab}
        onChange={setTab}
      />
      <View style={{ flex: 1, marginTop: 8 }}>
        {tab === 'items' && <ProductsScreen />}
        {tab === 'categories' && (
          <EntityListScreen
            queryKey="categories" api={categoriesApi} title="Category" canManage={canManage}
            fields={[{ name: 'name', label: 'Category name' }]}
            renderTitle={(r) => r.name}
          />
        )}
        {tab === 'brands' && (
          <EntityListScreen
            queryKey="brands" api={brandsApi} title="Brand" canManage={canManage}
            fields={[{ name: 'name', label: 'Brand name' }]}
            renderTitle={(r) => r.name}
          />
        )}
        {tab === 'units' && (
          <EntityListScreen
            queryKey="stock-units" api={stockUnitsApi} title="Unit" canManage={canManage}
            fields={[{ name: 'name', label: 'Unit name' }, { name: 'short_code', label: 'Short code' }]}
            renderTitle={(r) => `${r.name} (${r.short_code})`}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
});
