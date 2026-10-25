
import React from 'react';

const COMPANY_DETAILS = {
  name: 'KC AGENCY',
  address: '92N ARASARADI VINAYAGA KOVIL STREET, TN PUTHUKUDI PULIYANGUDI - 627855',
  fssai: '12425026000379',
  gst: '33GDIPS7186A1ZB',
  phone: '7305661222',
  title: 'Tax Invoice',
};

function formatDateDMY(dStr) {
  if (!dStr) return '';
  const parts = String(dStr).split(/[-T :]/);
  if (parts.length >= 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return dStr;
}

export function A4Template({ data }) {
  const {
    invoice = {},
    branch = {},
    tax_slabs: taxSlabs = [],
    amount_in_words: amountInWords = '',
    is_stock_issue = false,
  } = data || {};

  const items = invoice.items || [];
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const formattedTotalQty = Number.isInteger(totalQty) ? totalQty : totalQty.toFixed(2);

  const grossAmount = Number(invoice.taxable_value ?? invoice.subtotal ?? 0).toFixed(2);
  const totalTax = (
    Number(invoice.cgst_amount || 0) +
    Number(invoice.sgst_amount || 0) +
    Number(invoice.igst_amount || 0)
  ).toFixed(2);
  const discount = Number(invoice.discount_amount || 0).toFixed(2);
  let percentDiscountTotal = 0;
  let rupeeDiscountTotal = 0;
  items.forEach((it) => {
    const gross = Number(it.qty || 0) * Number(it.rate || 0);
    const pct = Number(it.discount_percent || 0);
    const pctDisc = gross > 0 && pct > 0 ? Math.round(((gross * pct) / 100) * 100) / 100 : 0;
    const directAmt = Math.max(0, Math.round((Number(it.discount_amount || 0) - pctDisc) * 100) / 100);
    percentDiscountTotal += pctDisc;
    rupeeDiscountTotal += directAmt;
  });
  const netAmount = Number(invoice.grand_total || 0).toFixed(2);

  const isInterstate = Number(invoice.igst_amount || 0) > 0;
  const isNonGst = invoice.bill_type === 'non_gst';

  const companyName = branch.print_name || branch.name || COMPANY_DETAILS.name;
  const companyAddress = [branch.address_line1, branch.city, branch.state, branch.pincode]
    .filter(Boolean)
    .join(', ') || COMPANY_DETAILS.address;
  const companyGst = branch.gstin || COMPANY_DETAILS.gst;
  const companyPhone = branch.phone || COMPANY_DETAILS.phone;

  let wordsText = amountInWords || '';
  if (wordsText) {
    if (!wordsText.toLowerCase().startsWith('rupees')) {
      wordsText = `Rupees ${wordsText}`;
    }
    if (!wordsText.toLowerCase().endsWith('only')) {
      wordsText = `${wordsText} Only`;
    }
  }

  // Precomputed or derived tax slabs breakdown
  let slabs = taxSlabs;
  if (!is_stock_issue && (!slabs || slabs.length === 0)) {
    const map = {};
    items.forEach((it) => {
      const pct = Number(it.tax_percent || 0);
      if (!map[pct]) {
        map[pct] = { gst_percent: pct, taxable: 0, cgst: 0, sgst: 0, cess: 0 };
      }
      const taxAmt = Number(it.tax_amount || 0);
      map[pct].taxable += Number(it.line_total || 0);
      map[pct].cgst += Math.round((taxAmt / 2) * 100) / 100;
      map[pct].sgst += taxAmt - Math.round((taxAmt / 2) * 100) / 100;
      map[pct].cess += Number(it.cess_amount || 0);
    });
    slabs = Object.values(map);
  }

  const customerName = invoice.customer_name || 'Walk-in Customer';
  const rawAddress = invoice.customer_address || invoice.address || '';
  const addressLines = rawAddress
    ? rawAddress.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    : [];

  // Spacer row height to make vertical lines extend down to the footer divider
  const spacerHeight = Math.max(16, 170 - items.length * 21);

  return (
    <div
      className="kc-invoice-wrapper a4-invoice"
      style={{
        width: '100%',
        maxWidth: '205mm',
        margin: '0 auto',
        border: '1.5px solid #000',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
        padding: '6px 10px 14px 10px',
        lineHeight: 1.25,
      }}
    >
      {/* 1. Header Section */}
      <div style={{ position: 'relative', textAlign: 'center', paddingBottom: '4px' }}>
        {/* FSSAI on top left */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            fontSize: '11px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          FSSAI NO : {COMPANY_DETAILS.fssai}
        </div>

        {/* Company Name Centered */}
        <div
          style={{
            fontSize: '22px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            lineHeight: '1.2',
          }}
        >
          {companyName}
        </div>

        {/* Company Address Centered Beneath */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 'normal',
            marginTop: '2px',
            lineHeight: '1.2',
          }}
        >
          {companyAddress}
        </div>
      </div>

      {/* Header Second Row: GST No (Left), Document Title (Center), PH (Right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
          marginBottom: '6px',
          fontSize: '12px',
        }}
      >
        <div style={{ flex: '1 1 33%', textAlign: 'left', fontWeight: '500' }}>
          <strong>GST No: </strong>{companyGst}
        </div>
        <div
          style={{
            flex: '1 1 34%',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
        >
          {is_stock_issue ? 'STOCK ISSUE BILL' : (data?.title || (isNonGst ? 'BILL OF SUPPLY / ESTIMATE' : COMPANY_DETAILS.title))}
        </div>
        <div style={{ flex: '1 1 33%', textAlign: 'right', fontWeight: 'bold' }}>
          PH:{companyPhone}
        </div>
      </div>

      {/* 2. Customer / Salesman & Bill Info Section */}
      {is_stock_issue ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingTop: '4px',
            paddingBottom: '8px',
            fontSize: '12px',
          }}
        >
          {/* Left: Salesman & Branch */}
          <div style={{ flex: '1 1 60%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'normal', width: '85px', flexShrink: 0 }}>Salesman :</span>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                {invoice.salesman_name || invoice.customer_name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '3px' }}>
              <span style={{ fontWeight: 'normal', width: '85px', flexShrink: 0 }}>Branch :</span>
              <span>{invoice.branch_name || 'Main Branch'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '3px' }}>
              <span style={{ fontWeight: 'normal', width: '85px', flexShrink: 0 }}>Issued By :</span>
              <span>{invoice.issued_by_name || 'Warehouse In-Charge'}</span>
            </div>
            {invoice.notes && (
              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '3px' }}>
                <span style={{ fontWeight: 'normal', width: '85px', flexShrink: 0 }}>Notes :</span>
                <span>{invoice.notes}</span>
              </div>
            )}
          </div>

          {/* Right: Issue No & Date */}
          <div style={{ flex: '0 0 35%', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: '160px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>Issue No</span>
                <span style={{ fontWeight: 'bold' }}>: {invoice.invoice_no}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span>Date</span>
                <span>: {formatDateDMY(invoice.invoice_date)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingTop: '4px',
            paddingBottom: '8px',
            fontSize: '12px',
          }}
        >
          {/* Left: Customer Details */}
          <div style={{ flex: '1 1 60%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'normal', width: '28px', flexShrink: 0 }}>To :</span>
              <div>
                <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {customerName}
                  {addressLines.length > 0 ? ',' : ''}
                </span>
                {addressLines.map((line, idx) => (
                  <div key={idx} style={{ textTransform: 'uppercase' }}>
                    {line}{idx < addressLines.length - 1 ? ',' : ''}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '32px', marginTop: '4px' }}>
              <div>
                <strong>PH: </strong>
                <span>{invoice.customer_phone || ''}</span>
              </div>
              <div>
                <strong>GST: </strong>
                <span>{invoice.customer_gstin || ''}</span>
              </div>
            </div>
          </div>

          {/* Right: Bill No & Date */}
          <div style={{ flex: '0 0 35%', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: '160px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>Bill No</span>
                <span style={{ fontWeight: 'bold' }}>: {invoice.invoice_no || 'CR2954'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span>Date</span>
                <span>: {formatDateDMY(invoice.invoice_date) || '08/10/2026'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Product Table */}
      {is_stock_issue ? (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderTop: '1px solid #000',
            borderBottom: '1px solid #000',
            fontSize: '11px',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ width: '6%', textAlign: 'center', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                S.No
              </th>
              <th style={{ width: '40%', textAlign: 'left', padding: '3px 6px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                Items / Description
              </th>
              <th style={{ width: '16%', textAlign: 'center', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                SKU
              </th>
              <th style={{ width: '10%', textAlign: 'center', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                Unit
              </th>
              <th style={{ width: '8%', textAlign: 'center', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                Qty
              </th>
              <th style={{ width: '10%', textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                Rate (₹)
              </th>
              <th style={{ width: '10%', textAlign: 'right', padding: '3px 6px', fontWeight: 'bold' }}>
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const qty = Number(item.qty || 0);
              const rate = Number(item.rate ?? item.unit_price ?? 0).toFixed(2);
              const amount = Number(item.line_total ?? item.net_amount ?? (qty * Number(rate))).toFixed(2);

              return (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {idx + 1}
                  </td>
                  <td style={{ textAlign: 'left', padding: '2px 6px', borderRight: '1px solid #000' }}>
                    {item.item_name_snapshot || item.item_name || ''}
                  </td>
                  <td style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #000', fontFamily: 'monospace' }}>
                    {item.sku || item.item_code || '-'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {item.unit || item.unit_code || '-'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                    {qty}
                  </td>
                  <td style={{ textAlign: 'right', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {rate}
                  </td>
                  <td style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 'bold' }}>
                    {amount}
                  </td>
                </tr>
              );
            })}
            {/* Spacer row to extend vertical column lines */}
            <tr style={{ height: `${spacerHeight}px` }}>
              <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderTop: '1px solid #000',
            borderBottom: '1px solid #000',
            fontSize: '11px',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ width: '8%', textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                N.Rate
              </th>
              <th style={{ width: '27%', textAlign: 'left', padding: '3px 6px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                Items
              </th>
              <th style={{ width: '10%', textAlign: 'center', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                HSN
              </th>
              <th style={{ width: '6%', textAlign: 'center', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                Qty
              </th>
              <th style={{ width: '5%', textAlign: 'center', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                Free
              </th>
              <th style={{ width: '8%', textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                MRP
              </th>
              <th style={{ width: '8%', textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                Rate
              </th>
              <th style={{ width: '7%', textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                GST%
              </th>
              <th style={{ width: '9%', textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                GST
              </th>
              <th style={{ width: '12%', textAlign: 'right', padding: '3px 6px', fontWeight: 'bold' }}>
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const qty = Number(item.qty || 0);
              const freeQty = Number(item.free_qty || 0);
              const mrp = Number(item.mrp || 0).toFixed(2);
              const rate = Number(item.rate || 0).toFixed(2);
              const gstPercent = isNonGst ? '0.00' : Number(item.tax_percent || 0).toFixed(2);
              const gstAmount = isNonGst ? '0.00' : Number(item.tax_amount || 0).toFixed(2);
              const amount = Number(
                item.net_amount ??
                  (Number(item.line_total || 0) + (isNonGst ? 0 : Number(item.tax_amount || 0) + Number(item.cess_amount || 0)))
              ).toFixed(2);
              const nRate = qty > 0 ? (Number(amount) / qty).toFixed(2) : rate;

              return (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: 'right', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {nRate}
                  </td>
                  <td style={{ textAlign: 'left', padding: '2px 6px', borderRight: '1px solid #000' }}>
                    {item.item_name_snapshot || item.item_name || ''}
                  </td>
                  <td style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {item.hsn_snapshot || item.hsn_code || ''}
                  </td>
                  <td style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {qty}
                  </td>
                  <td style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {freeQty}
                  </td>
                  <td style={{ textAlign: 'right', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {mrp}
                  </td>
                  <td style={{ textAlign: 'right', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {rate}
                  </td>
                  <td style={{ textAlign: 'right', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {gstPercent}
                  </td>
                  <td style={{ textAlign: 'right', padding: '2px 4px', borderRight: '1px solid #000' }}>
                    {gstAmount}
                  </td>
                  <td style={{ textAlign: 'right', padding: '2px 6px' }}>
                    {amount}
                  </td>
                </tr>
              );
            })}
            {/* Spacer row to extend vertical column lines */}
            <tr style={{ height: `${spacerHeight}px` }}>
              <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      )}

      {/* 4. Totals & Tax Summary Section */}
      {is_stock_issue ? (
        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          {/* Left: Tot.Qty, Words, Stock Note */}
          <div style={{ flex: '1 1 63%', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '3px 6px',
                borderBottom: '1px solid #000',
                fontSize: '11px',
              }}
            >
              <div style={{ whiteSpace: 'nowrap', marginRight: '16px' }}>
                <strong>Tot.Qty : </strong>
                <strong>{formattedTotalQty}</strong>
              </div>
              <div style={{ fontWeight: 'bold' }}>
                {wordsText}
              </div>
            </div>
            <div style={{ padding: '6px', fontSize: '10px', color: '#444', fontStyle: 'italic', flex: 1 }}>
              Certified that the above quantities have been issued to the salesman for mobile van distribution.
              The recipient is responsible for safe custody and reconciliation at day end.
            </div>
          </div>

          {/* Right: Net Amount / Total Value */}
          <div style={{ flex: '0 0 37%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              <span>Total Value :</span>
              <span>Rs. {netAmount}</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          {/* Left: Tot.Qty, Words, Tax Breakdown Table */}
          <div style={{ flex: '1 1 63%', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
            {/* Tot.Qty and Amount in Words */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '3px 6px',
                borderBottom: '1px solid #000',
                fontSize: '11px',
              }}
            >
              <div style={{ whiteSpace: 'nowrap', marginRight: '16px' }}>
                <strong>Tot.Qty : </strong>
                <strong>{formattedTotalQty}</strong>
              </div>
              <div style={{ fontWeight: 'bold' }}>
                {wordsText}
              </div>
            </div>

            {/* Tax Slabs Sub-table (or Non-GST notice) */}
            <div style={{ padding: '3px 6px', flex: 1 }}>
              {isNonGst ? (
                <div style={{ fontSize: '11px', color: '#444', fontStyle: 'italic', padding: '6px 0' }}>
                  Composition / Non-GST — No tax is charged on this document.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'right' }}>
                  <thead>
                    {isInterstate ? (
                      <tr>
                        <th style={{ textAlign: 'left', fontWeight: 'bold', padding: '1px 4px' }}>IGST%</th>
                        <th style={{ fontWeight: 'bold', padding: '1px 4px' }}>IGST</th>
                        <th style={{ fontWeight: 'bold', padding: '1px 4px' }}>TOTAL</th>
                      </tr>
                    ) : (
                      <tr>
                        <th style={{ textAlign: 'left', fontWeight: 'bold', padding: '1px 4px' }}>CGST%</th>
                        <th style={{ fontWeight: 'bold', padding: '1px 4px' }}>CGST</th>
                        <th style={{ fontWeight: 'bold', padding: '1px 4px' }}>SGST%</th>
                        <th style={{ fontWeight: 'bold', padding: '1px 4px' }}>SGST</th>
                        <th style={{ fontWeight: 'bold', padding: '1px 4px' }}>TOTAL</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {slabs.map((slab, i) => {
                      const cgstPct = (Number(slab.gst_percent || 0) / 2).toFixed(2);
                      const cgstAmt = Number(slab.cgst || 0).toFixed(2);
                      const sgstPct = (Number(slab.gst_percent || 0) / 2).toFixed(2);
                      const sgstAmt = Number(slab.sgst || 0).toFixed(2);
                      const totSlab = (
                        Number(slab.cgst || 0) +
                        Number(slab.sgst || 0) +
                        Number(slab.cess || 0)
                      ).toFixed(2);

                      if (isInterstate) {
                        return (
                          <tr key={i} style={{ fontWeight: 'bold' }}>
                            <td style={{ textAlign: 'left', padding: '1px 4px' }}>{Number(slab.gst_percent || 0).toFixed(2)}</td>
                            <td style={{ padding: '1px 4px' }}>{totSlab}</td>
                            <td style={{ padding: '1px 4px' }}>{totSlab}</td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={i} style={{ fontWeight: 'bold' }}>
                          <td style={{ textAlign: 'left', padding: '1px 4px' }}>{cgstPct}</td>
                          <td style={{ padding: '1px 4px' }}>{cgstAmt}</td>
                          <td style={{ padding: '1px 4px' }}>{sgstPct}</td>
                          <td style={{ padding: '1px 4px' }}>{sgstAmt}</td>
                          <td style={{ padding: '1px 4px' }}>{totSlab}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: Gross Amt, Tot Tax Amt, Discount, Net Amount */}
          <div style={{ flex: '0 0 37%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '4px 8px', fontSize: '11px', borderBottom: '1px solid #000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Gross Amt :</span>
                <span>{grossAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Tot Tax Amt :</span>
                <span>{isNonGst ? '0.00' : totalTax}</span>
              </div>
              {percentDiscountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Discount (%) :</span>
                  <span>{percentDiscountTotal.toFixed(2)}</span>
                </div>
              )}
              {rupeeDiscountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Discount (₹) :</span>
                  <span>{rupeeDiscountTotal.toFixed(2)}</span>
                </div>
              )}
              {percentDiscountTotal <= 0 && rupeeDiscountTotal <= 0 && Number(discount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount :</span>
                  <span>{discount}</span>
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 8px',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              <span>Net Amount :</span>
              <span>{netAmount}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Footer Signatures Area */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '28px 12px 6px 12px',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        <div>{is_stock_issue ? 'Salesman Signature' : 'Customer Signature and Seal'}</div>
        <div>For &nbsp;&nbsp;{companyName} {is_stock_issue ? '(Authorized Signatory)' : ''}</div>
      </div>
    </div>
  );
}
