import React from 'react';
import { formatINR, formatDateDMY } from '../utils/format';
import { useSettings } from '../hooks/useSettings';

export default function SurandaiInvoice({ bill, settings = {}, isCommissionView, lang = 'ta' }) {
  if (!bill) return null;

  // Retrieve global settings from SettingsContext or localStorage
  let globalSettings = {};
  try {
    const hook = useSettings?.();
    if (hook && hook.settings) {
      globalSettings = hook.settings;
    }
  } catch (e) {
    // Graceful fallback outside provider
  }
  if (!globalSettings || Object.keys(globalSettings).length === 0) {
    try {
      const cached = localStorage.getItem('veg_pos_settings');
      if (cached) globalSettings = JSON.parse(cached);
    } catch (e) {}
  }

  // Merge explicitly passed settings with global settings
  const effectiveSettings = { ...(globalSettings || {}), ...(settings || {}) };

  // Decide format based on bill_type or user toggle
  const isCommission = isCommissionView !== undefined 
    ? isCommissionView 
    : bill.bill_type === 'commission';

  // Parse phone numbers dynamically from settings
  let phones = [];
  try {
    const rawPhones = effectiveSettings.phone_numbers;
    if (rawPhones) {
      if (typeof rawPhones === 'string') {
        const trimmed = rawPhones.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          phones = JSON.parse(trimmed);
        } else {
          phones = trimmed.split(/[,/|;\n]+/).map((s) => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(rawPhones)) {
        phones = rawPhones;
      }
    }
  } catch (e) {
    phones = [];
  }

  // Also check individual phone fields if array was empty
  if (!phones || phones.length === 0) {
    [effectiveSettings.phone, effectiveSettings.phone_1, effectiveSettings.phone_2, effectiveSettings.phone_3, effectiveSettings.mobile]
      .filter(Boolean)
      .forEach((p) => phones.push(p));
  }

  // Fallback defaults only if settings have completely never been configured
  const hasConfiguredSettings = Boolean(
    effectiveSettings.company_name_ta ||
    effectiveSettings.company_name_en ||
    effectiveSettings.proprietor_name ||
    effectiveSettings.phone_numbers
  );

  if (!phones || phones.length === 0) {
    phones = hasConfiguredSettings ? [] : ['9659580845', '9488103983', '9789767576'];
  }

  const phone1 = phones[0] || '';
  const phone2 = phones[1] || '';
  const phone3 = phones[2] || '';

  const shopNo1 = effectiveSettings.shop_number || (hasConfiguredSettings ? '' : '14');
  const shopNo2 = effectiveSettings.shop_number_2 || (hasConfiguredSettings ? '' : '15');
  const companyNameTa = effectiveSettings.company_name_ta || effectiveSettings.company_name || effectiveSettings.shop_name || 'ஸ்ரீ பவானி காய்கனி கமிஷன் வியாபாரம்';
  const companyNameEn = effectiveSettings.company_name_en || effectiveSettings.company_name || '';
  const displayName = lang === 'en' ? (companyNameEn || companyNameTa) : (companyNameTa || companyNameEn);
  const address = effectiveSettings.address_line1 || (hasConfiguredSettings ? '' : 'தினசரி மார்க்கெட்');
  const location = effectiveSettings.address_line2 || (hasConfiguredSettings ? '' : 'சுரண்டை.');
  const proprietor = effectiveSettings.proprietor_name || effectiveSettings.owner_name || (hasConfiguredSettings ? '' : 'பவானி சங்கர்');
  const god1 = effectiveSettings.god_name_1 !== undefined && effectiveSettings.god_name_1 !== null ? effectiveSettings.god_name_1 : 'ஸ்ரீ பவானி அம்மன் துணை';
  const god2 = effectiveSettings.god_name_2 !== undefined && effectiveSettings.god_name_2 !== null ? effectiveSettings.god_name_2 : 'ஸ்ரீ பொட்டல் மாடசாமி';
  const brandLogo = effectiveSettings.logo_brand !== undefined && effectiveSettings.logo_brand !== null ? effectiveSettings.logo_brand : 'VTC';
  const footerNote = effectiveSettings.footer_note || 'நன்றி! மீண்டும் வருக!';
  const gstin = effectiveSettings.gstin || effectiveSettings.gst_no || '';

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
  const todayBillTotal = Math.max(0, itemsTotal - discountVal);
  const paidVal = Number(bill.paid_amount || 0);
  const paidForOldBalance = prevBal > 0 ? Math.max(0, Math.min(prevBal, paidVal - todayBillTotal)) : 0;
  const todayDueVal = Math.max(0, todayBillTotal - paidVal);
  const grandTotalVal = Number(bill.grand_total !== undefined ? bill.grand_total : (todayBillTotal + prevBal));
  const balanceDueVal = Number(bill.balance_due !== undefined ? bill.balance_due : (grandTotalVal - paidVal));

  const commissionVal = Number(bill.commission_amount || 0);
  const commissionMode = bill.commission_mode || (bill.commission_percent !== null && bill.commission_percent !== undefined ? 'percentage' : 'fixed');
  const patthuVal = Number(bill.patthu_amount || 0);
  const cooliVal = Number(bill.cooli_amount || 0);
  const vadagaiVal = Number(bill.vadagai_amount || 0);
  const otherDeductionVal = Number(bill.other_deduction_amount || 0);
  const totalDeductionsVal = commissionVal + patthuVal + cooliVal + vadagaiVal + otherDeductionVal;
  const netTotalVal = itemsTotal - totalDeductionsVal;

  // Prepare line items (keep spacer rows only for commission bill)
  const rawLines = bill.lines || bill.items || [];
  const minLines = isCommission ? 6 : 0;
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
              {displayName || companyNameTa}
            </h1>
            {(address || location) && (
              <div className="text-xs font-bold text-[#0e6037] tracking-wider leading-tight">
                {[address, location].filter(Boolean).join(', ')}
              </div>
            )}
          </div>

          {/* Customer & Date Line */}
          <div className="border-t border-b border-[#0e6037] py-1 px-1 my-1 flex justify-between items-center text-xs font-bold">
            <div className="flex-1 truncate">
              <span className="text-[#0e6037]">உயர்திரு : </span>
              <span className="font-bold text-slate-900 px-1">
                {customerName || 'வாடிக்கையாளர்'}
              </span>
            </div>
            <div className="text-right shrink-0 font-bold text-slate-900 text-[11px]">
              <span>தேதி : </span>
              <span className="font-mono">{formattedDate}</span>
            </div>
          </div>

          {/* Mandi Items Table matching user request: Separate columns for Rate, Item, Kg, Nos, Rs, Paisa, no horizontal row lines */}
          <table className="w-full border-collapse text-xs border border-[#0e6037]">
            <thead>
              <tr className="bg-[#e6f4ea] text-[#0e6037] border-b border-[#0e6037] text-center font-bold">
                <th className="border-r border-[#0e6037] py-1.5 px-2 w-[16%] text-center">விலை (₹)</th>
                <th className="border-r border-[#0e6037] py-1.5 px-3 w-[36%] text-left">விவரம்</th>
                <th className="border-r border-[#0e6037] py-1.5 px-2 w-[16%] text-center">எடை (kg)</th>
                <th className="border-r border-[#0e6037] py-1.5 px-2 w-[12%] text-center">எண்ணம்</th>
                <th className="border-r border-[#0e6037] py-1.5 px-2 w-[12%] text-center">ரூ.</th>
                <th className="py-1.5 px-2 w-[8%] text-center">பை</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, index) => {
                if (l.is_empty) {
                  return (
                    <tr key={`empty-${index}`} className="h-6 border-none" style={{ border: 'none', borderBottom: 'none' }}>
                      <td className="border-r border-[#0e6037] px-2">&nbsp;</td>
                      <td className="border-r border-[#0e6037] px-2">&nbsp;</td>
                      <td className="border-r border-[#0e6037] px-2">&nbsp;</td>
                      <td className="border-r border-[#0e6037] px-2">&nbsp;</td>
                      <td className="border-r border-[#0e6037] px-2">&nbsp;</td>
                      <td className="px-2">&nbsp;</td>
                    </tr>
                  );
                }

                const itemName = l.item_name_ta || l.item_name_en || l.item_name || '';
                const rateVal = l.rate ? Number(l.rate) : 0;
                const weightNum = parseFloat(l.weight !== undefined && l.weight !== null ? l.weight : (l.qty !== undefined ? l.qty : 0));
                const weightDisplay = weightNum > 0 ? (Number.isInteger(weightNum) ? `${weightNum} kg` : `${weightNum.toFixed(2)} kg`) : '—';
                const nosNum = parseFloat(l.nos !== undefined && l.nos !== null ? l.nos : (l.bags !== undefined ? l.bags : 0));
                const nosDisplay = nosNum > 0 ? nosNum : '—';

                const amountVal = l.amount !== undefined ? Number(l.amount) : (l.line_total !== undefined ? Number(l.line_total) : 0);

                return (
                  <tr key={l.id || l.key || index} className="border-none font-medium" style={{ border: 'none', borderBottom: 'none' }}>
                    <td className="border-r border-[#0e6037] py-2 px-2 text-right font-mono font-bold text-xs">
                      {rateVal > 0 ? rateVal.toFixed(2) : '—'}
                    </td>
                    <td className="border-r border-[#0e6037] py-2 px-3 text-left font-bold text-xs truncate">
                      {itemName}
                    </td>
                    <td className="border-r border-[#0e6037] py-2 px-2 text-center font-mono font-bold text-xs">
                      {weightDisplay}
                    </td>
                    <td className="border-r border-[#0e6037] py-2 px-2 text-center font-bold text-xs text-slate-700">
                      {nosDisplay}
                    </td>
                    <td className="border-r border-[#0e6037] py-2 px-2 text-right font-mono font-bold text-xs">
                      {amountVal > 0 ? amountVal.toFixed(2) : '—'}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-xs">
                      {amountVal > 0 ? '00' : '&nbsp;'}
                    </td>
                  </tr>
                );
              })}

              {/* If deductions exist, show items subtotal, deductions breakdown, deduction total, and final net total */}
              {totalDeductionsVal > 0 ? (
                <>
                  {/* Gross Items Subtotal Row: virpanai thogai text removed, field total numbers displayed */}
                  <tr className="border-t-2 border-[#0e6037] font-bold bg-[#f7faf8]">
                    <td className="border-r border-[#0e6037] py-1 px-3 text-right font-bold text-xs" colSpan={4}>
                      &nbsp;
                    </td>
                    <td className="border-r border-[#0e6037] py-1 px-2 text-right font-mono font-bold text-xs">
                      {itemsTotal.toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-center font-mono font-bold text-xs">
                      00
                    </td>
                  </tr>

                  {/* Commission Mandi Breakdown Rows */}
                  <tr className="border-none" style={{ border: 'none', borderBottom: 'none' }}>
                    <td className="border-r border-[#0e6037]" colSpan={1}></td>
                    <td className="border-r border-[#0e6037] py-0.5 px-3 text-right font-bold text-red-700">
                      கமிஷன்
                    </td>
                    <td className="border-r border-[#0e6037] py-0.5 px-2 text-right font-mono font-bold text-xs" colSpan={2}>
                      {commissionVal > 0 ? commissionVal.toFixed(2) : '0.00'}
                    </td>
                    <td className="border-r border-[#0e6037]"></td>
                    <td></td>
                  </tr>

                  <tr className="border-none" style={{ border: 'none', borderBottom: 'none' }}>
                    <td className="border-r border-[#0e6037]" colSpan={1}></td>
                    <td className="border-r border-[#0e6037] py-0.5 px-3 text-right font-bold text-red-700">
                      பற்று
                    </td>
                    <td className="border-r border-[#0e6037] py-0.5 px-2 text-right font-mono font-bold text-xs" colSpan={2}>
                      {patthuVal > 0 ? patthuVal.toFixed(2) : '0.00'}
                    </td>
                    <td className="border-r border-[#0e6037]"></td>
                    <td></td>
                  </tr>

                  <tr className="border-none" style={{ border: 'none', borderBottom: 'none' }}>
                    <td className="border-r border-[#0e6037]" colSpan={1}></td>
                    <td className="border-r border-[#0e6037] py-0.5 px-3 text-right font-bold text-red-700">
                      கூலி
                    </td>
                    <td className="border-r border-[#0e6037] py-0.5 px-2 text-right font-mono font-bold text-xs" colSpan={2}>
                      {cooliVal > 0 ? cooliVal.toFixed(2) : '0.00'}
                    </td>
                    <td className="border-r border-[#0e6037]"></td>
                    <td></td>
                  </tr>

                  <tr className="border-none" style={{ border: 'none', borderBottom: 'none' }}>
                    <td className="border-r border-[#0e6037]" colSpan={1}></td>
                    <td className="border-r border-[#0e6037] py-0.5 px-3 text-right font-bold text-red-700">
                      வாடகை
                    </td>
                    <td className="border-r border-[#0e6037] py-0.5 px-2 text-right font-mono font-bold text-xs" colSpan={2}>
                      {vadagaiVal > 0 ? vadagaiVal.toFixed(2) : '0.00'}
                    </td>
                    <td className="border-r border-[#0e6037]"></td>
                    <td></td>
                  </tr>

                  {otherDeductionVal > 0 && (
                    <tr className="border-none" style={{ border: 'none', borderBottom: 'none' }}>
                      <td className="border-r border-[#0e6037]" colSpan={1}></td>
                      <td className="border-r border-[#0e6037] py-0.5 px-3 text-right font-bold text-red-700">
                        இதர கழிவு
                      </td>
                      <td className="border-r border-[#0e6037] py-0.5 px-2 text-right font-mono font-bold text-xs" colSpan={2}>
                        {otherDeductionVal.toFixed(2)}
                      </td>
                      <td className="border-r border-[#0e6037]"></td>
                      <td></td>
                    </tr>
                  )}

                  {/* Deductions Total Row: kalivugal moththam text removed, field totals displayed */}
                  <tr className="border-t border-b-2 border-[#0e6037] bg-rose-50/50 font-bold">
                    <td className="border-r border-[#0e6037] py-1 px-3 text-right font-bold text-xs" colSpan={2}>
                      &nbsp;
                    </td>
                    <td className="border-r border-[#0e6037] py-1 px-2 text-right font-mono font-bold text-xs text-rose-800" colSpan={2}>
                      {totalDeductionsVal.toFixed(2)}
                    </td>
                    <td className="border-r border-[#0e6037] py-1 px-2 text-right font-mono font-bold text-rose-700 text-xs">
                      - {totalDeductionsVal.toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-center font-mono font-bold text-rose-700 text-xs">
                      00
                    </td>
                  </tr>

                  {/* Net Grand Total Row: Right side end under ரூ. and பை */}
                  <tr className="font-black bg-[#e6f4ea] border-t-2 border-[#0e6037]">
                    <td className="border-r border-[#0e6037] py-1.5 px-3 text-right font-black text-sm text-[#0e6037]" colSpan={4}>
                      மொத்தம்
                    </td>
                    <td className="border-r border-[#0e6037] py-1.5 px-2 text-right font-mono font-black text-sm text-[#0e6037]">
                      {netTotalVal.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-black text-sm text-[#0e6037]">
                      00
                    </td>
                  </tr>
                </>
              ) : (
                /* No Deductions: Simple Grand Total row at the right side end */
                <tr className="font-black bg-[#e6f4ea] border-t-2 border-[#0e6037]">
                  <td className="border-r border-[#0e6037] py-1.5 px-3 text-right font-black text-sm text-[#0e6037]" colSpan={4}>
                    மொத்தம்
                  </td>
                  <td className="border-r border-[#0e6037] py-1.5 px-2 text-right font-mono font-black text-sm text-[#0e6037]">
                    {itemsTotal.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-2 text-center font-mono font-black text-sm text-[#0e6037]">
                    00
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer Section matching user image */}
          <div className="mt-2 flex items-center justify-between text-[9px] gap-2">
            
            {/* Left Thank You Box */}
            <div className="border border-[#0e6037] rounded px-2 py-1 text-center leading-tight">
              <div className="font-bold text-[#0e6037]">{footerNote || 'நன்றி! மீண்டும் வருக!'}</div>
              <div className="text-[8px] font-semibold text-slate-700">• Thank You!</div>
              <div className="text-[8px] font-semibold text-slate-700">Visit Again!</div>
            </div>

            {/* Right POS / GST Notes */}
            <div className="text-right leading-tight text-slate-700">
              <div>• Computerized POS Invoice {gstin ? `• GSTIN: ${gstin}` : ''}</div>
              <div>• This is a computer-generated invoice. No signature required.</div>
            </div>

          </div>

          {/* Bottom Inquiries & Terms */}
          <div className="mt-1 text-center text-[8.5px] text-slate-600 border-t border-gray-200 pt-1">
            <div>Terms: Goods once sold will not be taken back.</div>
            {phones.length > 0 && <div>• For inquiries: {phones.join(' / ')}</div>}
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
            {displayName || companyNameTa}
          </h1>
          {(address || location) && (
            <div className="text-xs font-bold text-[#0e6037] tracking-wider leading-tight">
              {[address, location].filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        {/* Customer & Bill No Bar */}
        <div className="border-t border-b border-[#0e6037] py-1 px-1 my-1 flex justify-between items-center text-xs font-bold">
          <div className="flex-1 truncate">
            <span className="text-[#0e6037]">உயர்திரு : </span>
            <span className="font-bold text-slate-900 px-1">
              {customerName || 'வாடிக்கையாளர்'}
            </span>
          </div>
          <div className="text-right shrink-0 flex items-center gap-2 font-bold text-[11px]">
            <div>பில்: <span className="font-mono">{billNo}</span></div>
            <div>• தேதி: <span className="font-mono">{formattedDate}</span></div>
          </div>
        </div>

        {/* Normal Bill Items Table (Order: Rate -> Item -> Kg -> Amount, No Middle Empty Rows) */}
        <table className="w-full border-collapse text-xs border border-[#0e6037]">
          <thead>
            <tr className="bg-[#e6f4ea] text-[#0e6037] border-b border-[#0e6037] text-center font-bold">
              <th className="border-r border-[#0e6037] py-1 px-1.5 w-[18%] text-right pr-2">விலை (₹)</th>
              <th className="border-r border-[#0e6037] py-1 px-2 w-[46%] text-left">விவரம் (Item)</th>
              <th className="border-r border-[#0e6037] py-1 px-1 w-[18%] text-center">எடை / அளவு (kg)</th>
              <th className="py-1 px-1.5 w-[18%] text-right pr-2">தொகை (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, index) => {
              if (l.is_empty) {
                return (
                  <tr key={`empty-${index}`} className="h-6 border-b border-[#0e6037]/20">
                    <td className="border-r border-[#0e6037]">&nbsp;</td>
                    <td className="border-r border-[#0e6037]">&nbsp;</td>
                    <td className="border-r border-[#0e6037]">&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                );
              }

              const itemName = l.item_name_ta || l.item_name_en || l.item_name || '';
              const weightNum = parseFloat(l.weight !== undefined && l.weight !== null ? l.weight : (l.qty || 1));
              const qtyDisplay = l.is_charge_item 
                ? `${l.nos || 1} nos` 
                : `${isNaN(weightNum) ? '1' : weightNum} kg`;
              const rateVal = Number(l.rate || 0).toFixed(2);
              const amountVal = l.amount !== undefined ? Number(l.amount) : (l.line_total !== undefined ? Number(l.line_total) : 0);

              return (
                <tr key={l.id || l.key || index} className="font-medium hover:bg-transparent">
                  <td className="border-r border-[#0e6037] py-1 px-1.5 text-right font-mono font-bold text-xs pr-2">
                    {rateVal}
                  </td>
                  <td className="border-r border-[#0e6037] py-1 px-2 text-left font-bold text-xs truncate">
                    {itemName}
                  </td>
                  <td className="border-r border-[#0e6037] py-1 px-1 text-center font-mono font-bold text-xs">
                    {qtyDisplay}
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono font-bold text-xs pr-2">
                    {amountVal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Normal Bill Bottom Summary (Clean 2-Column Layout) */}
        <div className="border-t-2 border-[#0e6037] mt-1 pt-1 flex flex-row justify-between items-start text-xs">
          
          {/* Left: Old Balance & Notes */}
          <div className="w-[45%] text-[10px] space-y-1">
            {prevBal > 0 && (
              <div>
                <span className="font-bold text-amber-900 text-xs">பழைய பாக்கி: </span>
                <span className="font-mono font-bold text-slate-800 text-xs">₹{prevBal.toFixed(2)}</span>
              </div>
            )}
            {bill.notes && (
              <div className="text-gray-600 italic">
                குறிப்பு: {bill.notes}
              </div>
            )}
          </div>

          {/* Right: Totals Breakdown (Only Discount & Moththam, no virpanai thogai, no seluthiyathu) */}
          <div className="w-[50%] font-bold text-xs space-y-1">
            {discountVal > 0 && (
              <div className="flex justify-between text-red-600">
                <span>தள்ளுபடி:</span>
                <span className="font-mono">- ₹{discountVal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-b border-[#0e6037] py-1 bg-[#e6f4ea] text-sm text-[#0e6037] font-black px-1.5 rounded-xs">
              <span>மொத்தம்:</span>
              <span className="font-mono">₹{todayBillTotal.toFixed(2)}</span>
            </div>
          </div>

        </div>

        {/* Footer Section */}
        <div className="mt-2 flex items-center justify-between text-[9px] gap-2">
          
          {/* Left Thank You Box */}
          <div className="border border-[#0e6037] rounded px-2 py-1 text-center leading-tight">
            <div className="font-bold text-[#0e6037]">{footerNote || 'நன்றி! மீண்டும் வருக!'}</div>
            <div className="text-[8px] font-semibold text-slate-700">• Thank You!</div>
            <div className="text-[8px] font-semibold text-slate-700">Visit Again!</div>
          </div>

          {/* Right POS / GST Notes */}
          <div className="text-right leading-tight text-slate-700">
            <div>• Computerized POS Invoice {gstin ? `• GSTIN: ${gstin}` : ''}</div>
            <div>• This is a computer-generated invoice. No signature required.</div>
          </div>

        </div>

        {/* Bottom Inquiries & Terms */}
        <div className="mt-1 text-center text-[8.5px] text-slate-600 border-t border-gray-200 pt-1">
          <div>Terms: Goods once sold will not be taken back.</div>
          {phones.length > 0 && <div>• For inquiries: {phones.join(' / ')}</div>}
        </div>

      </div>
    </div>
  );
}
