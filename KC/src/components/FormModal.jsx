import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

/**
 * Standard shell for every full-screen create/edit form in the app:
 * fixed header, scrollable keyboard-safe body, fixed footer. Every field
 * inside must size itself with flex/percentage — never a fixed desktop
 * pixel width — so it holds up on any phone.
 */
export function FormModal({ visible, title, onClose, children, footer }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 16);
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: bottomPadding }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const formStyles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: colors.inkMuted, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.card, fontSize: 14, color: colors.ink },
  textarea: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, padding: 12, backgroundColor: colors.card, fontSize: 14, color: colors.ink, minHeight: 70, textAlignVertical: 'top' },
  primaryBtn: { flex: 1, backgroundColor: colors.success, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryBtn: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  dangerBtn: { flex: 1, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: colors.danger, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  dangerBtnText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.4 },
  error: { color: colors.danger, fontSize: 13, marginTop: 10 },
  row: { flexDirection: 'row', gap: 10 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink, flex: 1, marginRight: 12 },
  close: { fontSize: 18, color: colors.inkMuted, padding: 4 },
  body: { padding: 16, paddingBottom: 40 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.card,
  },
});
