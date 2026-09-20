/**
 * Mirrors InvoiceModel::priceLine / computeTotals on the backend so the cart
 * shows live totals before saving. The server recomputes authoritatively on
 * every create/update/complete call — this is display-only.
 */
export function priceLine(item, input) {
  const qty = Number(input.qty || 0);
  const rate = input.rate !== undefined && input.rate !== '' ? Number(input.rate) : Number(item.retail_price);
  const gross = round2(qty * rate);

  const discountPercent = Number(input.discount_percent || 0);
  const discountAmount = input.discount_amount !== undefined && input.discount_amount !== ''
    ? Number(input.discount_amount)
    : round2((gross * discountPercent) / 100);

  const taxable = round2(gross - discountAmount);
  const taxPercent = Number(item.gst_percent || 0);
  const taxAmount = round2((taxable * taxPercent) / 100);
  const cessPercent = Number(item.cess_percent || 0);
  const cessAmount = cessPercent > 0 ? round2((taxable * cessPercent) / 100) : 0;

  return {
    qty,
    free_qty: Number(input.free_qty || 0),
    rate,
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    tax_percent: taxPercent,
    tax_amount: taxAmount,
    cess_amount: cessAmount,
    line_total: taxable,
    gross,
  };
}

export function computeCartTotals(lines) {
  let subtotal = 0;
  let discountAmount = 0;
  let taxableValue = 0;
  let taxAmount = 0;
  let cessAmount = 0;

  for (const line of lines) {
    subtotal += line.gross;
    discountAmount += line.discount_amount;
    taxableValue += line.line_total;
    taxAmount += line.tax_amount;
    cessAmount += line.cess_amount;
  }

  const cgst = round2(taxAmount / 2);
  const sgst = round2(taxAmount - cgst);
  const rawTotal = taxableValue + taxAmount + cessAmount;
  const grandTotal = Math.round(rawTotal);
  const roundOff = round2(grandTotal - rawTotal);

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    taxableValue: round2(taxableValue),
    cgst,
    sgst,
    cessAmount: round2(cessAmount),
    roundOff,
    grandTotal,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
