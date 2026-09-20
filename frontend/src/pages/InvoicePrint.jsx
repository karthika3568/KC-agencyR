import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { invoicesApi } from '../api/invoices';
import { ThermalTemplate } from '../print/ThermalTemplate';
import { A4Template } from '../print/A4Template';
import '../print/print.css';

export function InvoicePrint() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const format = searchParams.get('format') || 'a4';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    invoicesApi.print(id).then(setData).catch((err) => setError(err?.response?.data?.error || 'Failed to load'));
  }, [id]);

  const whatsappHref = () => {
    if (!data) return '#';
    const phone = (data.invoice.customer_phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hi! Your invoice ${data.invoice.invoice_no || ''} from ${data.branch.print_name} — Total: Rs. ${data.invoice.grand_total}. Thank you for your business!`
    );
    return `https://wa.me/${phone ? '91' + phone : ''}?text=${text}`;
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
        <span className="text-sm font-medium text-gray-600">Format:</span>
        <button
          onClick={() => setSearchParams({ format: 'thermal' })}
          className={`rounded px-3 py-1 text-sm ${format === 'thermal' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Thermal (80mm)
        </button>
        <button
          onClick={() => setSearchParams({ format: 'a4' })}
          className={`rounded px-3 py-1 text-sm ${format === 'a4' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          A4
        </button>
        <button onClick={() => window.print()} className="ml-auto rounded bg-gray-800 px-3 py-1 text-sm text-white">
          Print
        </button>
        {data.invoice.customer_phone && (
          <a href={whatsappHref()} target="_blank" rel="noreferrer" className="rounded bg-green-600 px-3 py-1 text-sm text-white">
            Share via WhatsApp
          </a>
        )}
      </div>

      <div className="mx-auto w-fit rounded-lg bg-white p-6 shadow-sm">
        {format === 'thermal' ? <ThermalTemplate data={data} /> : <A4Template data={data} />}
      </div>
    </div>
  );
}
