import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export function SegmentedTabs({ tabs, active, onChange }) {
  return (
    <View style={styles.wrap}>
      {tabs.map((t) => (
        <TouchableOpacity key={t.key} style={[styles.tab, active === t.key && styles.tabActive]} onPress={() => onChange(t.key)}>
          <Text style={active === t.key ? styles.textActive : styles.text} numberOfLines={1}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.page, borderRadius: 10, padding: 4, marginHorizontal: 12, marginTop: 12 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card },
  text: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' },
  textActive: { color: colors.ink, fontSize: 12, fontWeight: '700' },
});
