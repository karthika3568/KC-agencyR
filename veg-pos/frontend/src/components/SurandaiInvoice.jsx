import React from 'react';
import { formatINR, formatDateDMY } from '../utils/format';

export default function SurandaiInvoice({ bill, settings = {}, isCommissionView, lang = 'ta', template = 'bhavani' }) {
  if (!bill) return null;

  // Decide format based on bill_type or user toggle
  const isCommission = isCommissionView !== undefined 
    ? isCommissionView 
    : bill.bill_type === 'commission';

  const isTamil = lang === 'ta';

  // Parse phone numbers from settings or fallback to photo defaults
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

  const shopNo1 = settings.shop_number || '14';
  const shopNo2 = settings.shop_number_2 || '15';
  const companyNameTa = settings.company_name_ta || 'ஸ்ரீ பவானி காய்கனி கமிஷன் வியாபாரம்';
  const companyNameEn = settings.company_name_en || 'Sri Bhavani Veg Commission Agency';
  const tagline = settings.company_tagline || 'ஸ்ரீ பவானி அம்மன் துணை';
  const address = settings.address_line1 || 'தினசரி மார்க்கெட், சுரண்டை.';
  const proprietor = settings.proprietor_name || 'பவானி சங்கர்';
  const customerName = bill.party_name || bill.walkin_name || bill.customer_name || '';

  // Calculate items total & totals
  const itemsTotal = Number(bill.items_total !== undefined ? bill.items_total : (bill.subtotal !== undefined ? bill.subtotal : 0));
  const prevBal = Number(bill.previous_balance !== undefined ? bill.previous_balance : (bill.prev_balance !== undefined ? bill.prev_balance : 0));
  const grandTotalVal = Number(bill.grand_total !== undefined ? bill.grand_total : (itemsTotal + prevBal));
  
  const commissionVal = Number(bill.commission_amount || 0);
  const commissionMode = bill.commission_mode || (bill.commission_percent !== null && bill.commission_percent !== undefined ? 'percentage' : 'fixed');
  const patthuVal = Number(bill.patthu_amount || 0);
  const cooliVal = Number(bill.cooli_amount || 0);
  const vadagaiVal = Number(bill.vadagai_amount || 0);
  const otherDeductionVal = Number(bill.other_deduction_amount || 0);
  const totalDeductions = Number(bill.total_deductions || commissionVal + patthuVal + cooliVal + vadagaiVal + otherDeductionVal);
  const netPayableVal = isCommission ? (itemsTotal - totalDeductions) : grandTotalVal;

  // Prepare line items (ensure at least 4 rows for proper slip proportions)
  const lines = [...(bill.lines || bill.items || [])];
  while (lines.length < 3) {
    lines.push({ id: `empty-${lines.length}`, is_empty: true });
  }

  return (
    <div className="surandai-bhavani-template font-serif text-black bg-white p-3 max-w-[148mm] mx-auto border-4 border-emerald-800 relative select-none">
      {/* Outer Double Frame Border */}
      <div className="border border-emerald-900 p-2">

        {/* Top Contact Bar */}
        <div className="flex justify-between items-center text-xs font-bold border-b-2 border-emerald-800 pb-1 mb-1 text-emerald-950">
          <div>
            <span>{proprietor} : </span>
            <span className="font-mono">{phones[0]}</span>
          </div>
          <div className="text-right leading-tight">
            <div>Cell : <span className="font-mono">{phones[1]}</span></div>
            {phones[2] && <div className="font-mono pl-6">{phones[2]}</div>}
          </div>
        </div>

        {/* Header Block Container */}
        <div className="border-2 border-emerald-800 p-1.5 mb-1 bg-emerald-50/20 text-center relative">
          
          {/* Invocation Header */}
          <div className="font-black text-sm text-emerald-900 leading-tight">
            ஸ்ரீ பவானி அம்மன் துணை
          </div>
          <div className="text-[10px] font-bold text-emerald-800 flex justify-center gap-6 my-0.5">
            <span>ஸ்ரீ பவானி அம்மன் துணை</span>
            <span>ஸ்ரீ பொட்டல் மாடசாமி</span>
          </div>

          {/* Header Row with Images, Logo Badge & Shop Nos */}
          <div className="flex items-center justify-between my-1 px-1">
            {/* Left Shop No & God Image */}
            <div className="flex items-center gap-1">
              <div className="border-2 border-emerald-800 bg-white rounded text-center px-1.5 py-0.5 min-w-[50px]">
                <div className="text-[9px] font-bold text-emerald-900 border-b border-emerald-800 leading-tight">கடை எண்</div>
                <div className="text-xl font-black text-red-600 leading-none pt-0.5">{shopNo1}</div>
              </div>
              {/* Goddess Amman SVG Icon Frame */}
              <div className="w-11 h-13 border border-emerald-800 bg-emerald-100 flex items-center justify-center p-0.5 rounded overflow-hidden">
                <svg className="w-9 h-9 text-emerald-900" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L10.5 4H8.5L7 2.5L5.5 4H4V7L2 9.5L4 12V15H5.5L7 16.5L8.5 15H10.5L12 17L13.5 15H15.5L17 16.5L18.5 15H20V12L22 9.5L20 7V4H18.5L17 2.5L15.5 4H13.5L12 2Z" opacity="0.3"/>
                  <circle cx="12" cy="7" r="2.5" />
                  <path d="M12 10.5c-2 0-3.5 1.2-3.5 2.5v4h7v-4c0-1.3-1.5-2.5-3.5-2.5z" />
                </svg>
              </div>
            </div>

            {/* Center VTC Oval Logo Badge */}
            <div className="mx-2">
              <div className="w-22 h-11 bg-red-600 rounded-[50%] flex items-center justify-center border-2 border-red-700 shadow-sm mx-auto px-4">
                <span className="text-white font-black text-2xl tracking-wider font-sans drop-shadow-sm">VTC</span>
              </div>
            </div>

            {/* Right God Image & Shop No */}
            <div className="flex items-center gap-1">
              {/* God Madasamy SVG Icon Frame */}
              <div className="w-11 h-13 border border-emerald-800 bg-emerald-100 flex items-center justify-center p-0.5 rounded overflow-hidden">
                <svg className="w-9 h-9 text-emerald-900" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3L4 9v12h16V9l-8-6zm0 2.25l6 4.5v9.75H6V9.75l6-4.5z" opacity="0.3"/>
                  <path d="M12 7a2 2 0 100 4 2 2 0 000-4zm-3 8c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5v1.5H9V15z" />
                </svg>
              </div>
              <div className="border-2 border-emerald-800 bg-white rounded text-center px-1.5 py-0.5 min-w-[50px]">
                <div className="text-[9px] font-bold text-emerald-900 border-b border-emerald-800 leading-tight">கடை எண்</div>
                <div className="text-xl font-black text-red-600 leading-none pt-0.5">{shopNo2}</div>
              </div>
            </div>
          </div>

          {/* Main Title Banner */}
          <h1 className="text-xl sm:text-2xl font-black text-red-600 tracking-wide mt-1 leading-tight uppercase font-sans">
            {companyNameTa}
          </h1>
          <div className="text-xs font-black text-emerald-950 mt-0.5">
            {address}
          </div>
        </div>

        {/* Customer & Date Bar */}
        <div className="flex justify-between items-center py-1 px-1 text-xs font-bold border-b-2 border-emerald-800 mb-1">
          <div className="flex-1 flex items-baseline gap-1">
            <span>உயர்திரு</span>
            <span className="font-extrabold text-sm border-b border-dotted border-black px-2 flex-1">
              {customerName || '............................................................................'}
            </span>
          </div>
          <div className="ml-4 font-mono font-bold whitespace-nowrap">
            தேதி : {formatDateDMY(bill.bill_date || bill.created_at || bill.invoice_date)}
          </div>
        </div>

        {/* Line Items & Calculations Table */}
        <table className="w-full border-collapse text-xs border-2 border-emerald-800">
          <thead>
            {/* Double Green Header Row */}
            <tr className="bg-emerald-100 text-emerald-950 border-b-2 border-emerald-800 text-center font-bold">
              <th className="border-r border-emerald-800 py-1 px-1 w-[45%] text-left">விபரம்</th>
              <th className="border-r border-emerald-800 py-1 px-1 w-[18%]">எண்ணிக்கை</th>
              <th className="border-r border-emerald-800 py-1 px-1 w-[20%]">ரூ.</th>
              <th className="py-1 px-1 w-[17%]">பை</th>
            </tr>
            <tr className="bg-emerald-50 text-emerald-900 border-b border-emerald-800 text-center font-semibold text-[11px]">
              <th className="border-r border-emerald-800 py-0.5 px-1 text-left">விபரம்</th>
              <th className="border-r border-emerald-800 py-0.5 px-1">எண்ணிக்கை</th>
              <th className="border-r border-emerald-800 py-0.5 px-1">ரூ.</th>
              <th className="py-0.5 px-1">பை</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, index) => {
              if (l.is_empty) {
                return (
                  <tr key={`empty-${index}`} className="h-7 border-b border-emerald-800/40">
                    <td className="border-r border-emerald-800">&nbsp;</td>
                    <td className="border-r border-emerald-800">&nbsp;</td>
                    <td className="border-r border-emerald-800">&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                );
              }

              const itemName = l.item_name_ta || l.item_name_en || l.item_name || l.item_name_snapshot || '';
              const nosStr = l.nos !== undefined ? l.nos : (l.bags !== undefined ? l.bags : (l.qty ? l.qty : ''));
              const amountVal = l.amount !== undefined ? Number(l.amount) : (l.line_total !== undefined ? Number(l.line_total) : (l.net_amount !== undefined ? Number(l.net_amount) : 0));
              const amountRs = Math.floor(amountVal);
              const amountPaisa = Math.round((amountVal - amountRs) * 100);

              return (
                <tr key={l.id || index} className="border-b border-emerald-800/50 font-medium">
                  <td className="border-r border-emerald-800 py-1 px-2 text-left font-bold text-sm">
                    {l.rate ? `${l.rate}. ` : ''}{itemName} {l.weight ? `— ${l.weight}` : ''}
                  </td>
                  <td className="border-r border-emerald-800 py-1 px-1 text-center font-bold text-sm">{nosStr}</td>
                  <td className="border-r border-emerald-800 py-1 px-2 text-right font-mono font-bold text-sm">
                    {amountRs > 0 ? `${amountRs}.00` : ''}
                  </td>
                  <td className="py-1 px-1 text-center font-mono">{amountPaisa > 0 ? amountPaisa : ''}</td>
                </tr>
              );
            })}

            {/* Subtotal Deduction Row (Grey background as in template) */}
            {commissionVal > 0 && (
              <tr className="bg-gray-100 border-b border-emerald-800 font-bold">
                <td className="border-r border-emerald-800 py-1 px-2"></td>
                <td className="border-r border-emerald-800 py-1 px-1 text-center">-</td>
                <td className="border-r border-emerald-800 py-1 px-2 text-right font-mono text-red-600">
                  - {commissionVal.toFixed(2)}
                </td>
                <td className="py-1 px-1"></td>
              </tr>
            )}

            {/* Subtotal Net Row */}
            <tr className="border-b-2 border-emerald-800 font-extrabold text-sm">
              <td className="border-r border-emerald-800 py-1 px-2"></td>
              <td className="border-r border-emerald-800 py-1 px-1"></td>
              <td className="border-r border-emerald-800 py-1 px-2 text-right font-mono text-base">
                {(itemsTotal - commissionVal).toFixed(2)}
              </td>
              <td className="py-1 px-1"></td>
            </tr>

            {/* Deductions Breakdown Table Grid */}
            <tr className="border-b border-emerald-800 font-bold">
              <td className="border-r border-emerald-800 py-1 px-2 text-right text-red-700">
                கமிஷன் {commissionMode === 'percentage' && bill.commission_percent ? `(${Number(bill.commission_percent)}%)` : commissionMode === 'fixed' ? '(நிலையான)' : ''}
              </td>
              <td className="border-r border-emerald-800 py-1 px-2 text-right font-mono">{commissionVal > 0 ? commissionVal.toFixed(2) : ''}</td>
              <td className="border-r border-emerald-800 py-1 px-2"></td>
              <td className="py-1 px-1"></td>
            </tr>

            <tr className="border-b border-emerald-800 font-bold">
              <td className="border-r border-emerald-800 py-1 px-2 text-right text-red-700">பற்று</td>
              <td className="border-r border-emerald-800 py-1 px-2 text-right font-mono">{patthuVal > 0 ? patthuVal.toFixed(2) : ''}</td>
              <td className="border-r border-emerald-800 py-1 px-2"></td>
              <td className="py-1 px-1"></td>
            </tr>

            <tr className="border-b border-emerald-800 font-bold">
              <td className="border-r border-emerald-800 py-1 px-2 text-right text-red-700">கூலி</td>
              <td className="border-r border-emerald-800 py-1 px-2 text-right font-mono">{cooliVal > 0 ? cooliVal.toFixed(2) : ''}</td>
              <td className="border-r border-emerald-800 py-1 px-2"></td>
              <td className="py-1 px-1"></td>
            </tr>

            <tr className="border-b border-emerald-800 font-bold">
              <td className="border-r border-emerald-800 py-1 px-2 text-right text-red-700">வாடகை</td>
              <td className="border-r border-emerald-800 py-1 px-2 text-right font-mono">{vadagaiVal > 0 ? vadagaiVal.toFixed(2) : ''}</td>
              <td className="border-r border-emerald-800 py-1 px-2"></td>
              <td className="py-1 px-1"></td>
            </tr>

            {otherDeductionVal > 0 && (
              <tr className="border-b border-emerald-800 font-bold">
                <td className="border-r border-emerald-800 py-1 px-2 text-right text-red-700">பிற கழிவு</td>
                <td className="border-r border-emerald-800 py-1 px-2 text-right font-mono">{otherDeductionVal.toFixed(2)}</td>
                <td className="border-r border-emerald-800 py-1 px-2"></td>
                <td className="py-1 px-1"></td>
              </tr>
            )}

            {/* Total Row */}
            <tr className="bg-emerald-50 border-t-2 border-emerald-800 font-black text-sm">
              <td className="border-r border-emerald-800 py-1.5 px-2 text-right text-red-700 text-base">மொத்தம்</td>
              <td className="border-r border-emerald-800 py-1.5 px-2 text-right font-mono text-base font-black">
                {grandTotalVal.toFixed(2)}
              </td>
              <td className="border-r border-emerald-800 py-1.5 px-2"></td>
              <td className="py-1.5 px-1"></td>
            </tr>
          </tbody>
        </table>

        {/* Footer Section */}
        <div className="mt-2 flex justify-between items-end gap-2 text-[10px]">
          {/* Bottom Left Visit Again Badge */}
          <div className="border border-emerald-800 p-1 rounded text-center font-bold bg-emerald-50/50 min-w-[110px]">
            <div className="text-emerald-950">நன்றி! மீண்டும் வருக!</div>
            <div className="text-[9px] text-gray-700">• Thank You!</div>
            <div className="text-[9px] text-gray-700">Visit Again!</div>
          </div>

          {/* Computerized Notes */}
          <div className="text-right leading-tight font-sans font-medium text-[9px] text-gray-800">
            <div>• Computerized POS Invoice • GSTIN: ______________________</div>
            <div>• This is a computer-generated invoice. No signature required.</div>
          </div>
        </div>

        {/* Bottom Terms & Inquiry Line */}
        <div className="mt-1 pt-1 border-t border-emerald-800 text-[9px] text-center font-bold text-emerald-950 font-sans">
          <div>Terms: Goods once sold will not be taken back.</div>
          <div>• For inquiries: {phones.join(' / ')}</div>
        </div>

      </div>
    </div>
  );
}
