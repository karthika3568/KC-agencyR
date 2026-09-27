import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { pick, types } from '@react-native-documents/picker';
import { itemsApi } from '../api/catalog';
import { friendlyErrorMessage } from '../api/client';
import { FormModal, formStyles } from './FormModal';
import { colors } from '../theme/colors';

/**
 * Shared Import Excel flow (pick -> preview -> commit) for any item-list
 * screen — Catalog and Inventory both import the same /items/import/*
 * endpoints, so this is the one place that logic lives.
 */
export function ImportExcelModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pickFile = async () => {
    setError('');
    try {
      const [picked] = await pick({ type: [types.xlsx, types.xls, types.csv] });
      setFile(picked);
      setResult(null);
    } catch (e) {
      if (e?.code !== 'OPERATION_CANCELED') {
        setError(e?.message || 'Could not open the file picker.');
      }
    }
  };

  const preview = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await itemsApi.importPreview(file);
      setResult(res);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await itemsApi.importCommit(file);
      setResult(res);
      onImported();
      if (res.invalid_rows === 0 && (res.inserted > 0 || res.updated > 0)) {
        Alert.alert('Import Successful', `${res.inserted} item(s) added, ${res.updated} updated.`);
      }
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      visible
      title="Import Excel"
      onClose={onClose}
      footer={<TouchableOpacity style={formStyles.secondaryBtn} onPress={onClose}><Text style={formStyles.secondaryBtnText}>Close</Text></TouchableOpacity>}
    >
      <TouchableOpacity style={formStyles.secondaryBtn} onPress={pickFile}>
        <Text style={formStyles.secondaryBtnText}>{file ? file.name : 'Choose Excel File'}</Text>
      </TouchableOpacity>

      {file && !result && (
        <TouchableOpacity style={[formStyles.primaryBtn, styles.spacedTop, loading && formStyles.disabled]} onPress={preview} disabled={loading}>
          <Text style={formStyles.primaryBtnText}>{loading ? 'Reading…' : 'Preview'}</Text>
        </TouchableOpacity>
      )}

      {error ? <Text style={formStyles.error}>{error}</Text> : null}

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.sectionTitle}>Import Summary</Text>
          <DetailRow label="Total Rows" value={String(result.total_rows)} />
          <DetailRow label="Valid Rows" value={String(result.valid_rows)} />
          <DetailRow label="Invalid Rows" value={String(result.invalid_rows)} />
          {result.committed && <DetailRow label="Inserted" value={String(result.inserted)} />}
          {result.committed && <DetailRow label="Updated" value={String(result.updated)} />}

          <Text style={[styles.sectionTitle, styles.spacedTop]}>Row Details</Text>
          {result.rows.map((r) => (
            <View key={r.row} style={[styles.rowCard, r.errors.length > 0 && styles.rowErrorCard]}>
              <Text style={styles.rowTitle}>Row {r.row} · {r.item_name || r.item_code || '—'}</Text>
              {r.errors.length > 0 ? (
                <Text style={styles.rowErrorText}>{r.errors.join(', ')}</Text>
              ) : (
                <Text style={styles.rowOkText}>OK</Text>
              )}
            </View>
          ))}

          {!result.committed && (
            <TouchableOpacity style={[formStyles.primaryBtn, styles.spacedTop, loading && formStyles.disabled]} onPress={commit} disabled={loading || result.valid_rows === 0}>
              <Text style={formStyles.primaryBtnText}>{loading ? 'Importing…' : `Commit Import (${result.valid_rows} valid rows)`}</Text>
            </TouchableOpacity>
          )}
          {result.committed && <Text style={[formStyles.label, styles.spacedTop]}>Import complete.</Text>}
        </View>
      )}
    </FormModal>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  spacedTop: { marginTop: 10 },
  resultBox: { marginTop: 12 },
  sectionTitle: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  detailLabel: { fontWeight: '600', color: colors.inkMuted, fontSize: 13 },
  detailVal: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  rowCard: { backgroundColor: colors.card, borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: colors.borderSoft },
  rowErrorCard: { borderColor: colors.danger, backgroundColor: '#FEF2F2' },
  rowTitle: { color: colors.ink, fontWeight: '600', fontSize: 12 },
  rowErrorText: { color: colors.danger, fontSize: 12, marginTop: 2, fontWeight: '600' },
  rowOkText: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
});
