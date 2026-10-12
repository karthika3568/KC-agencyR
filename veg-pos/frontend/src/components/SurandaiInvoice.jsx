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
    phones = ['9659580845', '9488103983', '9789767576'];
  }

  const phone1 = phones[0] || '9659580845';
  const phone2 = phones[1] || '9488103983';
  const phone3 = phones[2] || '9789767576';

  const shopNo1 = settings.shop_number || '14';
  const shopNo2 = settings.shop_number_2 || '15';
  const companyNameTa = settings.company_name_ta || 'ஸ்ரீ பவானி காய்கனி கமிஷன் வியாபாரம்';
  const address = settings.address_line1 || 'தினசரி மார்க்கெட்';
  const location = settings.address_line2 || 'சுரண்டை.';
  const proprietor = settings.proprietor_name || 'பவானி சங்கர்';
  const god1 = settings.god_name_1 || 'ஸ்ரீ பவானி அம்மன் துணை';
  const god2 = settings.god_name_2 || 'ஸ்ரீ பொட்டல் மாடசாமி';
  const brandLogo = settings.logo_brand || 'VTC';

  const customerName = bill.party_name || bill.walkin_name || bill.customer_name || '';
  const billNo = bill.bill_no || (bill.id ? `B-${bill.id}` : '—');
  
  // Format Date as DD.MM.YYYY matching South Indian physical bills
  const rawDate = bill.bill_date || bill.created_at || bill.invoice_date;
  let formattedDate = '';
  if (rawDate) {
    const d = new Date(rawDate.length <= 10 ? rawDate + 'T00:00:00' : rawDate);
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      formattedDate = `${dd}.${mm}.${yyyy}`;
    } else {
      formattedDate = rawDate;
    }
  }

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
  const minLines = isCommission ? 6 : 6;
  const lines = [...rawLines];
  while (lines.length < minLines) {
    lines.push({ is_empty: true, key: `empty-${lines.length}` });
  }

  // Split amount into Rupees and Paisa
  function splitRsPaisa(val) {
    if (val === undefined || val === null || val === '' || isNaN(val) || Number(val) === 0) {
      return { rs: '', paisa: '' };
    }
    const num = Number(val);
    const rs = Math.floor(Math.abs(num));
    const paisa = Math.round((Math.abs(num) - rs) * 100);
    const paisaStr = paisa > 0 ? String(paisa).padStart(2, '0') : '00';
    return {
      rs: (num < 0 ? '-' : '') + rs.toString(),
      paisa: paisaStr
    };
  }

  // ==============================================================
  // 1. COMMISSION BILL FORMAT (Exact Mandi Slip Matching User Image)
  // ==============================================================
  if (isCommission) {
    return (
      <div
        className="surandai-bhavani-template font-serif text-black bg-white p-2.5 max-w-[142mm] mx-auto border-[2.5px] border-[#0e6037] relative select-none shadow-sm"
        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
      >
        <div className="border border-[#0e6037] p-1.5">

          {/* Top Contact Bar */}
          <div className="flex justify-between items-start pb-1 text-[11px] font-bold text-slate-900 leading-tight">
            <div>
              <span>{proprietor} : </span>
              <span className="font-mono">{phone1}</span>
            </div>
            <div className="text-right">
              <div>Cell : <span className="font-mono">{phone2}</span></div>
              <div className="font-mono pl-7">{phone3}</div>
            </div>
          </div>

          <div className="border-t-[1.5px] border-[#0e6037] my-1" />

          {/* Deity Header & Shop Number Bar */}
          <div className="text-center font-bold text-[#0e6037] text-xs tracking-wide">
            {god1}
          </div>

          {/* Deity Pictures, Shop Numbers & Center VTC Logo */}
          <div className="flex items-center justify-between my-1 px-1">
            
            {/* Left Shop No Box */}
            <div className="border-2 border-[#0e6037] rounded overflow-hidden text-center w-11 shadow-xs">
              <div className="bg-[#0e6037] text-white text-[8px] font-bold py-0.5 leading-none">
                கடை எண்
              </div>
              <div className="text-xl font-black text-red-600 py-0.5 leading-none font-sans">
                {shopNo1}
              </div>
            </div>

            {/* Left Deity Photo (Amman) */}
            <div className="flex justify-center items-center px-1">
              <img
                src="/images/god-amman.png"
                alt="ஸ்ரீ பவானி அம்மன்"
                className="h-16 w-auto max-w-[50px] object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            {/* Center Brand Title & Oval Logo */}
            <div className="text-center flex-1 px-1">
              <div className="text-[9px] font-bold text-slate-800 leading-tight">
                {god1}
              </div>
              <div className="text-[9px] font-bold text-slate-800 leading-tight">
                {god2}
              </div>
              
              {/* Red Oval VTC Logo */}
              <div className="my-1 inline-block">
                <span className="inline-block bg-[#dc2626] text-white font-serif font-black text-lg px-4 py-0.5 rounded-full tracking-wider shadow-sm border border-red-700 leading-tight">
                  {brandLogo}
                </span>
              </div>
            </div>

            {/* Right Deity Photo (Maadasamy) */}
            <div className="flex justify-center items-center px-1">
              <img
                src="/images/god-maadasamy.png"
                alt="ஸ்ரீ பொட்டல் மாடசாமி"
                className="h-16 w-auto max-w-[45px] object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            {/* Right Shop No Box */}
            <div className="border-2 border-[#0e6037] rounded overflow-hidden text-center w-11 shadow-xs">
              <div className="bg-[#0e6037] text-white text-[8px] font-bold py-0.5 leading-none">
                கடை எண்
              </div>
              <div className="text-xl font-black text-red-600 py-0.5 leading-none font-sans">
                {shopNo2}
              </div>
            </div>

          </div>

          {/* Main Shop Name */}
          <div className="text-center mt-0.5 mb-0.5">
            <h1 className="text-xl font-black text-red-600 tracking-wide font-sans leading-tight">
              {companyNameTa}
            </h1>
            <div className="text-xs font-bold text-[#0e6037] tracking-wider leading-tight">
              {address}, {location}
            </div>
          </div>

          {/* Customer & Date Line */}
          <div className="border-t border-b border-[#0e6037] py-1 px-1 my-1 flex justify-between items-center text-xs font-bold">
            <div className="flex-1 truncate">
              <span className="text-[#0e6037]">உயர்திரு </span>
              <span className="font-bold border-b border-dotted border-black/80 px-1 inline-block min-w-[120px]">
                {customerName}
              </span>
            </div>
            <div className="text-right shrink-0 font-bold text-slate-900 text-[11px]">
              <span>தேதி : </span>
              <span className="font-mono">{formattedDate}</span>
            </div>
          </div>

          {/* Mandi Items Table matching image */}
          <table className="w-full border-collapse text-xs border border-[#0e6037]">
            <thead>
              <tr className="bg-[#e6f4ea] text-[#0e6037] border-b border-[#0e6037] text-center font-bold">
                <th className="border-r border-[#0e6037] py-1 px-1.5 w-[50%] text-center">விவரம்</th>
                <th className="border-r border-[#0e6037] py-1 px-1 w-[20%] text-center">எண்ணம்</th>
                <th className="border-r border-[#0e6037] py-1 px-1 w-[20%] text-center">ரூ.</th>
                <th className="py-1 px-0.5 w-[10%] text-center">பை</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, index) => {
                if (l.is_empty) {
                  return (
                    <tr key={`empty-${index}`} className="h-6 border-b border-[#0e6037]/30">
                      <td className="border-r border-[#0e6037]">&nbsp;</td>
                      <td className="border-r border-[#0e6037]">&nbsp;</td>
                      <td className="border-r border-[#0e6037]">&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  );
                }

                const itemName = l.item_name_ta || l.item_name_en || l.item_name || '';
                const rateVal = l.rate ? Number(l.rate) : 0;
                const weightVal = l.weight !== undefined && l.weight !== null ? l.weight : (l.qty !== undefined ? l.qty : '');
                const nosVal = l.nos !== undefined && l.nos !== null ? l.nos : (l.bags !== undefined ? l.bags : '');
                
                // Notation like "60. எள்ளு — 6" if rate and weight are present
                let displayDesc = itemName;
                if (rateVal > 0 && weightVal) {
                  displayDesc = `${Math.round(rateVal)}. ${itemName} — ${weightVal}`;
                }

                const amountVal = l.amount !== undefined ? Number(l.amount) : (l.line_total !== undefined ? Number(l.line_total) : 0);
                const { rs, paisa } = splitRsPaisa(amountVal);

                return (
                  <tr key={l.id || l.key || index} className="border-b border-[#0e6037]/40 font-medium">
                    <td className="border-r border-[#0e6037] py-0.5 px-2 text-left font-bold text-xs truncate">
                      {displayDesc}
                    </td>
                    <td className="border-r border-[#0e6037] py-0.5 px-1 text-center font-bold text-xs">
                      {nosVal}
                    </td>
                    <td className="border-r border-[#0e6037] py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                      {rs}
                    </td>
                    <td className="py-0.5 px-1 text-center font-mono font-bold text-xs">
                      {paisa}
                    </td>
                  </tr>
                );
              })}

              {/* Deduction intermediate line if commission exists */}
              {totalDeductionsVal > 0 && (
                <tr className="border-b border-[#0e6037] bg-gray-50/70 font-bold">
                  <td className="border-r border-[#0e6037] py-0.5 px-2 text-right text-gray-500 italic" colSpan={2}>
                    -
                  </td>
                  <td className="border-r border-[#0e6037] py-0.5 px-1.5 text-right font-mono text-red-600 text-xs">
                    - {Math.floor(totalDeductionsVal)}
                  </td>
                  <td className="py-0.5 px-1 text-center font-mono text-red-600 text-xs">
                    {splitRsPaisa(totalDeductionsVal).paisa}
                  </td>
                </tr>
              )}

              {/* Net Subtotal row before breakdown */}
              <tr className="border-b-2 border-[#0e6037] font-black bg-white">
                <td className="border-r border-[#0e6037] py-1 px-2" colSpan={2}>
                  &nbsp;
                </td>
                <td className="border-r border-[#0e6037] py-1 px-1.5 text-right font-mono text-sm text-slate-900">
                  {Math.floor(netTotalVal)}
                </td>
                <td className="py-1 px-1 text-center font-mono text-sm text-slate-900">
                  {splitRsPaisa(netTotalVal).paisa}
                </td>
              </tr>

              {/* Commission Mandi Breakdown Box */}
              <tr className="border-b border-[#0e6037]">
                <td className="border-r border-[#0e6037] py-0.5 px-2 text-right font-bold text-red-700">
                  கமிஷன்
                </td>
                <td className="border-r border-[#0e6037] py-0.5 px-1 text-right font-mono font-bold text-xs">
                  {commissionVal > 0 ? commissionVal.toFixed(2) : ''}
                </td>
                <td className="border-r border-[#0e6037] py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                  {/* Empty cell matching image structure */}
                </td>
                <td className="py-0.5 px-1 text-center font-mono font-bold text-xs">
                </td>
              </tr>

              <tr className="border-b border-[#0e6037]">
                <td className="border-r border-[#0e6037] py-0.5 px-2 text-right font-bold text-red-700">
                  பற்று
                </td>
                <td className="border-r border-[#0e6037] py-0.5 px-1 text-right font-mono font-bold text-xs">
                  {patthuVal > 0 ? patthuVal.toFixed(2) : ''}
                </td>
                <td className="border-r border-[#0e6037] py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                </td>
                <td className="py-0.5 px-1 text-center font-mono font-bold text-xs">
                </td>
              </tr>

              <tr className="border-b border-[#0e6037]">
                <td className="border-r border-[#0e6037] py-0.5 px-2 text-right font-bold text-red-700">
                  கூலி
                </td>
                <td className="border-r border-[#0e6037] py-0.5 px-1 text-right font-mono font-bold text-xs">
                  {cooliVal > 0 ? cooliVal.toFixed(2) : ''}
                </td>
                <td className="border-r border-[#0e6037] py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                </td>
                <td className="py-0.5 px-1 text-center font-mono font-bold text-xs">
                </td>
              </tr>

              <tr className="border-b border-[#0e6037]">
                <td className="border-r border-[#0e6037] py-0.5 px-2 text-right font-bold text-red-700">
                  வாடகை
                </td>
                <td className="border-r border-[#0e6037] py-0.5 px-1 text-right font-mono font-bold text-xs">
                  {vadagaiVal > 0 ? vadagaiVal.toFixed(2) : ''}
                </td>
                <td className="border-r border-[#0e6037] py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                </td>
                <td className="py-0.5 px-1 text-center font-mono font-bold text-xs">
                </td>
              </tr>

              {/* Grand Total Row */}
              <tr className="font-black bg-[#e6f4ea] border-t-2 border-[#0e6037]">
                <td className="border-r border-[#0e6037] py-1 px-2 text-right font-black text-sm text-[#0e6037]">
                  மொத்தம்
                </td>
                <td className="border-r border-[#0e6037] py-1 px-1 text-right font-mono font-black text-sm text-[#0e6037]">
                  {netTotalVal.toFixed(2)}
                </td>
                <td className="border-r border-[#0e6037] py-1 px-1.5 text-right font-mono font-black text-sm text-[#0e6037]">
                </td>
                <td className="py-1 px-1 text-center font-mono font-black text-sm text-[#0e6037]">
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer Section matching user image */}
          <div className="mt-2 flex items-center justify-between text-[9px] gap-2">
            
            {/* Left Thank You Box */}
            <div className="border border-[#0e6037] rounded px-2 py-1 text-center leading-tight">
              <div className="font-bold text-[#0e6037]">நன்றி! மீண்டும் வருக!</div>
              <div className="text-[8px] font-semibold text-slate-700">• Thank You!</div>
              <div className="text-[8px] font-semibold text-slate-700">Visit Again!</div>
            </div>

            {/* Right POS / GST Notes */}
            <div className="text-right leading-tight text-slate-700">
              <div>• Computerized POS Invoice • GSTIN: __________________</div>
              <div>• This is a computer-generated invoice. No signature required.</div>
            </div>

          </div>

          {/* Bottom Inquiries & Terms */}
          <div className="mt-1 text-center text-[8.5px] text-slate-600 border-t border-dotted border-gray-300 pt-0.5">
            <div>Terms: Goods once sold will not be taken back.</div>
            <div>• For inquiries: {phone1} / {phone2}</div>
          </div>

        </div>
      </div>
    );
  }

  // ==============================================================
  // 2. NORMAL BILL FORMAT (Enhanced for Retail / Wholesale)
  // Preserves same sacred temple banner & contacts, clean itemized totals
  // ==============================================================
  return (
    <div
      className="surandai-bhavani-template font-serif text-black bg-white p-2.5 max-w-[142mm] mx-auto border-[2.5px] border-[#0e6037] relative select-none shadow-sm"
      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      <div className="border border-[#0e6037] p-1.5">

        {/* Top Contact Bar */}
        <div className="flex justify-between items-start pb-1 text-[11px] font-bold text-slate-900 leading-tight">
          <div>
            <span>{proprietor} : </span>
            <span className="font-mono">{phone1}</span>
          </div>
          <div className="text-right">
            <div>Cell : <span className="font-mono">{phone2}</span></div>
            <div className="font-mono pl-7">{phone3}</div>
          </div>
        </div>

        <div className="border-t-[1.5px] border-[#0e6037] my-1" />

        {/* Deity Header & Shop Number Bar */}
        <div className="text-center font-bold text-[#0e6037] text-xs tracking-wide">
          {god1}
        </div>

        {/* Deity Pictures, Shop Numbers & Center VTC Logo */}
        <div className="flex items-center justify-between my-1 px-1">
          
          {/* Left Shop No Box */}
          <div className="border-2 border-[#0e6037] rounded overflow-hidden text-center w-11 shadow-xs">
            <div className="bg-[#0e6037] text-white text-[8px] font-bold py-0.5 leading-none">
              கடை எண்
            </div>
            <div className="text-xl font-black text-red-600 py-0.5 leading-none font-sans">
              {shopNo1}
            </div>
          </div>

          {/* Left Deity Photo (Amman) */}
          <div className="flex justify-center items-center px-1">
            <img
              src="/images/god-amman.png"
              alt="ஸ்ரீ பவானி அம்மன்"
              className="h-16 w-auto max-w-[50px] object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Center Brand Title & Oval Logo */}
          <div className="text-center flex-1 px-1">
            <div className="text-[9px] font-bold text-slate-800 leading-tight">
              {god1}
            </div>
            <div className="text-[9px] font-bold text-slate-800 leading-tight">
              {god2}
            </div>
            
            {/* Red Oval VTC Logo */}
            <div className="my-1 inline-block">
              <span className="inline-block bg-[#dc2626] text-white font-serif font-black text-lg px-4 py-0.5 rounded-full tracking-wider shadow-sm border border-red-700 leading-tight">
                {brandLogo}
              </span>
            </div>
          </div>

          {/* Right Deity Photo (Maadasamy) */}
          <div className="flex justify-center items-center px-1">
            <img
              src="/images/god-maadasamy.png"
              alt="ஸ்ரீ பொட்டல் மாடசாமி"
              className="h-16 w-auto max-w-[45px] object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Right Shop No Box */}
          <div className="border-2 border-[#0e6037] rounded overflow-hidden text-center w-11 shadow-xs">
            <div className="bg-[#0e6037] text-white text-[8px] font-bold py-0.5 leading-none">
              கடை எண்
            </div>
            <div className="text-xl font-black text-red-600 py-0.5 leading-none font-sans">
              {shopNo2}
            </div>
          </div>

        </div>

        {/* Main Shop Name */}
        <div className="text-center mt-0.5 mb-0.5">
          <h1 className="text-xl font-black text-red-600 tracking-wide font-sans leading-tight">
            {companyNameTa}
          </h1>
          <div className="text-xs font-bold text-[#0e6037] tracking-wider leading-tight">
            {address}, {location}
          </div>
        </div>

        {/* Customer & Bill No Bar */}
        <div className="border-t border-b border-[#0e6037] py-1 px-1 my-1 flex justify-between items-center text-xs font-bold">
          <div className="flex-1 truncate">
            <span className="text-[#0e6037]">உயர்திரு : </span>
            <span className="font-bold border-b border-dotted border-black/80 px-1 inline-block min-w-[120px]">
              {customerName || 'வாடிக்கையாளர்'}
            </span>
          </div>
          <div className="text-right shrink-0 flex items-center gap-2 font-bold text-[11px]">
            <div>பில்: <span className="font-mono">{billNo}</span></div>
            <div>• தேதி: <span className="font-mono">{formattedDate}</span></div>
          </div>
        </div>

        {/* Normal Bill Items Table */}
        <table className="w-full border-collapse text-xs border border-[#0e6037]">
          <thead>
            <tr className="bg-[#e6f4ea] text-[#0e6037] border-b border-[#0e6037] text-center font-bold">
              <th className="border-r border-[#0e6037] py-1 px-1 w-[8%]">வ.எண்</th>
              <th className="border-r border-[#0e6037] py-1 px-2 w-[46%] text-left">விவரம் (Item)</th>
              <th className="border-r border-[#0e6037] py-1 px-1 w-[14%] text-center">அளவு / எடை</th>
              <th className="border-r border-[#0e6037] py-1 px-1 w-[16%] text-right">விலை (₹)</th>
              <th className="py-1 px-1.5 w-[16%] text-right">தொகை (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, index) => {
              if (l.is_empty) {
                return (
                  <tr key={`empty-${index}`} className="h-6 border-b border-[#0e6037]/30">
                    <td className="border-r border-[#0e6037]">&nbsp;</td>
                    <td className="border-r border-[#0e6037]">&nbsp;</td>
                    <td className="border-r border-[#0e6037]">&nbsp;</td>
                    <td className="border-r border-[#0e6037]">&nbsp;</td>
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
                <tr key={l.id || l.key || index} className="border-b border-[#0e6037]/40 font-medium">
                  <td className="border-r border-[#0e6037] py-0.5 px-1 text-center font-mono text-[11px] text-gray-600">
                    {index + 1}
                  </td>
                  <td className="border-r border-[#0e6037] py-0.5 px-2 text-left font-bold text-xs truncate">
                    {itemName}
                  </td>
                  <td className="border-r border-[#0e6037] py-0.5 px-1 text-center font-mono font-bold text-xs">
                    {qtyDisplay}
                  </td>
                  <td className="border-r border-[#0e6037] py-0.5 px-1 text-right font-mono font-bold text-xs">
                    {rateVal}
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-mono font-bold text-xs">
                    {amountVal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Normal Bill Bottom Summary (Clean 2-Column Layout) */}
        <div className="border-t-2 border-[#0e6037] mt-1 pt-1 flex flex-row justify-between items-start text-xs">
          
          {/* Left: Payment info & Note */}
          <div className="w-[45%] text-[10px] space-y-1">
            <div>
              <span className="font-bold text-[#0e6037]">செலுத்தும் முறை: </span>
              <span className="font-semibold">{bill.payment_method_name || 'ரொக்கம் / Cash'}</span>
            </div>
            <div>
              <span className="font-bold text-[#0e6037]">மொத்த உருப்படிகள்: </span>
              <span className="font-mono font-bold">{rawLines.length} Items</span>
            </div>
            {bill.notes && (
              <div className="text-gray-600 italic">
                குறிப்பு: {bill.notes}
              </div>
            )}
          </div>

          {/* Right: Totals Breakdown */}
          <div className="w-[50%] font-bold text-xs space-y-0.5">
            <div className="flex justify-between">
              <span className="text-gray-700">விற்பனை தொகை:</span>
              <span className="font-mono">₹{itemsTotal.toFixed(2)}</span>
            </div>

            {discountVal > 0 && (
              <div className="flex justify-between text-red-600">
                <span>தள்ளுபடி:</span>
                <span className="font-mono">- ₹{discountVal.toFixed(2)}</span>
              </div>
            )}

            {prevBal > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>பழைய பாக்கி:</span>
                <span className="font-mono">+ ₹{prevBal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-b border-[#0e6037] py-0.5 bg-[#e6f4ea] text-sm text-[#0e6037] font-black px-1">
              <span>மொத்தம்:</span>
              <span className="font-mono">₹{grandTotalVal.toFixed(2)}</span>
            </div>

            {paidVal > 0 && (
              <div className="flex justify-between pt-0.5 text-slate-800">
                <span>செலுத்தியது:</span>
                <span className="font-mono">₹{paidVal.toFixed(2)}</span>
              </div>
            )}

            {balanceDueVal > 0 && (
              <div className="flex justify-between text-red-700">
                <span>மீதி பாக்கி:</span>
                <span className="font-mono font-black">₹{balanceDueVal.toFixed(2)}</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer Section */}
        <div className="mt-2 flex items-center justify-between text-[9px] gap-2">
          
          {/* Left Thank You Box */}
          <div className="border border-[#0e6037] rounded px-2 py-1 text-center leading-tight">
            <div className="font-bold text-[#0e6037]">நன்றி! மீண்டும் வருக!</div>
            <div className="text-[8px] font-semibold text-slate-700">• Thank You!</div>
            <div className="text-[8px] font-semibold text-slate-700">Visit Again!</div>
          </div>

          {/* Right POS / GST Notes */}
          <div className="text-right leading-tight text-slate-700">
            <div>• Computerized POS Invoice • GSTIN: __________________</div>
            <div>• This is a computer-generated invoice. No signature required.</div>
          </div>

        </div>

        {/* Bottom Inquiries & Terms */}
        <div className="mt-1 text-center text-[8.5px] text-slate-600 border-t border-dotted border-gray-300 pt-0.5">
          <div>Terms: Goods once sold will not be taken back.</div>
          <div>• For inquiries: {phone1} / {phone2}</div>
        </div>

      </div>
    </div>
  );
}
