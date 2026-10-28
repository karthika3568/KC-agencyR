// Mirrors frontend/src/print/A4Template.jsx — same fields, same GST/Non-GST
// column rules, so the mobile PDF matches what the webapp prints.
export function buildInvoiceHtml(data) {
  const { invoice, branch = {}, tax_slabs: taxSlabs = [], amount_in_words: amountInWords = '', customer_outstanding: outstanding } = data;
  const isGst = invoice.bill_type !== 'non_gst';
  const isOutstation = invoice.invoice_format === 'outstation';
  const items = invoice.items || [];
  const showFreeQtyCol = !isOutstation || items.some((it) => Number(it.free_qty) > 0);

  const row = (label, value, bold) => `
    <div style="display:flex;justify-content:space-between;font-weight:${bold ? '700' : '400'};font-size:${bold ? '14px' : '12px'};${bold ? 'color:#1d4ed8;' : ''}">
      <span>${label}</span><span>${value}</span>
    </div>`;

  const itemRows = items.map((it) => `
    <tr>
      <td>${it.hsn_snapshot || '-'}</td>
      <td>${it.item_name_snapshot || ''}</td>
      <td>${it.mrp ?? ''}</td>
      <td>${it.qty}</td>
      <td>${it.unit_code || ''}</td>
      ${showFreeQtyCol ? `<td>${it.free_qty || 0}</td>` : ''}
      <td>${it.rate}</td>
      <td>${it.discount_amount || 0}</td>
      ${isGst ? `<td>${it.tax_percent}</td><td>${it.tax_amount}</td>` : ''}
      <td>${it.net_amount ?? it.line_total}</td>
    </tr>`).join('');

  const taxSlabRows = isGst
    ? taxSlabs.map((s) => `
      <tr><td>${s.gst_percent}%</td><td>${Number(s.taxable).toFixed(2)}</td><td>${Number(s.cgst).toFixed(2)}</td><td>${Number(s.sgst).toFixed(2)}</td><td>${Number(s.cess).toFixed(2)}</td></tr>
    `).join('')
    : '';

  return `
  <html>
  <head><meta charset="utf-8" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #111; padding: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; font-size: 11px; text-align: left; }
    th { background: #f1f5f9; }
    .header { display:flex; justify-content:space-between; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; }
    .box { margin: 10px 0; border: 1px solid #999; padding: 8px; }
  </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div style="font-weight:700;font-size:18px;">${branch.print_name || ''}</div>
        <div>${branch.address_line1 || ''}, ${branch.city || ''}, ${branch.state || ''} ${branch.pincode || ''}</div>
        <div>Phone: ${branch.phone || ''} ${branch.support_email ? `| ${branch.support_email}` : ''}</div>
        ${branch.gstin ? `<div>GSTIN: ${branch.gstin}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700;font-size:16px;">${isGst ? 'TAX INVOICE' : 'INVOICE (NON-GST)'}</div>
        ${invoice.price_type && invoice.price_type !== 'normal' ? `<div style="font-weight:700;color:#b45309;font-size:11px;">${invoice.price_type === 'wholesale' ? 'WHOLESALE PRICING' : 'RETAIL PRICING'}</div>` : ''}
        <div style="font-weight:700;color:#1d4ed8;">BILL NO: ${invoice.invoice_no || 'HELD'}</div>
        <div>DATE: ${invoice.invoice_date || ''} ${invoice.vehicle_no ? `| VEHICLE NO: ${invoice.vehicle_no}` : ''}</div>
      </div>
    </div>

    <div class="box" style="display:flex;justify-content:space-between;">
      <div>
        <div style="font-weight:700;">TO (CUSTOMER DETAILS):</div>
        <div>${invoice.customer_name || 'Walk-in Customer'}</div>
      </div>
      <div style="text-align:right;">
        <div>MOBILE: ${invoice.customer_phone || '-'}</div>
        <div>PAYMENT: ${invoice.payment_status || '-'}</div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th>HSN</th><th>Particulars</th><th>MRP</th><th>Qty</th><th>Unit</th>${showFreeQtyCol ? '<th>Free</th>' : ''}<th>Net Rate</th><th>Disc</th>
        ${isGst ? '<th>GST%</th><th>GST Amt</th>' : ''}
        <th>Net Amt</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>

    ${isGst ? `
    <div class="box">
      <div style="font-weight:700;margin-bottom:4px;">TAX BREAKDOWN (GST SLABS):</div>
      <table><thead><tr><th>GST%</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>Cess</th></tr></thead>
      <tbody>${taxSlabRows}</tbody></table>
    </div>` : ''}

    <div style="display:flex;justify-content:space-between;margin-top:10px;">
      <div style="width:55%;">
        <div><strong>Amount in Words:</strong> ${amountInWords}</div>
        ${outstanding !== null && outstanding !== undefined ? `<div style="margin-top:8px;">Customer Outstanding Balance: Rs. ${outstanding}</div>` : ''}
      </div>
      <div style="width:35%;">
        ${row('GROSS AMOUNT', invoice.subtotal)}
        ${row('DISCOUNT', invoice.discount_amount)}
        ${isGst ? row('GST TAX', (Number(invoice.cgst_amount) + Number(invoice.sgst_amount) + Number(invoice.igst_amount)).toFixed(2)) : ''}
        ${row('ROUND OFF', invoice.round_off)}
        ${row('NET TOTAL', invoice.grand_total, true)}
      </div>
    </div>
  </body>
  </html>`;
}
