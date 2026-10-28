import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { invoicesApi } from '../api/invoices';
import { ThermalTemplate } from '../print/ThermalTemplate';
import { A4Template } from '../print/A4Template';
import { A5Template } from '../print/A5Template';
import '../print/print.css';

export function InvoicePrint() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    invoicesApi.print(id).then(setData).catch((err) => setError(err?.response?.data?.error || 'Failed to load'));
  }, [id]);

  const defaultFormat = data?.branch_print_settings?.printer_type === 'a5'
    ? 'a5'
    : (data?.branch_print_settings?.printer_type?.startsWith('thermal') ? 'thermal' : 'a4');

  const format = searchParams.get('format') || defaultFormat;

  const whatsappHref = () => {
    if (!data) return '#';
    const phone = (data.invoice.customer_phone || '').replace(/\D/g, '');
    const agencyName = (data.branch?.print_name || 'KC AGENCY').replace(/AJ\s*AGENCY/gi, 'KC AGENCY');
    const text = encodeURIComponent(
      `Hi! Your invoice ${data.invoice.invoice_no || ''} from ${agencyName} — Total: Rs. ${data.invoice.grand_total}. Thank you for your business!`
    );
    return `https://wa.me/${phone ? '91' + phone : ''}?text=${text}`;
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="no-print mx-auto mb-4 flex flex-wrap items-center gap-2 max-w-3xl rounded-lg bg-white p-3 shadow-sm">
        <span className="text-sm font-medium text-gray-600">Format:</span>
        <button
          type="button"
          onClick={() => setSearchParams({ format: 'thermal' })}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${format === 'thermal' ? 'bg-[#6F2DA8] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Thermal (80mm)
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ format: 'a4' })}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${format === 'a4' ? 'bg-[#6F2DA8] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          A4
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ format: 'a5' })}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${format === 'a5' ? 'bg-[#6F2DA8] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          A5
        </button>
        <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          <button onClick={() => window.print()} className="rounded bg-emerald-600 hover:bg-emerald-700 font-semibold px-3 py-1 text-sm text-white transition-colors">
            Print
          </button>
          {data.invoice.customer_phone && (
            <a href={whatsappHref()} target="_blank" rel="noreferrer" className="rounded bg-green-600 px-3 py-1 text-sm text-white">
              Share via WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="overflow-x-auto max-w-full px-2 sm:px-0">
        <div className="mx-auto w-fit rounded-lg bg-white p-4 sm:p-6 shadow-sm">
          {format === 'a5' && <style>{`@page { size: A5 portrait; margin: 3.5mm; }`}</style>}
          {format === 'a4' && <style>{`@page { size: A4 portrait; margin: 5mm; }`}</style>}
          {format === 'thermal' && <style>{`@page { size: 80mm auto; margin: 2mm; }`}</style>}
          {format === 'thermal' ? (
            <ThermalTemplate data={data} />
          ) : format === 'a5' ? (
            <A5Template data={data} />
          ) : (
            <A4Template data={data} />
          )}
        </div>
      </div>
    </div>
  );
}
