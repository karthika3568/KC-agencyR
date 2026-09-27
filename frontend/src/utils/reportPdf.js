import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const NUMERIC_REPORT_KEYS = new Set([
  'quantity', 'gross_sales', 'discount', 'gst', 'net_sales', 'paid_amount', 'credit_amount',
  'total_bills', 'total_items', 'bills', 'items', 'items_sold', 'customers',
  'taxable_value', 'cgst_amount', 'sgst_amount', 'grand_total', 'pending_balance', 'total_outstanding', 'amount', 'credit_limit'
]);

/**
 * Builds and downloads a real PDF for a report — same {columns, rows} shape
 * ReportsController::output() uses for Excel, so both exports always agree.
 * Landscape by default since these tables run wide; downloads directly
 * (no print dialog, no extra tab) via jsPDF's own save().
 */
export function downloadReportPdf({ title, filtersText, columns, rows, totalsRow, filename }) {
  const isColumnsObj = typeof columns === 'object' && !Array.isArray(columns);
  const keys = isColumnsObj ? Object.keys(columns) : columns.map((c) => c.key);
  const headers = isColumnsObj ? Object.values(columns) : columns.map((c) => c.label);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('AJ Agency', 40, 36);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(title, 40, 54);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`Filters: ${filtersText || 'None'}`, 40, 70);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 84);
  doc.setTextColor(0);

  const body = rows.map((r) => keys.map((k) => (r[k] ?? '')));
  const foot = totalsRow
    ? [keys.map((k, i) => (i === 0 ? 'Grand Total' : NUMERIC_REPORT_KEYS.has(k) ? (totalsRow[k] ?? '') : ''))]
    : undefined;

  autoTable(doc, {
    startY: 96,
    head: [headers],
    body,
    foot,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
    columnStyles: Object.fromEntries(keys.map((k, i) => [i, NUMERIC_REPORT_KEYS.has(k) ? { halign: 'right' } : {}])),
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 80, doc.internal.pageSize.getHeight() - 16);
    },
  });

  doc.save(filename);
}

/**
 * Builds and downloads a CSV/Excel file for report rows (e.g. selected rows or filtered rows).
 * Uses UTF-8 BOM so Excel opens values, special characters, and numbers cleanly.
 */
export function downloadReportExcel({ title, columns, rows, totalsRow, filename }) {
  const isColumnsObj = typeof columns === 'object' && !Array.isArray(columns);
  const keys = isColumnsObj ? Object.keys(columns) : columns.map((c) => c.key);
  const headers = isColumnsObj ? Object.values(columns) : columns.map((c) => c.label);

  const csvRows = [];

  if (title) {
    csvRows.push([`"${title.replace(/"/g, '""')}"`]);
    csvRows.push([]);
  }

  // Header line
  csvRows.push(headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // Data lines
  rows.forEach((r) => {
    const rowValues = keys.map((k) => {
      const val = r[k] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(rowValues.join(','));
  });

  // Totals line
  if (totalsRow) {
    const totalValues = keys.map((k, i) => {
      if (i === 0) return '"Grand Total"';
      const val = totalsRow[k];
      return val !== undefined ? `"${String(val).replace(/"/g, '""')}"` : '""';
    });
    csvRows.push(totalValues.join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const outName = filename.endsWith('.csv') || filename.endsWith('.xlsx')
    ? filename.replace(/\.(xlsx|pdf)$/, '.csv')
    : `${filename}.csv`;
  a.download = outName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
