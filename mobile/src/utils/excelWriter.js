import * as XLSX from 'xlsx';

/**
 * Builds a real .xlsx workbook client-side from an already-loaded row set
 * (used for "Export Selected", since the selection is a subset of data the
 * screen already has in memory — no backend round-trip needed). `columns`
 * is the same {key: header} shape ReportsController::output() uses server-side.
 */
export function buildXlsxBase64(columns, rows, sheetName = 'Sheet1') {
  const headers = Object.values(columns);
  const keys = Object.keys(columns);
  const data = [headers, ...rows.map((r) => keys.map((k) => r[k] ?? ''))];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
}
