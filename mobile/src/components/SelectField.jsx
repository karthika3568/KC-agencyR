import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

/**
 * A tappable field that opens a full-screen searchable list to pick one
 * option — replaces horizontal chip rows, which don't scale past a
 * handful of items and don't fit reliably on narrow screens.
 */
export function SelectField({ label, value, options, labelKey = 'name', valueKey = 'id', onChange, placeholder = '--', required }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o[valueKey] === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o[labelKey] || '').toLowerCase().includes(q));
  }, [options, query, labelKey]);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}{required ? ' *' : ''}</Text> : null}
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.fieldText : styles.placeholderText} numberOfLines={1}>
          {selected ? selected[labelKey] : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label || 'Select'}</Text>
            <TouchableOpacity onPress={() => setOpen(false)}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>
          <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search…" style={styles.search} />
          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o[valueKey])}
            ListEmptyComponent={<Text style={styles.empty}>No results.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, item[valueKey] === value && styles.optionActive]}
                onPress={() => { onChange(item[valueKey]); setOpen(false); setQuery(''); }}
              >
                <Text style={item[valueKey] === value ? styles.optionTextActive : styles.optionText}>{item[labelKey]}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: colors.inkMuted, marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.card },
  fieldText: { color: colors.ink, fontSize: 14, flex: 1 },
  placeholderText: { color: colors.inkMuted, fontSize: 14, flex: 1 },
  chevron: { color: colors.inkMuted, marginLeft: 8 },
  modalScreen: { flex: 1, backgroundColor: colors.page, paddingTop: 48, paddingHorizontal: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  close: { fontSize: 18, color: colors.inkMuted, padding: 4 },
  search: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, padding: 12, backgroundColor: colors.card, marginBottom: 8 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 24 },
  option: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  optionActive: { backgroundColor: colors.highlight },
  optionText: { color: colors.ink, fontSize: 14 },
  optionTextActive: { color: colors.ink, fontSize: 14, fontWeight: '700' },
});
