import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { friendlyErrorMessage } from '../api/client';
import { downloadAndShareFile } from '../utils/fileExportService';
import { colors } from '../theme/colors';

/**
 * Get List / Download Sample Template / Import Excel / Export Excel row,
 * shared by any item-list screen (Catalog, Inventory) that reuses the same
 * /items/export + /items/import/template endpoints.
 */
export function ExcelToolbar({ onGetList, onImportPress, busy, setBusy, exportPath = '/items/export', exportFilename = 'items_export.xlsx', templatePath = '/items/import/template', templateFilename = 'items_import_template.xlsx' }) {
  const runExport = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Export failed', friendlyErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.toolbar}>
      <ToolbarBtn label="Get List" onPress={onGetList} />
      <ToolbarBtn label="Sample Template" onPress={() => runExport(() => downloadAndShareFile(templatePath, templateFilename))} disabled={busy} />
      <ToolbarBtn label="Export Excel" onPress={() => runExport(() => downloadAndShareFile(exportPath, exportFilename))} disabled={busy} />
      <ToolbarBtn label="Import Excel" onPress={onImportPress} disabled={busy} />
    </View>
  );
}

function ToolbarBtn({ label, onPress, disabled }) {
  return (
    <TouchableOpacity style={[styles.toolbarBtn, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.toolbarBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8, flexWrap: 'wrap' },
  toolbarBtn: { backgroundColor: colors.navbar, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  toolbarBtnText: { color: colors.gold, fontWeight: '700', fontSize: 11 },
  disabled: { opacity: 0.5 },
});
