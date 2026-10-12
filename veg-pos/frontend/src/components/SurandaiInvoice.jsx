import React from 'react';
import { formatINR, formatDateDMY } from '../utils/format';

export default function SurandaiInvoice({ bill, settings = {}, isCommissionView, lang = 'ta' }) {
  if (!bill) return null;

  // Decide format based on bill_type or user toggle
  const isCommission = isCommissionView !== undefined 
    ? isCommissionView 
    : bill.bill_type === 'commission';

  // Parse phone numbers from settings or fallback to defaults
  let phones = [];
  try {
    if (settings.phone_numbers) {
      phones = typeof settings.phone_numbers === 'string' 
        ? JSON.parse(settings.phone_numbers) 
        : settings.phone_numbers;
    }
  } catch (e) {
    phones = [];
  }
  if (!phones || phones.length === 0) {
    phones = ['9524495344', '9789639039'];
  }

  const shopNo1 = settings.shop_number || '10';
  const shopNo2 = settings.shop_number_2 || '';
  const companyNameTa = settings.company_name_ta || 'ஸ்ரீ கோயில் காய்கறி கமிஷன் ஏஜென்சி';
  const companyNameEn = settings.company_name_en || '';
  const address = settings.address_line1 || 'தினசரி மார்க்கெட், சுரண்டை.';
  const proprietor = settings.proprietor_name || 'V.S. ANBURAJ';
  const customerName = bill.party_name || bill.walkin_name || bill.customer_name || '';
  const billNo = bill.bill_no || (bill.id ? `B-${bill.id}` : '—');
  const billDate = formatDateDMY(bill.bill_date || bill.created_at || bill.invoice_date);

  // Calculations
  const itemsTotal = Number(bill.items_total !== undefined ? bill.items_total : (bill.subtotal !== undefined ? bill.subtotal : 0));
  const discountVal = Number(bill.discount_amount || bill.discount || 0);
  const prevBal = Number(bill.previous_balance !== undefined ? bill.previous_balance : (bill.prev_balance !== undefined ? bill.prev_balance : 0));
  const grandTotalVal = Number(bill.grand_total !== undefined ? bill.grand_total : (itemsTotal - discountVal + prevBal));
  const paidVal = Number(bill.paid_amount || 0);
  const balanceDueVal = Number(bill.balance_due !== undefined ? bill.balance_due : (grandTotalVal - paidVal));

  const commissionVal = Number(bill.commission_amount || 0);
  const commissionMode = bill.commission_mode || (bill.commission_percent !== null && bill.commission_percent !== undefined ? 'percentage' : 'fixed');
  const patthuVal = Number(bill.patthu_amount || 0);
  const cooliVal = Number(bill.cooli_amount || 0);
  const vadagaiVal = Number(bill.vadagai_amount || 0);
  const otherDeductionVal = Number(bill.other_deduction_amount || 0);
  const totalDeductionsVal = commissionVal + patthuVal + cooliVal + vadagaiVal + otherDeductionVal;
  const netTotalVal = itemsTotal - totalDeductionsVal;

  // Prepare line items
  const rawLines = bill.lines || bill.items || [];
  const minLines = isCommission ? 4 : 5;
  const lines = [...rawLines];
  while (lines.length < minLines) {
    lines.push({ is_empty: true, key: `empty-${lines.length}` });
  }

  // ==============================================================
  // 1. COMMISSION BILL FORMAT (Exact Mandi Slip Matching Image 2)
  // ==============================================================
  if (isCommission) {
    return (
      <div
        className="surandai-bhavani-template font-serif text-black bg-white p-2.5 max-w-[142mm] mx-auto border-[3px] border-blue-950 relative select-none shadow-sm"
        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
      >
        <div className="border border-blue-900 p-2">

          {/* Top Bar: Contact & Shop No */}
          <div className="flex justify-between items-start pb-1 border-b border-blue-950 text-xs">
            {/* Left Invocation / Logo */}
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 border border-blue-950 bg-blue-50 flex items-center justify-center p-0.5 rounded">
                <svg className="w-6 h-6 text-blue-950" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L10.5 4H8.5L7 2.5L5.5 4H4V7L2 9.5L4 12V15H5.5L7 16.5L8.5 15H10.5L12 17L13.5 15H15.5L17 16.5L18.5 15H20V12L22 9.5L20 7V4H18.5L17 2.5L15.5 4H13.5L12 2Z" opacity="0.3"/>
                  <circle cx="12" cy="7" r="2.5" />
                  <path d="M12 10.5c-2 0-3.5 1.2-3.5 2.5v4h7v-4c0-1.3-1.5-2.5-3.5-2.5z" />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="text-[10px] font-bold text-blue-950">ஸ்ரீ துணை</div>
                {proprietor && <div className="text-[10px] font-bold text-gray-800">Prop: {proprietor}</div>}
              </div>
            </div>

            {/* Right: Phone Numbers & Shop No */}
            <div className="text-right flex items-center gap-2">
              <div className="leading-tight text-[10px] font-bold text-blue-950">
                <div>CELL: <span className="font-mono">{phones[0]}</span></div>
                {phones[1] && <div><span className="font-mono">{phones[1]}</span></div>}
              </div>
              <div className="border border-blue-950 bg-white rounded text-center px-1.5 py-0.5 min-w-[42px]">
                <div className="text-[7.5px] font-bold text-blue-950 border-b border-blue-900 leading-tight">கடை எண்</div>
                <div className="text-base font-black text-red-600 leading-none pt-0.5">{shopNo1}</div>
              </div>
            </div>
          </div>

          {/* Business Title Banner */}
          <div className="text-center py-1">
            <h1 className="text-lg sm:text-xl font-black text-blue-950 tracking-wide uppercase font-sans">
              {companyNameTa}
            </h1>
            <div className="text-[11px] font-bold text-gray-800">
              {address}
            </div>
          </div>

          {/* Bill No, Date & Customer Line */}
          <div className="border-t-2 border-b-2 border-blue-950 py-1 px-1 my-1 flex justify-between items-center text-xs font-bold gap-2">
            <div className="flex-1 truncate">
              <span className="text-blue-950">திரு. </span>
              <span className="font-black border-b border-dotted border-black/70 px-1">{customerName || 'வாடிக்கையாளர்'}</span>
            </div>
            <div className="text-right shrink-0 flex items-center gap-3 font-mono text-[11px]">
              <div>BILL NO : <span className="font-bold">{billNo}</span></div>
              <div>DATE : <span className="font-bold">{billDate}</span></div>
            </div>
          </div>

          {/* Table (Columns matching Image 2: விலை | விபரம் | எண் | எடை | ரூ. பை) */}
          <table className="w-full border-collapse text-xs border-2 border-blue-950">
            <thead>
              <tr className="bg-blue-50 text-blue-950 border-b-2 border-blue-950 text-center font-bold">
                <th className="border-r border-blue-950 py-1 px-1 w-[18%]">விலை</th>
                <th className="border-r border-blue-950 py-1 px-1 w-[38%] text-left">விபரம்</th>
                <th className="border-r border-blue-950 py-1 px-1 w-[12%]">எண்</th>
                <th className="border-r border-blue-950 py-1 px-1 w-[14%]">எடை</th>
                <th className="py-1 px-1 w-[18%]">ரூ. &nbsp; பை</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, index) => {
                if (l.is_empty) {
                  return (
                    <tr key={`empty-${index}`} className="h-5.5 border-b border-blue-950/40">
                      <td className="border-r border-blue-950">&nbsp;</td>
                      <td className="border-r border-blue-950">&nbsp;</td>
                      <td className="border-r border-blue-950">&nbsp;</td>
                      <td className="border-r border-blue-950">&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  );
                }

                const itemName = l.item_name_ta || l.item_name_en || l.item_name || '';
                const nosStr = l.nos !== undefined && l.nos !== null ? l.nos : (l.bags !== undefined ? l.bags : '');
                const weightStr = l.weight !== undefined && l.weight !== null ? l.weight : (l.qty !== undefined ? l.qty : '');
                const rateVal = l.rate ? Number(l.rate).toFixed(2) : '';
                const amountVal = l.amount !== undefined ? Number(l.amount) : (l.line_total !== undefined ? Number(l.line_total) : 0);
                const amountRs = Math.floor(amountVal);
                const amountPaisa = Math.round((amountVal - amountRs) * 100);

                return (
                  <tr key={l.id || l.key || index} className="border-b border-blue-950/50 font-medium">
                    <td className="border-r border-blue-950 py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                      {rateVal}
                    </td>
                    <td className="border-r border-blue-950 py-0.5 px-2 text-left font-bold text-xs truncate">
                      {itemName}
                    </td>
                    <td className="border-r border-blue-950 py-0.5 px-1 text-center font-bold text-xs">
                      {nosStr}
                    </td>
                    <td className="border-r border-blue-950 py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                      {weightStr ? `${weightStr}` : ''}
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                      {amountVal > 0 ? `${amountVal.toFixed(2)}` : ''}
                    </td>
                  </tr>
                );
              })}

              {/* Commission Mandi Deductions Section (Left: Deductions, Right: Net Total) */}
              <tr className="border-t-2 border-blue-950">
                {/* Left Deductions Sub-table */}
                <td colSpan={3} className="border-r border-blue-950 p-1.5 align-top text-xs">
                  <div className="space-y-0.5 font-bold">
                    <div className="flex justify-between border-b border-dotted border-gray-300 pb-0.5">
                      <span className="text-red-700">கமிஷன் {commissionMode === 'percentage' && bill.commission_percent ? `(${Number(bill.commission_percent)}%)` : ''} :</span>
                      <span className="font-mono">{commissionVal > 0 ? commissionVal.toFixed(2) : '-'}</span>
                    </div>
                    {patthuVal > 0 && (
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-0.5">
                        <span className="text-red-700">பற்று :</span>
                        <span className="font-mono">{patthuVal.toFixed(2)}</span>
                      </div>
                    )}
                    {cooliVal > 0 && (
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-0.5">
                        <span className="text-red-700">கூலி :</span>
                        <span className="font-mono">{cooliVal.toFixed(2)}</span>
                      </div>
                    )}
                    {vadagaiVal > 0 && (
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-0.5">
                        <span className="text-red-700">வாடகை :</span>
                        <span className="font-mono">{vadagaiVal.toFixed(2)}</span>
                      </div>
                    )}
                    {otherDeductionVal > 0 && (
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-0.5">
                        <span className="text-red-700">பிற கழிவு :</span>
                        <span className="font-mono">{otherDeductionVal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-blue-950 text-slate-900">
                      <span>கழிவுகள் மொத்தம் :</span>
                      <span className="font-mono font-black">{totalDeductionsVal.toFixed(2)}</span>
                    </div>
                  </div>
                </td>

                {/* Right Amounts Sub-table */}
                <td colSpan={2} className="p-1.5 align-top text-xs">
                  <div className="space-y-1 font-bold text-right">
                    <div className="flex justify-between">
                      <span className="text-gray-600">விற்பனை:</span>
                      <span className="font-mono font-bold">{itemsTotal.toFixed(2)}</span>
                    </div>
                    {totalDeductionsVal > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>(-) கழிவு:</span>
                        <span className="font-mono font-bold">- {totalDeductionsVal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-blue-900 pt-1">
                      <span className="text-gray-800">நிகர தொகை:</span>
                      <span className="font-mono font-bold">{netTotalVal.toFixed(2)}</span>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Final Grand Total Row */}
              <tr className="bg-blue-100 border-t-2 border-blue-950 font-black text-sm">
                <td colSpan={3} className="border-r border-blue-950 py-1 px-2 text-right text-blue-950">
                  மொத்தம் ரூ =
                </td>
                <td colSpan={2} className="py-1 px-2 text-right font-mono font-black text-base text-blue-950">
                  {grandTotalVal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer note */}
          <div className="mt-1.5 flex justify-between items-center text-[9px] text-gray-700">
            <div>• Computerized Mandi Commission Invoice</div>
            <div>Inquiries: {phones.join(' / ')}</div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // 2. NORMAL BILL FORMAT (Retail / Wholesale Customer Receipt)
  // Clean format: NO Commission, NO Cooli, NO Vadagai on the side!
  // ==============================================================
  return (
    <div
      className="surandai-bhavani-template font-serif text-black bg-white p-2.5 max-w-[142mm] mx-auto border-[3px] border-blue-950 relative select-none shadow-sm"
      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      <div className="border border-blue-900 p-2">

        {/* Top Header */}
        <div className="text-center pb-1 border-b-2 border-blue-950">
          <div className="text-[10px] font-bold text-blue-900 tracking-wider">
            ஸ்ரீ துணை
          </div>
          <h1 className="text-lg sm:text-xl font-black text-blue-950 tracking-wide uppercase font-sans mt-0.5">
            {companyNameTa}
          </h1>
          {companyNameEn && (
            <div className="text-[10.5px] font-bold text-gray-700 uppercase tracking-wider">
              {companyNameEn}
            </div>
          )}
          <div className="text-[11px] font-bold text-gray-800 mt-0.5">
            {address} • Cell: <span className="font-mono">{phones.join(', ')}</span>
          </div>
        </div>

        {/* Bill Meta & Customer Info Bar */}
        <div className="flex justify-between items-center py-1 px-1 border-b-2 border-blue-950 text-xs font-bold gap-2">
          <div className="flex-1 truncate">
            <span className="text-blue-950">உயர்திரு : </span>
            <span className="font-black border-b border-dotted border-black/70 px-1">
              {customerName || 'வாடிக்கையாளர் (Walk-in)'}
            </span>
          </div>
          <div className="text-right shrink-0 flex items-center gap-3 font-mono text-[11px]">
            <div>பில் எண் : <span className="font-bold text-blue-950">{billNo}</span></div>
            <div>தேதி : <span className="font-bold">{billDate}</span></div>
          </div>
        </div>

        {/* Normal Bill Items Table (வ.எண் | விபரம் | விலை | எடை / அளவு | தொகை) */}
        <table className="w-full border-collapse text-xs border-2 border-blue-950 my-1">
          <thead>
            <tr className="bg-blue-100 text-blue-950 border-b-2 border-blue-950 text-center font-bold">
              <th className="border-r border-blue-950 py-1 px-1 w-[10%]">வ.எண்</th>
              <th className="border-r border-blue-950 py-1 px-2 w-[44%] text-left">விபரம் (Item)</th>
              <th className="border-r border-blue-950 py-1 px-1 w-[16%] text-right">விலை (₹)</th>
              <th className="border-r border-blue-950 py-1 px-1 w-[15%] text-center">அளவு / எடை</th>
              <th className="py-1 px-1.5 w-[15%] text-right">தொகை (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, index) => {
              if (l.is_empty) {
                return (
                  <tr key={`empty-${index}`} className="h-5.5 border-b border-blue-950/40">
                    <td className="border-r border-blue-950">&nbsp;</td>
                    <td className="border-r border-blue-950">&nbsp;</td>
                    <td className="border-r border-blue-950">&nbsp;</td>
                    <td className="border-r border-blue-950">&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                );
              }

              const itemName = l.item_name_ta || l.item_name_en || l.item_name || '';
              const unit = l.unit || 'kg';
              const qtyDisplay = l.is_charge_item 
                ? `${l.nos || 1} nos` 
                : `${l.weight || 1} ${unit}`;
              const rateVal = Number(l.rate || 0).toFixed(2);
              const amountVal = l.amount !== undefined ? Number(l.amount) : (l.line_total !== undefined ? Number(l.line_total) : 0);

              return (
                <tr key={l.id || l.key || index} className="border-b border-blue-950/50 font-medium">
                  <td className="border-r border-blue-950 py-0.5 px-1 text-center font-mono text-[11px] text-gray-600">
                    {index + 1}
                  </td>
                  <td className="border-r border-blue-950 py-0.5 px-2 text-left font-bold text-xs truncate">
                    {itemName}
                  </td>
                  <td className="border-r border-blue-950 py-0.5 px-1 text-right font-mono font-bold text-xs">
                    {rateVal}
                  </td>
                  <td className="border-r border-blue-950 py-0.5 px-1 text-center font-mono font-bold text-xs">
                    {qtyDisplay}
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                    {amountVal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Normal Bill Summary (2 Columns: Left Terms/Payment, Right Clean Totals) */}
        <div className="border-2 border-blue-950 flex flex-row">
          
          {/* Left Column: Payment & Terms */}
          <div className="w-[50%] border-r-2 border-blue-950 p-1.5 flex flex-col justify-between text-[10px]">
            <div className="space-y-1">
              <div>
                <span className="font-bold text-blue-950">செலுத்தும் முறை: </span>
                <span className="font-semibold text-slate-800">{bill.payment_method_name || 'கடன் / Credit'}</span>
              </div>
              <div>
                <span className="font-bold text-blue-950">உருப்படிகள்: </span>
                <span className="font-mono font-semibold">{rawLines.length} Items</span>
              </div>
              {bill.notes && (
                <div className="text-gray-600 italic">
                  குறிப்பு: {bill.notes}
                </div>
              )}
            </div>

            <div className="pt-2">
              <div className="font-bold text-blue-950">நன்றி! மீண்டும் வருக!</div>
              <div className="text-[9px] text-gray-600">• பொருட்கள் வாங்கியபின் திரும்ப பெறப்படமாட்டாது.</div>
            </div>
          </div>

          {/* Right Column: Standard Totals Summary */}
          <div className="w-[50%] p-1.5 font-bold text-xs">
            <div className="space-y-1 text-right">
              <div className="flex justify-between">
                <span className="text-gray-700">மொத்தத் தொகை:</span>
                <span className="font-mono font-bold">₹{itemsTotal.toFixed(2)}</span>
              </div>

              {discountVal > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>தள்ளுபடி / கழிவு:</span>
                  <span className="font-mono font-bold">- ₹{discountVal.toFixed(2)}</span>
                </div>
              )}

              {prevBal > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>பழைய பாக்கி:</span>
                  <span className="font-mono font-bold">+ ₹{prevBal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between border-t-2 border-blue-950 pt-1 text-sm text-blue-950 font-black bg-blue-50/50 px-1 -mx-1">
                <span>மொத்தம் (Grand Total):</span>
                <span className="font-mono font-black text-sm">₹{grandTotalVal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between pt-0.5 text-gray-800">
                <span>செலுத்தியது (Paid):</span>
                <span className="font-mono font-bold">₹{paidVal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-t border-dotted border-gray-400 pt-0.5 text-red-700">
                <span>மீதி பாக்கி (Balance Due):</span>
                <span className="font-mono font-black">₹{balanceDueVal.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Disclaimer */}
        <div className="mt-1 flex justify-between items-center text-[8.5px] text-gray-600 pt-0.5">
          <div>• Computerized POS Invoice • Page 1 of 1</div>
          <div>Authorized Signature</div>
        </div>

      </div>
    </div>
  );
}
