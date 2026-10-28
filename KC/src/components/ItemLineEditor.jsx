import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ProductImage } from './ProductImage';
import { SelectField } from './SelectField';
import { colors } from '../theme/colors';

/**
 * Multi-item add/qty/rate editor shared by Customer Pre-Booking and
 * Supplier Purchase Request forms — mirrors the web's ItemLineEditor.
 */
export function ItemLineEditor({ lines, setLines, items, rateLabel = 'Rate' }) {
  const addLine = () => setLines((prev) => [...prev, { key: `${Date.now()}`, item_id: null, qty: '1', rate: '' }]);
  const updateLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));
  const itemById = (id) => items.find((i) => i.id === id);

  return (
    <View>
      {lines.map((line) => {
        const item = itemById(line.item_id);
        const lineTotal = Number(line.qty || 0) * Number(line.rate || 0);
        return (
          <View key={line.key} style={styles.row}>
            <View style={styles.rowHeader}>
              <ProductImage path={item?.image} size={36} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <SelectField
                  value={line.item_id}
                  options={items}
                  labelKey="item_name"
                  valueKey="id"
                  placeholder="Select item"
                  onChange={(id) => {
                    const picked = itemById(id);
                    updateLine(line.key, { item_id: id, rate: picked ? String(picked.retail_price) : line.rate });
                  }}
                />
              </View>
              <TouchableOpacity onPress={() => removeLine(line.key)} style={styles.removeBtn}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fieldsRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.smallLabel}>Qty</Text>
                <TextInput keyboardType="numeric" value={String(line.qty)} onChangeText={(v) => updateLine(line.key, { qty: v })} style={styles.smallInput} />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.smallLabel}>{rateLabel}</Text>
                <TextInput keyboardType="numeric" value={String(line.rate)} onChangeText={(v) => updateLine(line.key, { rate: v })} style={styles.smallInput} />
              </View>
              <View style={styles.totalBox}>
                <Text style={styles.smallLabel}>Amount</Text>
                <Text style={styles.totalText}>Rs. {lineTotal.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        );
      })}
      <TouchableOpacity onPress={addLine} style={styles.addBtn}>
        <Text style={styles.addText}>+ Add item</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, padding: 10, marginBottom: 10, backgroundColor: colors.card },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  removeBtn: { marginLeft: 8, padding: 6 },
  removeText: { color: colors.danger, fontSize: 14 },
  fieldsRow: { flexDirection: 'row', gap: 8 },
  fieldHalf: { flex: 1 },
  smallLabel: { fontSize: 10, color: colors.inkMuted, marginBottom: 4, fontWeight: '600' },
  smallInput: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 13, backgroundColor: colors.page },
  totalBox: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end' },
  totalText: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  addBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  addText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
});
