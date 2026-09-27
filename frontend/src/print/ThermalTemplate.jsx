export function ThermalTemplate({ data }) {
  const { invoice, branch, tax_slabs: taxSlabs, amount_in_words: amountInWords, customer_outstanding: outstanding } = data;
  const isGst = invoice.bill_type !== 'non_gst';

  return (
    <div className="thermal-invoice">
      <div style={{ textAlign: 'center' }}>
        <strong>{branch.print_name}</strong>
        <div>{branch.address_line1}, {branch.city}</div>
        <div>Ph: {branch.phone}</div>
        {branch.gstin && <div>GSTIN: {branch.gstin}</div>}
      </div>
      <hr />
      <div>Bill No: {invoice.invoice_no || 'HELD'}</div>
      {invoice.price_type && invoice.price_type !== 'normal' && (
        <div style={{ fontWeight: 'bold' }}>{invoice.price_type === 'wholesale' ? 'WHOLESALE PRICING' : 'RETAIL PRICING'}</div>
      )}
      <div>Date: {invoice.invoice_date} {invoice.vehicle_no ? `Veh: ${invoice.vehicle_no}` : ''}</div>
      <div>Customer: {invoice.customer_name || 'Walk-in'}</div>
      <hr />
      <table>
        <thead>
          <tr>
            <td>Item</td>
            <td>Qty</td>
            <td>NET RATE</td>
            <td style={{ textAlign: 'right' }}>NET AMT</td>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td colSpan={4}>{item.item_name_snapshot}{item.free_qty > 0 ? ` (+${item.free_qty} free)` : ''}</td>
            </tr>
          ))}
          {invoice.items.map((item) => (
            <tr key={`amt-${item.id}`}>
              <td></td>
              <td>{item.qty} {item.unit_code}</td>
              <td>{item.rate}</td>
              <td style={{ textAlign: 'right' }}>{item.line_total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      {isGst && taxSlabs.map((slab) => (
        <div key={slab.gst_percent} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>GST {slab.gst_percent}% (CGST {slab.cgst} + SGST {slab.sgst})</span>
        </div>
      ))}
      {isGst && <hr />}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Taxable</span><span>{invoice.taxable_value}</span>
      </div>
      {isGst && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Tax</span><span>{(Number(invoice.cgst_amount) + Number(invoice.sgst_amount)).toFixed(2)}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Round off</span><span>{invoice.round_off}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
        <span>NET TOTAL</span><span>Rs. {invoice.grand_total}</span>
      </div>
      <hr />
      <div>{amountInWords}</div>
      {outstanding !== null && outstanding !== undefined && (
        <div>Outstanding balance: Rs. {outstanding}</div>
      )}
      <div style={{ textAlign: 'center', marginTop: 6 }}>Thank you, visit again!</div>
    </div>
  );
}
