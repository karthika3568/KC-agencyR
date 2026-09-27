import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';

export function HeldBillsModal({ visible, heldInvoices, onResume, onDiscard, onClose }) {
  const confirmDiscard = (invoice) => {
    Alert.alert('Discard held bill?', `#${invoice.id} · Rs. ${invoice.grand_total}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => onDiscard(invoice.id) },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Held Bills ({heldInvoices.length})</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Icon name="close" size={20} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={heldInvoices}
            keyExtractor={(inv) => String(inv.id)}
            ListEmptyComponent={<Text style={styles.empty}>No held bills.</Text>}
            renderItem={({ item: inv }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>#{inv.id} · {(inv.bill_type || 'gst').toUpperCase()}</Text>
                  <Text style={styles.rowMeta}>{inv.customer_name || 'Walk-in'} · Rs. {inv.grand_total}</Text>
                </View>
                <TouchableOpacity style={styles.resumeBtn} onPress={() => onResume(inv)}>
                  <Text style={styles.resumeText}>Resume</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.discardBtn} onPress={() => confirmDiscard(inv)}>
                  <Icon name="delete" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.page, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  empty: { textAlign: 'center', color: colors.inkMuted, paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSoft },
  rowTitle: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  rowMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  resumeBtn: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 },
  resumeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  discardBtn: { padding: 8, marginLeft: 4 },
});
