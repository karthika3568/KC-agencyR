import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { itemsApi } from '../../api/catalog';
import { customersApi } from '../../api/parties';
import { invoicesApi } from '../../api/invoices';
import { friendlyErrorMessage } from '../../api/client';
import { ProductImage } from '../../components/ProductImage';
import { CartSheet } from './CartSheet';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { colors } from '../../theme/colors';

function newLine(item) {
  return { key: `${item.id}-${Date.now()}`, item, qty: 1, free_qty: 0, discount_percent: 0, unit_id: item.base_unit_id, rate: item.retail_price };
}

export function POSScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [cartVisible, setCartVisible] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scanMatches, setScanMatches] = useState(null);
  const [barcodeVisible, setBarcodeVisible] = useState(false);

  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });

  const items = itemsQuery.data || [];
  const customers = customersQuery.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.item_name.toLowerCase().includes(q) || (i.item_code || '').toLowerCase().includes(q) || (i.barcode || '') === q);
  }, [items, search]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) return prev.map((l) => (l.key === existing.key ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, newLine(item)];
    });
  };

  const handleBarcodeRead = (code) => {
    setBarcodeVisible(false);
    if (!code) return;
    // Same match rule as web's Enter-to-add: exact barcode or item_code.
    const match = items.find((i) => (i.barcode || '').toLowerCase() === code.toLowerCase() || (i.item_code || '').toLowerCase() === code.toLowerCase());
    if (match) {
      addToCart(match);
    } else {
      Alert.alert('No match', `No product found for barcode "${code}".`);
    }
  };

  const handleScan = async (fromCamera) => {
    const result = await (fromCamera ? launchCamera({ mediaType: 'photo', quality: 0.7 }) : launchImageLibrary({ mediaType: 'photo', quality: 0.7 }));
    const asset = result.assets?.[0];
    if (!asset) return;
    try {
      const res = await itemsApi.imageSearch({ uri: asset.uri, type: asset.type || 'image/jpeg', name: asset.fileName || 'photo.jpg' });
      if (!res.engine_available) {
        Alert.alert('Photo search unavailable', res.message);
        return;
      }
      if (res.matches.length === 0) {
        Alert.alert('No match found', 'No catalog items matched this photo. Try a clearer shot, or search manually.');
        return;
      }
      setScanMatches(res.matches);
    } catch (err) {
      Alert.alert('Error', friendlyErrorMessage(err));
    }
  };

  const completeSale = async (payments) => {
    setErrorMessage('');
    setCompleting(true);
    try {
      const held = await invoicesApi.create({
        bill_type: 'gst',
        customer_id: customerId,
        items: cart.map((l) => ({ item_id: l.item.id, qty: l.qty, free_qty: l.free_qty, unit_id: l.unit_id, discount_percent: l.discount_percent, rate: l.rate })),
      });
      const result = await invoicesApi.complete(held.id, payments);
      setCart([]);
      setCartVisible(false);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      Alert.alert('Sale completed', `Invoice ${result.invoice_no} created.`);
    } catch (err) {
      setErrorMessage(friendlyErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search product by name, code or barcode…"
          style={styles.searchInput}
        />
        <TouchableOpacity style={styles.cameraBtn} onPress={() => setBarcodeVisible(true)}>
          <Text style={styles.cameraIcon}>▤</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cameraBtn} onPress={() => handleScan(true)}>
          <Text style={styles.cameraIcon}>📷</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.customerRow}>
        <Text style={styles.customerLabel}>Customer:</Text>
        <FlatList
          horizontal
          data={[{ id: null, ledger_name: 'Walk-in' }, ...customers]}
          keyExtractor={(c) => String(c.id)}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              style={[styles.customerChip, customerId === c.id && styles.customerChipActive]}
              onPress={() => setCustomerId(c.id)}
            >
              <Text style={customerId === c.id ? styles.customerChipTextActive : styles.customerChipText}>{c.ledger_name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
            <ProductImage path={item.image} size={80} style={{ width: '100%', height: 90, borderRadius: 10 }} />
            <Text style={styles.productName} numberOfLines={1}>{item.item_name}</Text>
            <Text style={styles.productPrice}>Rs. {item.retail_price}</Text>
            <Text style={styles.productCode}>{item.item_code}</Text>
          </TouchableOpacity>
        )}
      />

      {cart.length > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => setCartVisible(true)}>
          <Text style={styles.cartBarText}>{cart.length} item(s) in cart</Text>
          <Text style={styles.cartBarText}>View Cart →</Text>
        </TouchableOpacity>
      )}

      <BarcodeScannerModal visible={barcodeVisible} onScan={handleBarcodeRead} onClose={() => setBarcodeVisible(false)} />

      <CartSheet
        visible={cartVisible}
        cart={cart}
        setCart={setCart}
        hasCustomer={!!customerId}
        onClose={() => setCartVisible(false)}
        onComplete={completeSale}
        completing={completing}
        errorMessage={errorMessage}
      />

      {scanMatches && (
        <View style={styles.scanOverlay}>
          <View style={styles.scanCard}>
            <Text style={styles.scanTitle}>Matching products</Text>
            <FlatList
              data={scanMatches}
              keyExtractor={(i) => String(i.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.scanRow} onPress={() => { addToCart(item); setScanMatches(null); }}>
                  <ProductImage path={item.image} size={40} />
                  <Text style={{ marginLeft: 10, flex: 1 }}>{item.item_name}</Text>
                  <Text style={{ color: colors.gold, fontWeight: '700' }}>Add</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.scanClose} onPress={() => setScanMatches(null)}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: { flex: 1, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 12, paddingVertical: 10 },
  cameraBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  cameraIcon: { fontSize: 18 },
  customerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8, gap: 8 },
  customerLabel: { fontSize: 12, color: colors.inkMuted, fontWeight: '600' },
  customerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, marginRight: 6 },
  customerChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  customerChipText: { fontSize: 12, color: colors.inkMuted },
  customerChipTextActive: { fontSize: 12, color: '#fff', fontWeight: '700' },
  productCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSoft },
  productName: { fontSize: 13, fontWeight: '600', color: colors.ink, marginTop: 6 },
  productPrice: { fontSize: 14, fontWeight: '700', color: colors.ink },
  productCode: { fontSize: 11, color: colors.inkMuted },
  cartBar: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: colors.navbar, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  cartBarText: { color: colors.gold, fontWeight: '700' },
  scanOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  scanCard: { width: '85%', maxHeight: '60%', backgroundColor: colors.card, borderRadius: 12, padding: 16 },
  scanTitle: { fontWeight: '700', marginBottom: 8 },
  scanRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  scanClose: { marginTop: 12, alignItems: 'center', padding: 10 },
});
