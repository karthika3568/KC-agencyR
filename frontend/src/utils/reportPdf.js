import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const NUMERIC_REPORT_KEYS = new Set([
  'quantity', 'gross_sales', 'discount', 'gst', 'net_sales', 'paid_amount', 'credit_amount',
  'total_bills', 'total_items', 'bills', 'items', 'items_sold', 'customers',
  'taxable_value', 'cgst_amount', 'sgst_amount', 'grand_total', 'pending_balance', 'total_outstanding', 'amount', 'credit_limit',
  'qty', 'cost_price', 'cost_amount', 'selling_price', 'gross_amount', 'net_amount',
  'invoice_paid_amount', 'invoice_credit_amount', 'profit_loss',
  'quantity_on_hand', 'stock_value',
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
  doc.text('KC Agency', 40, 36);
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

const money = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(2));

/**
 * Builds and downloads a professional GRN document (one PDF, however many
 * GRNs are passed) from flattened item-line rows — the same rows/numbers
 * PurchaseController::flattenedGrnLines() streams for Excel, so the PDF
 * never recomputes its own totals. Each GRN gets its own page: a SUPPLIER
 * DETAILS / PURCHASE DETAILS header, a full item table, and a totals block.
 * Only fields actually present on the rows are shown — nothing invented.
 */
export function downloadGrnPdf(detailRows, filename, { print = false } = {}) {
  const byGrn = new Map();
  detailRows.forEach((r) => {
    if (!byGrn.has(r.grn_no)) byGrn.set(r.grn_no, []);
    byGrn.get(r.grn_no).push(r);
  });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 40;
  let first = true;

  byGrn.forEach((lines, grnNo) => {
    if (!first) doc.addPage();
    first = false;
    const h = lines[0];
    const canViewCost = h.rate !== undefined;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('KC Agency', left, 36);
    doc.setFontSize(11);
    doc.text('GOODS RECEIVED NOTE', pageWidth - left, 36, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`GRN Number: ${grnNo}`, pageWidth - left, 50, { align: 'right' });
    doc.text(`Purchase Date: ${h.purchase_date || ''}`, pageWidth - left, 62, { align: 'right' });

    const supplierLines = [
      ['Supplier Name', h.supplier_name],
      ['Mobile', h.supplier_phone],
      ['Address', h.supplier_address],
      ['GSTIN', h.supplier_gstin],
    ].filter(([, v]) => v);

    const purchaseLines = [
      ['Supplier Invoice #', h.supplier_invoice_no],
      ['Branch', h.branch_name],
      ['Payment Mode', h.payment_mode],
      ['Payment Status', h.status],
      ['Created By', h.created_by_name],
    ].filter(([, v]) => v);

    let y = 84;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('SUPPLIER DETAILS', left, y);
    doc.text('PURCHASE DETAILS', left + 360, y);
    doc.setFont(undefined, 'normal');
    y += 14;
    const maxRows = Math.max(supplierLines.length, purchaseLines.length);
    for (let i = 0; i < maxRows; i++) {
      if (supplierLines[i]) doc.text(`${supplierLines[i][0]}: ${supplierLines[i][1]}`, left, y);
      if (purchaseLines[i]) doc.text(`${purchaseLines[i][0]}: ${purchaseLines[i][1]}`, left + 360, y);
      y += 14;
    }

    y += 8;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('PURCHASE ITEM DETAILS', left, y);
    y += 8;

    const columns = canViewCost
      ? ['S.No', 'Item', 'SKU', 'HSN', 'Qty', 'Free Qty', 'Unit', 'Rate', 'MRP', 'Discount', 'GST %', 'GST Amt', 'Taxable Amt', 'Net Amt']
      : ['S.No', 'Item', 'SKU', 'HSN', 'Qty', 'Free Qty', 'Unit'];
    const body = lines.map((l, i) => {
      const discount = l.discount_amount > 0 ? money(l.discount_amount) : (l.discount_percent > 0 ? `${l.discount_percent}%` : '0.00');
      return canViewCost
        ? [i + 1, l.item_name, l.item_code || '', l.hsn_code || '', l.qty, l.free_qty || 0, l.unit_code || '', money(l.rate), money(l.mrp), discount, l.tax_percent, money(l.tax_amount), money(l.taxable_amount), money(l.net_amount)]
        : [i + 1, l.item_name, l.item_code || '', l.hsn_code || '', l.qty, l.free_qty || 0, l.unit_code || ''];
    });

    autoTable(doc, {
      startY: y,
      head: [columns],
      body,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      margin: { left, right: left },
    });

    if (canViewCost) {
      const gross = lines.reduce((s, l) => s + Number(l.gross_amount || 0), 0);
      const discountTotal = lines.reduce((s, l) => s + Number(l.discount_amount || 0), 0);
      const taxable = lines.reduce((s, l) => s + Number(l.taxable_amount || 0), 0);
      const gst = lines.reduce((s, l) => s + Number(l.tax_amount || 0), 0);

      let ty = doc.lastAutoTable.finalY + 18;
      const totals = [
        ['Gross Amount', money(gross)],
        ['Total Discount', money(discountTotal)],
        ['Taxable Amount', money(taxable)],
        ['Total GST', money(gst)],
        ['Grand Total', money(h.grn_grand_total)],
        ['Paid Amount', money(h.grn_paid_amount)],
        ['Pending Balance', money(h.grn_pending_balance)],
      ].filter(([, v]) => v !== '');

      doc.setFontSize(9);
      totals.forEach(([label, val]) => {
        doc.setFont(undefined, label === 'Grand Total' ? 'bold' : 'normal');
        doc.text(`${label}:`, pageWidth - left - 160, ty);
        doc.text(String(val), pageWidth - left, ty, { align: 'right' });
        ty += 14;
      });
    }
  });

  if (print) {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(filename);
  }
}

/**
 * Builds and downloads a "SALESMAN VAN STOCK ISSUE" document (one PDF,
 * however many issue transactions are passed) from flattened issue-line
 * rows — the same rows VanStockController::flattenedIssueLines() streams
 * for Excel. One section per issue transaction: Issue No, Salesman, Date,
 * Date, Issued By, then every item line that transaction contains — never
 * split across separate documents per item (section 20).
 */
export function downloadVanIssuePdf(detailRows, filename, { print = false } = {}) {
  const byIssue = new Map();
  detailRows.forEach((r) => {
    if (!byIssue.has(r.issue_no)) byIssue.set(r.issue_no, []);
    byIssue.get(r.issue_no).push(r);
  });

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 40;
  let first = true;

  byIssue.forEach((lines, issueNo) => {
    if (!first) doc.addPage();
    first = false;
    const h = lines[0];

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('SALESMAN VAN STOCK ISSUE', left, 36);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    const meta = [
      ['Issue No', issueNo],
      ['Order / Pre-booking', h.prebooking_no],
      ['Customer', h.customer_name ? `${h.customer_name}${h.customer_phone ? ` (${h.customer_phone})` : ''}` : null],
      ['Salesman', h.employee_name],
      ['Branch', h.branch_name],
      ['Date', h.issued_at],
      ['Issued By', h.issued_by_name],
      ['Notes', h.notes],
    ].filter(([, v]) => v);

    let y = 58;
    meta.forEach(([label, val]) => {
      doc.text(`${label}: ${val}`, left, y);
      y += 14;
    });

    y += 6;
    const totalQty = lines.reduce((sum, l) => sum + Number(l.qty || 0), 0);
    const totalAmount = lines.reduce((sum, l) => sum + Number(l.line_amount || (Number(l.qty || 0) * Number(l.unit_price || 0))), 0);

    autoTable(doc, {
      startY: y,
      head: [['S.No', 'Item', 'SKU', 'Unit', 'Qty', 'Unit Price', 'Amount']],
      body: [
        ...lines.map((l, i) => [
          i + 1,
          l.item_name,
          l.item_code || '',
          l.unit_code || '',
          l.qty,
          Number(l.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          Number(l.line_amount || (Number(l.qty || 0) * Number(l.unit_price || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        ]),
        [
          { content: 'Total', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
          { content: String(totalQty), styles: { fontStyle: 'bold' } },
          '',
          { content: `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } },
        ],
      ],
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      margin: { left, right: left },
    });
  });

  if (print) {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(filename);
  }
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
