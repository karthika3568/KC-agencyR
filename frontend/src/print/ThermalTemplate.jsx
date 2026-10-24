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

export function ThermalTemplate({ data }) {
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

  return (
    <div
      className="thermal-invoice"
      style={{
        width: '76mm',
        maxWidth: '76mm',
        margin: '0 auto',
        border: '1px solid #000',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
        padding: '3px 4px 6px 4px',
        fontSize: '8px',
        lineHeight: 1.2,
      }}
    >
      {/* 1. Header Section */}
      <div style={{ textAlign: 'center', position: 'relative', paddingBottom: '2px' }}>
        <div style={{ fontSize: '7.5px', fontWeight: 'bold', textAlign: 'left', marginBottom: '1px' }}>
          FSSAI NO : {COMPANY_DETAILS.fssai}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.3px', lineHeight: 1.1 }}>
          {companyName}
        </div>
        <div style={{ fontSize: '7.5px', marginTop: '1px', lineHeight: 1.1 }}>
          {companyAddress}
        </div>
      </div>

      {/* Header Second Row: GST No, Tax Invoice, Phone */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2px',
          marginBottom: '3px',
          fontSize: '7.5px',
          borderBottom: '0.5px solid #000',
          paddingBottom: '2px',
        }}
      >
        <div><strong>GST No: </strong>{companyGst}</div>
        <div style={{ fontWeight: 'bold' }}>{is_stock_issue ? 'STOCK ISSUE BILL' : (data?.title || (isNonGst ? 'BILL OF SUPPLY / ESTIMATE' : COMPANY_DETAILS.title))}</div>
        <div><strong>PH:</strong>{companyPhone}</div>
      </div>

      {/* 2. Customer / Salesman & Bill Info Section */}
      {is_stock_issue ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: '3px',
            fontSize: '8px',
          }}
        >
          <div style={{ flex: '1 1 58%' }}>
            <div>
              <span>Salesman: </span>
              <strong style={{ textTransform: 'uppercase' }}>
                {invoice.salesman_name || invoice.customer_name}
              </strong>
            </div>
            <div style={{ fontSize: '7.5px', marginTop: '1px' }}>
              <span>Branch: </span>
              <span>{invoice.branch_name || 'Main Branch'}</span>
            </div>
            {invoice.issued_by_name && (
              <div style={{ fontSize: '7.5px', marginTop: '1px' }}>
                <span>Issued By: </span>
                <span>{invoice.issued_by_name}</span>
              </div>
            )}
            {invoice.notes && (
              <div style={{ fontSize: '7px', marginTop: '1px' }}>
                <span>Notes: </span>
                <span>{invoice.notes}</span>
              </div>
            )}
          </div>

          <div style={{ flex: '0 0 40%', textAlign: 'right', fontSize: '8px' }}>
            <div>
              <strong>Issue No : </strong>
              <strong>{invoice.invoice_no}</strong>
            </div>
            <div style={{ marginTop: '1px' }}>
              <span>Date : </span>
              <span>{formatDateDMY(invoice.invoice_date)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: '3px',
            fontSize: '8px',
          }}
        >
          <div style={{ flex: '1 1 58%' }}>
            <div>
              <span>To : </span>
              <strong style={{ textTransform: 'uppercase' }}>
                {customerName}
                {addressLines.length > 0 ? ',' : ''}
              </strong>
            </div>
            {addressLines.map((line, idx) => (
              <div key={idx} style={{ paddingLeft: '14px', textTransform: 'uppercase', fontSize: '7.5px' }}>
                {line}{idx < addressLines.length - 1 ? ',' : ''}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', marginTop: '2px', fontSize: '7.5px' }}>
              <div><strong>PH:</strong> {invoice.customer_phone || ''}</div>
              <div><strong>GST:</strong> {invoice.customer_gstin || ''}</div>
            </div>
          </div>

          <div style={{ flex: '0 0 40%', textAlign: 'right', fontSize: '8px' }}>
            <div>
              <strong>Bill No : </strong>
              <strong>{invoice.invoice_no || 'CR2954'}</strong>
            </div>
            <div style={{ marginTop: '1px' }}>
              <span>Date : </span>
              <span>{formatDateDMY(invoice.invoice_date) || '08/10/2026'}</span>
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
            fontSize: '7.5px',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ width: '8%', textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>#</th>
              <th style={{ width: '42%', textAlign: 'left', padding: '1px 2px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>Items</th>
              <th style={{ width: '15%', textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>SKU</th>
              <th style={{ width: '10%', textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>Qty</th>
              <th style={{ width: '12%', textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>Rate</th>
              <th style={{ width: '13%', textAlign: 'right', padding: '1px 2px', fontWeight: 'bold' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const qty = Number(item.qty || 0);
              const rate = Number(item.rate ?? item.unit_price ?? 0).toFixed(2);
              const amount = Number(item.line_total ?? item.net_amount ?? (qty * Number(rate))).toFixed(2);

              return (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000' }}>{idx + 1}</td>
                  <td style={{ textAlign: 'left', padding: '1px 2px', borderRight: '0.5px solid #000' }}>
                    {item.item_name_snapshot || item.item_name || ''}
                  </td>
                  <td style={{ textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000', fontFamily: 'monospace' }}>
                    {item.sku || item.item_code || '-'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                    {qty}
                  </td>
                  <td style={{ textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000' }}>
                    {rate}
                  </td>
                  <td style={{ textAlign: 'right', padding: '1px 2px' }}>
                    {amount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderTop: '1px solid #000',
            borderBottom: '1px solid #000',
            fontSize: '7.5px',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ width: '9%', textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                N.Rate
              </th>
              <th style={{ width: '25%', textAlign: 'left', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                Items
              </th>
              <th style={{ width: '10%', textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                HSN
              </th>
              <th style={{ width: '6%', textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                Qty
              </th>
              <th style={{ width: '5%', textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                Free
              </th>
              <th style={{ width: '9%', textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                MRP
              </th>
              <th style={{ width: '9%', textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                Rate
              </th>
              <th style={{ width: '7%', textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                GST%
              </th>
              <th style={{ width: '8%', textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000', fontWeight: 'bold' }}>
                GST
              </th>
              <th style={{ width: '12%', textAlign: 'right', padding: '1px', fontWeight: 'bold' }}>
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
                  <td style={{ textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000' }}>{nRate}</td>
                  <td
                    style={{
                      textAlign: 'left',
                      padding: '1px',
                      borderRight: '0.5px solid #000',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.item_name_snapshot || item.item_name || ''}
                  </td>
                  <td style={{ textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000' }}>
                    {item.hsn_snapshot || item.hsn_code || ''}
                  </td>
                  <td style={{ textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000' }}>{qty}</td>
                  <td style={{ textAlign: 'center', padding: '1px', borderRight: '0.5px solid #000' }}>{freeQty}</td>
                  <td style={{ textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000' }}>{mrp}</td>
                  <td style={{ textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000' }}>{rate}</td>
                  <td style={{ textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000' }}>{gstPercent}</td>
                  <td style={{ textAlign: 'right', padding: '1px', borderRight: '0.5px solid #000' }}>{gstAmount}</td>
                  <td style={{ textAlign: 'right', padding: '1px' }}>{amount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* 4. Totals & Tax Summary Section */}
      <div style={{ borderBottom: '1px solid #000', marginTop: '2px' }}>
        {/* Tot.Qty and Amount in Words */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1px 2px',
            borderBottom: '0.5px solid #000',
            fontSize: '7.5px',
          }}
        >
          <div>
            <strong>Tot.Qty : </strong>
            <strong>{formattedTotalQty}</strong>
          </div>
          <div style={{ fontWeight: 'bold', textAlign: 'right', wordBreak: 'break-word', maxWidth: '65%' }}>
            {wordsText}
          </div>
        </div>

        {/* Tax Slabs Breakdown Sub-table */}
        <div style={{ padding: '2px', borderBottom: '0.5px solid #000' }}>
          {isNonGst ? (
            <div style={{ fontSize: '7.5px', color: '#444', fontStyle: 'italic', padding: '2px 0' }}>
              Composition / Non-GST — No tax charged.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px', textAlign: 'right' }}>
              <thead>
                {isInterstate ? (
                  <tr>
                    <th style={{ textAlign: 'left', fontWeight: 'bold', padding: '1px' }}>IGST%</th>
                    <th style={{ fontWeight: 'bold', padding: '1px' }}>IGST</th>
                    <th style={{ fontWeight: 'bold', padding: '1px' }}>TOTAL</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ textAlign: 'left', fontWeight: 'bold', padding: '1px' }}>CGST%</th>
                    <th style={{ fontWeight: 'bold', padding: '1px' }}>CGST</th>
                    <th style={{ fontWeight: 'bold', padding: '1px' }}>SGST%</th>
                    <th style={{ fontWeight: 'bold', padding: '1px' }}>SGST</th>
                    <th style={{ fontWeight: 'bold', padding: '1px' }}>TOTAL</th>
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
                        <td style={{ textAlign: 'left', padding: '1px' }}>{Number(slab.gst_percent || 0).toFixed(2)}</td>
                        <td style={{ padding: '1px' }}>{totSlab}</td>
                        <td style={{ padding: '1px' }}>{totSlab}</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={i} style={{ fontWeight: 'bold' }}>
                      <td style={{ textAlign: 'left', padding: '1px' }}>{cgstPct}</td>
                      <td style={{ padding: '1px' }}>{cgstAmt}</td>
                      <td style={{ padding: '1px' }}>{sgstPct}</td>
                      <td style={{ padding: '1px' }}>{sgstAmt}</td>
                      <td style={{ padding: '1px' }}>{totSlab}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Gross Amt, Tot Tax Amt, Discount, Net Amount */}
        <div style={{ padding: '2px', fontSize: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Gross Amt :</span>
            <span>{grossAmount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tot Tax Amt :</span>
            <span>{isNonGst ? '0.00' : totalTax}</span>
          </div>
          {percentDiscountTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount (%) :</span>
              <span>{percentDiscountTotal.toFixed(2)}</span>
            </div>
          )}
          {rupeeDiscountTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '9px',
              borderTop: '0.5px solid #000',
              marginTop: '1px',
              paddingTop: '1px',
            }}
          >
            <span>Net Amount :</span>
            <span>{netAmount}</span>
          </div>
        </div>
      </div>

      {/* 5. Footer Signatures Area */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '10px 4px 2px 4px',
          fontSize: '7.5px',
          fontWeight: 'bold',
        }}
      >
        <div>Customer Signature and Seal</div>
        <div>For &nbsp;&nbsp;{companyName}</div>
      </div>
    </div>
  );
}
