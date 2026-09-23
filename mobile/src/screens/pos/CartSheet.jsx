import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { ProductImage } from '../../components/ProductImage';
import { computeCartTotals, priceLine } from '../../utils/pricing';
import { colors } from '../../theme/colors';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' }, { key: 'upi', label: 'UPI' }, { key: 'card', label: 'Card' },
  { key: 'credit', label: 'Credit' }, { key: 'other', label: 'Other' },
];

export function CartSheet({ visible, cart, setCart, hasCustomer, onClose, onComplete, completing, errorMessage }) {
  const [stage, setStage] = useState('cart'); // 'cart' | 'payment'
  const [splitMode, setSplitMode] = useState(false);
  const [payments, setPayments] = useState([{ payment_method: 'cash', amount: 0 }]);

  const pricedLines = cart.map((line) => ({ ...line, priced: priceLine(line.item, line) }));
  const totals = computeCartTotals(pricedLines.map((l) => l.priced));

  const openPayment = () => {
    setPayments([{ payment_method: 'cash', amount: totals.grandTotal }]);
    setSplitMode(false);
    setStage('payment');
  };

  const updateQty = (key, delta) => {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Number(l.qty) + delta) } : l)));
  };
  const removeLine = (key) => setCart((prev) => prev.filter((l) => l.key !== key));

  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.round((totals.grandTotal - paymentsTotal) * 100) / 100;
  const blockedNoCustomer = remaining > 0.009 && !hasCustomer;

  const toggleSplit = (next) => {
    setSplitMode(next);
    setPayments(next
      ? PAYMENT_METHODS.map((m) => ({ payment_method: m.key, amount: m.key === 'cash' ? totals.grandTotal : 0 }))
      : [{ payment_method: 'cash', amount: totals.grandTotal }]);
  };

  const setSplitAmount = (key, raw) => {
    let value = Number(raw) || 0;
    if (value < 0) value = 0;
    setPayments((prev) => {
      const othersTotal = prev.filter((p) => p.payment_method !== key).reduce((s, p) => s + Number(p.amount || 0), 0);
      const capped = Math.min(value, Math.max(0, totals.grandTotal - othersTotal));
      return prev.map((p) => (p.payment_method === key ? { ...p, amount: capped } : p));
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        {stage === 'cart' ? (
          <>
            <Text style={styles.title}>Current Bill</Text>
            <FlatList
              data={pricedLines}
              keyExtractor={(l) => l.key}
              contentContainerStyle={{ paddingBottom: 16 }}
              ListEmptyComponent={<Text style={styles.empty}>Cart is empty.</Text>}
              renderItem={({ item: line }) => (
                <View style={styles.cartRow}>
                  <ProductImage path={line.item.image} size={44} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cartName} numberOfLines={1}>{line.item.item_name}</Text>
                    <Text style={styles.cartMeta}>Rs. {line.priced.line_total.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => updateQty(line.key, -1)} style={styles.qtyBtn}><Text>-</Text></TouchableOpacity>
                  <Text style={styles.qtyText}>{line.qty}</Text>
                  <TouchableOpacity onPress={() => updateQty(line.key, 1)} style={styles.qtyBtn}><Text>+</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => removeLine(line.key)} style={styles.removeBtn}><Text style={{ color: colors.danger }}>✕</Text></TouchableOpacity>
                </View>
              )}
            />
            <View style={styles.summaryBox}>
              <SummaryRow label="Subtotal" value={totals.subtotal} />
              <SummaryRow label="GST" value={totals.cgst + totals.sgst + totals.cessAmount} />
              <SummaryRow label="Round off" value={totals.roundOff} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rs. {totals.grandTotal.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}><Text style={styles.secondaryBtnText}>Close</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, cart.length === 0 && styles.disabled]} disabled={cart.length === 0} onPress={openPayment}>
                <Text style={styles.primaryBtnText}>Proceed to Payment</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Payment</Text>
            <View style={styles.payableBox}>
              <Text style={styles.payableLabel}>Total Payable</Text>
              <Text style={styles.payableValue}>Rs. {totals.grandTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.modeToggle}>
              <TouchableOpacity style={[styles.modeBtn, !splitMode && styles.modeBtnActive]} onPress={() => toggleSplit(false)}>
                <Text style={!splitMode ? styles.modeTextActive : styles.modeText}>Single Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeBtn, splitMode && styles.modeBtnActive]} onPress={() => toggleSplit(true)}>
                <Text style={splitMode ? styles.modeTextActive : styles.modeText}>Split Payment</Text>
              </TouchableOpacity>
            </View>

            {!splitMode ? (
              <>
                <View style={styles.methodGrid}>
                  {PAYMENT_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.methodChip, payments[0]?.payment_method === m.key && styles.methodChipActive]}
                      onPress={() => setPayments([{ ...payments[0], payment_method: m.key }])}
                    >
                      <Text style={payments[0]?.payment_method === m.key ? styles.methodTextActive : styles.methodText}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  keyboardType="numeric"
                  value={String(payments[0]?.amount ?? '')}
                  onChangeText={(v) => setPayments([{ ...payments[0], amount: Math.min(Number(v) || 0, totals.grandTotal) }])}
                  style={styles.amountInput}
                />
              </>
            ) : (
              PAYMENT_METHODS.map((m) => (
                <View key={m.key} style={styles.splitRow}>
                  <Text style={styles.splitLabel}>{m.label}</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={String(payments.find((p) => p.payment_method === m.key)?.amount ?? 0)}
                    onChangeText={(v) => setSplitAmount(m.key, v)}
                    style={styles.splitInput}
                  />
                </View>
              ))
            )}

            <View style={styles.summaryBox}>
              <SummaryRow label="Total Bill" value={totals.grandTotal} />
              <SummaryRow label="Paid" value={paymentsTotal} />
              <View style={[styles.totalRow, { backgroundColor: remaining > 0.009 ? colors.warningBg : colors.successBg }]}>
                <Text style={styles.totalLabel}>{remaining > 0.009 ? 'Remaining (credit)' : 'Fully Paid'}</Text>
                <Text style={styles.totalValue}>Rs. {Math.max(remaining, 0).toFixed(2)}</Text>
              </View>
            </View>

            {blockedNoCustomer && <Text style={styles.error}>Select a customer to allow a partial/credit payment.</Text>}
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStage('cart')}><Text style={styles.secondaryBtnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, (completing || blockedNoCustomer) && styles.disabled]}
                disabled={completing || blockedNoCustomer}
                onPress={() => onComplete(payments.filter((p) => Number(p.amount) > 0))}
              >
                <Text style={styles.primaryBtnText}>{completing ? 'Processing…' : 'Pay Now'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{Number(value).toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page, padding: 16, paddingTop: 48 },
  title: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  cartRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSoft },
  cartName: { fontSize: 13, fontWeight: '600', color: colors.ink },
  cartMeta: { fontSize: 12, color: colors.inkMuted },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  qtyText: { width: 24, textAlign: 'center', fontWeight: '600' },
  removeBtn: { marginLeft: 8, padding: 4 },
  summaryBox: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  summaryLabel: { color: colors.inkMuted, fontSize: 13 },
  summaryValue: { color: colors.ink, fontSize: 13 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.highlight, borderRadius: 8, padding: 10, marginTop: 8 },
  totalLabel: { fontWeight: '700', color: colors.ink },
  totalValue: { fontWeight: '700', fontSize: 16, color: colors.ink },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryBtn: { flex: 1, backgroundColor: colors.success, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: colors.ink, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  payableBox: { backgroundColor: colors.highlight, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  payableLabel: { fontSize: 11, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase' },
  payableValue: { fontSize: 26, fontWeight: '700', color: colors.ink },
  modeToggle: { flexDirection: 'row', backgroundColor: colors.page, borderRadius: 10, padding: 4, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.card },
  modeText: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' },
  modeTextActive: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  methodChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card },
  methodChipActive: { borderColor: colors.gold, backgroundColor: '#F5EBD3' },
  methodText: { color: colors.inkMuted, fontWeight: '600' },
  methodTextActive: { color: colors.gold, fontWeight: '700' },
  amountInput: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, padding: 12, fontSize: 18, fontWeight: '700', backgroundColor: colors.card },
  splitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  splitLabel: { fontWeight: '600', color: colors.ink, width: 70 },
  splitInput: { flex: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, padding: 10, textAlign: 'right', backgroundColor: colors.card },
  error: { color: colors.danger, fontSize: 12, marginTop: 8 },
});
