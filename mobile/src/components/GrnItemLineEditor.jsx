import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ProductImage } from './ProductImage';
import { SelectField } from './SelectField';
import { colors } from '../theme/colors';

/**
 * GRN-specific line editor — mirrors the web's PurchaseItemLineEditor
 * (frontend/src/pages/Purchasing.jsx): MRP, Net Purchase Rate, ₹/%
 * discount, and Free Quantity, matching what PurchaseModel::priceLine
 * already accepts on the backend. Deliberately separate from the shared
 * ItemLineEditor (Pre-Booking/Purchase Request) — the web app itself uses
 * two different editors for these flows, so mobile does too.
 */
export function GrnItemLineEditor({ lines, setLines, items }) {
  const addLine = () => setLines((prev) => [
    ...prev,
    { key: `${Date.now()}`, item_id: null, qty: '1', free_qty: '0', mrp: '', rate: '', discount_mode: 'percent', discount_percent: '0', discount_amount: '' },
  ]);
  const updateLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));
  const itemById = (id) => items.find((i) => i.id === id);

  return (
    <View>
      {lines.map((line) => {
        const item = itemById(line.item_id);
        const gross = Number(line.qty || 0) * Number(line.rate || 0);
        const disc = line.discount_mode === 'amount' ? Number(line.discount_amount || 0) : gross * (Number(line.discount_percent || 0) / 100);
        const lineTotal = Math.max(gross - disc, 0);
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
                    updateLine(line.key, {
                      item_id: id,
                      mrp: picked ? String(picked.mrp ?? '') : line.mrp,
                      rate: picked ? String(picked.net_purrate ?? picked.purchase_price ?? '') : line.rate,
                    });
                  }}
                />
              </View>
              <TouchableOpacity onPress={() => removeLine(line.key)} style={styles.removeBtn}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldsRow}>
              <View style={styles.fieldQuarter}>
                <Text style={styles.smallLabel}>Qty</Text>
                <TextInput keyboardType="numeric" value={String(line.qty)} onChangeText={(v) => updateLine(line.key, { qty: v })} style={styles.smallInput} />
              </View>
              <View style={styles.fieldQuarter}>
                <Text style={styles.smallLabel}>Free Qty</Text>
                <TextInput keyboardType="numeric" value={String(line.free_qty)} onChangeText={(v) => updateLine(line.key, { free_qty: v })} style={styles.smallInput} />
              </View>
              <View style={styles.fieldQuarter}>
                <Text style={styles.smallLabel}>MRP</Text>
                <TextInput keyboardType="numeric" value={String(line.mrp)} onChangeText={(v) => updateLine(line.key, { mrp: v })} style={styles.smallInput} />
              </View>
              <View style={styles.fieldQuarter}>
                <Text style={styles.smallLabel}>Net Rate</Text>
                <TextInput keyboardType="numeric" value={String(line.rate)} onChangeText={(v) => updateLine(line.key, { rate: v })} style={styles.smallInput} />
              </View>
            </View>

            <View style={styles.discountRow}>
              <View style={styles.discountToggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, line.discount_mode !== 'amount' && styles.toggleBtnActive]}
                  onPress={() => updateLine(line.key, { discount_mode: 'percent' })}
                >
                  <Text style={line.discount_mode !== 'amount' ? styles.toggleTextActive : styles.toggleText}>%</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, line.discount_mode === 'amount' && styles.toggleBtnActive]}
                  onPress={() => updateLine(line.key, { discount_mode: 'amount' })}
                >
                  <Text style={line.discount_mode === 'amount' ? styles.toggleTextActive : styles.toggleText}>Rs.</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                keyboardType="numeric"
                placeholder="Discount"
                value={line.discount_mode === 'amount' ? String(line.discount_amount) : String(line.discount_percent)}
                onChangeText={(v) => updateLine(line.key, line.discount_mode === 'amount' ? { discount_amount: v } : { discount_percent: v })}
                style={styles.discountInput}
              />
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
  fieldsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  fieldQuarter: { flex: 1 },
  smallLabel: { fontSize: 10, color: colors.inkMuted, marginBottom: 4, fontWeight: '600' },
  smallInput: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, backgroundColor: colors.page },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountToggle: { flexDirection: 'row', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft },
  toggleBtn: { paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.page },
  toggleBtnActive: { backgroundColor: colors.gold },
  toggleText: { fontSize: 11, color: colors.inkMuted, fontWeight: '600' },
  toggleTextActive: { fontSize: 11, color: '#fff', fontWeight: '700' },
  discountInput: { flex: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, backgroundColor: colors.page },
  totalBox: { alignItems: 'flex-end' },
  totalText: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  addBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  addText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
});
