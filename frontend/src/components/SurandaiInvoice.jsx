import React from 'react';

export default function SurandaiInvoice({ bill, settings = {}, isCommissionView, lang = 'ta' }) {
  if (!bill) return null;

  const isCommission = isCommissionView !== undefined 
    ? isCommissionView 
    : bill.bill_type === 'commission';

  const isTamil = lang === 'ta';

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
    phones = ['95244 95344', '97896 39039'];
  }

  const shopNo = settings.shop_number || '10';
  const companyNameTa = settings.company_name_ta || 'A.P.N';
  const companyNameEn = settings.company_name_en || 'A.P.N';
  const tagline = settings.company_tagline || 'காய்கனிகமிஷன் வியாபாரம்';
  const address1 = settings.address_line1 || 'காமராஜர் வணிக வளாகம் , தினசரி மார்க்கெட்';
  const proprietor = settings.proprietor_name || 'V.S. ANBURAJ';
  const location = settings.address_line2 || 'சுரண்டை';
  const customerName = bill.party_name || bill.walkin_name || bill.customer_name || 'VTC';

  const L = isTamil
    ? {
        rate: 'விலை',
        item: 'விவரம்',
        nos: 'எண்',
        weight: 'எடை',
        amount: 'ரூ. பை',
        totalLabel: 'மொத்தம் ரூ =',
        prevBalance: 'முன் பற்று',
        commission: 'கமிஷன்',
        patthu: 'பற்று',
        cooli: 'கூலி',
        vadagai: 'வாடகை',
        grandTotal: 'இறுதி மொத்தம்',
        to: 'திரு.',
        billNo: 'BILL NO :',
        date: 'DATE :',
        shopNoLabel: 'கடை எண்',
        invocation: 'உ',
        subInvocation: 'ஸ்ரீ கற்குவேல் அய்யனார் துணை'
      }
    : {
        rate: 'RATE',
        item: 'I NAME',
        nos: 'NOS',
        weight: 'WEIGHT',
        amount: 'AMOUNT',
        totalLabel: 'TOTAL RS =',
        prevBalance: 'PREV BAL',
        commission: 'COMMISSION',
        patthu: 'DEBIT',
        cooli: 'COOLIE',
        vadagai: 'FREIGHT',
        grandTotal: 'GRAND TOTAL',
        to: 'M/s.',
        billNo: 'BILL NO :',
        date: 'DATE :',
        shopNoLabel: 'SHOP NO',
        invocation: 'உ',
        subInvocation: 'SRI KARKUVEL AYYANAR THUNAI'
      };

  const lines = [...(bill.lines || bill.items || [])];
  while (lines.length < 4) {
    lines.push({ id: `empty-${lines.length}`, is_empty: true });
  }

  const itemsTotal = bill.items_total !== undefined ? bill.items_total : (bill.subtotal !== undefined ? bill.subtotal : 0);
  const prevBal = bill.previous_balance !== undefined ? bill.previous_balance : (bill.prev_balance !== undefined ? bill.prev_balance : 0);
  const grandTotalVal = bill.grand_total !== undefined ? bill.grand_total : (Number(itemsTotal) + Number(prevBal));

  const formatDateStr = (d) => {
    if (!d) return '';
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return String(d);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(d);
    }
  };

  return (
    <div className="surandai-invoice-slip font-serif text-black bg-white p-4 max-w-[148mm] mx-auto border-2 border-black relative select-none">
      {/* Top Invocation Header */}
      <div className="text-center mb-1">
        <div className="font-bold text-sm leading-none">{L.invocation}</div>
        <div className="font-bold text-[11px] tracking-wide mt-0.5">{L.subInvocation}</div>
      </div>

      {/* Header Container */}
      <div className="relative pb-2 border-b border-black">
        {/* Top Right Cell & Shop No Box */}
        <div className="absolute top-0 right-0 text-right text-xs">
          <div className="font-semibold text-[11px]">CELL : {phones[0]}</div>
          {phones[1] && <div className="font-semibold text-[11px] pr-1">{phones[1]}</div>}
          <div className="mt-1 border border-black inline-block text-center px-1 py-0.5 min-w-[70px]">
            <div className="text-[10px] font-bold border-b border-black pb-0.5">{L.shopNoLabel}</div>
            <div className="text-2xl font-black leading-none pt-0.5">{shopNo}</div>
          </div>
        </div>

        {/* Top Left Pillayar / Sacred Icon */}
        <div className="absolute top-0 left-0 w-12 h-12 flex items-center justify-center">
          <svg className="w-10 h-10 text-black" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L10.5 4H8.5L7 2.5L5.5 4H4V7L2 9.5L4 12V15H5.5L7 16.5L8.5 15H10.5L12 17L13.5 15H15.5L17 16.5L18.5 15H20V12L22 9.5L20 7V4H18.5L17 2.5L15.5 4H13.5L12 2Z" opacity="0.2"/>
            <circle cx="12" cy="8" r="3" />
            <path d="M12 12c-2.5 0-4 1.5-4 3v3h8v-3c0-1.5-1.5-3-4-3z" />
          </svg>
        </div>

        {/* Center Shop Header Information */}
        <div className="text-center px-16">
          <h1 className="text-2xl font-black tracking-wide uppercase leading-tight">
            {isTamil ? companyNameTa : companyNameEn}
          </h1>
          <div className="text-xs font-bold mt-0.5">{tagline}</div>
          <div className="text-[11px] font-medium mt-0.5">{address1}</div>
          <div className="text-[11px] font-bold mt-0.5">
            Prop : {proprietor} <span className="ml-2">{location}</span>
          </div>
        </div>
      </div>

      {/* Customer & Bill Meta Section */}
      <div className="flex justify-between items-end py-1.5 px-1 border-b border-black text-xs font-bold">
        <div className="text-sm">
          <span>{L.to} </span>
          <span className="uppercase font-extrabold">{customerName}</span>
        </div>
        <div className="text-right leading-tight font-bold">
          <div>{L.billNo} :{bill.bill_no || bill.invoice_no || ''}</div>
          <div>{L.date} :{formatDateStr(bill.bill_date || bill.created_at || bill.invoice_date)}</div>
        </div>
      </div>

      {/* Line Items Grid Table */}
      <table className="w-full border-collapse text-xs border-b border-black">
        <thead>
          <tr className="border-b border-black text-center font-bold">
            <th className="border-r border-black py-1 px-1 w-[18%]">{L.rate}</th>
            <th className="border-r border-black py-1 px-1 w-[40%] text-left">{L.item}</th>
            <th className="border-r border-black py-1 px-1 w-[12%]">{L.nos}</th>
            <th className="border-r border-black py-1 px-1 w-[14%]">{L.weight}</th>
            <th className="py-1 px-1 w-[16%] text-right">{L.amount}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, index) => {
            if (l.is_empty) {
              return (
                <tr key={`empty-${index}`} className="h-6 border-b border-black/30">
                  <td className="border-r border-black">&nbsp;</td>
                  <td className="border-r border-black">&nbsp;</td>
                  <td className="border-r border-black">&nbsp;</td>
                  <td className="border-r border-black">&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              );
            }

            const rateStr = l.rate ? Number(l.rate).toFixed(2) : (l.price ? Number(l.price).toFixed(2) : '');
            const itemName = isTamil ? (l.item_name_ta || l.item_name_en || l.item_name || l.item_name_snapshot) : (l.item_name_en || l.item_name_ta || l.item_name || l.item_name_snapshot);
            const nosStr = l.nos !== undefined ? l.nos : (l.bags !== undefined ? l.bags : (l.qty ? l.qty : ''));
            const weightStr = l.weight !== undefined ? Number(l.weight).toFixed(1) : (l.weight_kg !== undefined ? Number(l.weight_kg).toFixed(1) : '');
            const amountStr = l.amount !== undefined ? Number(l.amount).toFixed(2) : (l.line_total !== undefined ? Number(l.line_total).toFixed(2) : (l.net_amount !== undefined ? Number(l.net_amount).toFixed(2) : ''));

            return (
              <tr key={l.id || index} className="border-b border-black/30 font-medium">
                <td className="border-r border-black py-1 px-1 text-center font-mono">{rateStr}</td>
                <td className="border-r border-black py-1 px-1 text-left font-bold">
                  {itemName}
                  {l.note && <span className="block text-[10px] text-gray-700 font-normal">{l.note}</span>}
                </td>
                <td className="border-r border-black py-1 px-1 text-center">{nosStr}</td>
                <td className="border-r border-black py-1 px-1 text-center font-mono">{weightStr}</td>
                <td className="py-1 px-1 text-right font-mono font-semibold">{amountStr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary / Calculation Breakdown Section */}
      {isCommission ? (
        <div className="mt-0">
          <div className="grid grid-cols-2 text-xs border-b border-black">
            <div className="border-r border-black p-1 space-y-1">
              <div className="flex justify-between">
                <span>{L.commission}</span>
                <span className="font-mono">{Number(bill.commission_amount || 0) > 0 ? Number(bill.commission_amount).toFixed(2) : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>{L.patthu}</span>
                <span className="font-mono">{Number(bill.patthu_amount || 0) > 0 ? Number(bill.patthu_amount).toFixed(2) : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>{L.cooli}</span>
                <span className="font-mono">{Number(bill.cooli_amount || 0) > 0 ? Number(bill.cooli_amount).toFixed(2) : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>{L.vadagai}</span>
                <span className="font-mono">{Number(bill.vadagai_amount || 0) > 0 ? Number(bill.vadagai_amount).toFixed(2) : ''}</span>
              </div>
            </div>

            <div className="p-1 flex flex-col justify-between text-right font-mono">
              <div className="font-bold text-sm">{Number(itemsTotal).toFixed(2)}</div>
              {Number(bill.total_deductions || 0) > 0 && (
                <div className="text-xs">(-) {Number(bill.total_deductions).toFixed(2)}</div>
              )}
              <div className="border-t border-black pt-1 flex justify-between font-bold">
                <span>{Number(bill.total_deductions || 0).toFixed(2)}</span>
                <span className="text-sm">{Number(grandTotalVal).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 px-2 border-t border-black text-sm font-black">
            <span>{L.totalLabel}</span>
            <span className="font-mono text-base">{Number(grandTotalVal).toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-1 px-1 text-xs">
          <div className="flex justify-between items-center font-bold py-0.5">
            <span>{L.totalLabel}</span>
            <span className="font-mono text-sm font-bold">{Number(itemsTotal).toFixed(2)}</span>
          </div>

          {Number(prevBal) > 0 && (
            <div className="flex justify-between items-center font-bold py-0.5">
              <span>{L.prevBalance}</span>
              <span className="font-mono text-sm font-bold">{Number(prevBal).toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-dashed border-black my-1"></div>

          <div className="flex justify-end items-center font-black text-right pt-0.5">
            <span className="font-mono text-lg font-black tracking-tight">
              {Number(grandTotalVal).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
