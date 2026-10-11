import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getBillPrint } from '../api/bills';
import SurandaiInvoice from '../components/SurandaiInvoice';

export default function PrintBill() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = useState(null);
  const [formatMode, setFormatMode] = useState(null); // 'commission' | 'normal' | null
  const [language, setLanguage] = useState('ta');

  useEffect(() => {
    getBillPrint(id).then((res) => {
      setPayload(res);
      if (res && res.settings && res.settings.invoice_language) {
        setLanguage(res.settings.invoice_language);
      }
    });
  }, [id]);

  if (!payload) return <div className="p-8 text-center text-gray-500 font-bold">Loading Invoice...</div>;

  const { bill, settings } = payload;
  const paperFormat = params.get('format') || settings.default_print_format || 'slip';
  const activeIsCommission = formatMode !== null 
    ? formatMode === 'commission' 
    : bill.bill_type === 'commission';

  return (
    <div className="min-h-screen bg-gray-200 pb-12">
      {/* Print Page Styles */}
      <style>{`
        @page {
          size: ${paperFormat === 'a4' ? 'A4' : paperFormat === 'a5' ? 'A5' : 'auto'};
          margin: 4mm;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { padding: 0 !important; margin: 0 !important; background: transparent !important; }
          .surandai-invoice-slip { border: 2px solid #000 !important; max-width: 100% !important; box-shadow: none !important; }
        }
      `}</style>

      {/* Top Action & Mode Selector Bar (Hidden on Print) */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-gray-300 shadow-sm p-3 mb-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
          
          {/* Back Button */}
          <button
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-3.5 py-1.5 rounded text-xs flex items-center gap-1.5 shadow transition-all"
            onClick={() => navigate('/invoices')}
            title="Return to Invoices list"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>பின்செல்க (Back)</span>
          </button>

          {/* Format Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700 text-xs">பில் வடிவம்:</span>
            <button
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                activeIsCommission 
                  ? 'bg-green-700 text-white shadow' 
                  : 'bg-gray-100 text-gray-700 border hover:bg-gray-200'
              }`}
              onClick={() => setFormatMode('commission')}
            >
              கமிஷன் பில் (Commission Bill)
            </button>
            <button
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                !activeIsCommission 
                  ? 'bg-blue-700 text-white shadow' 
                  : 'bg-gray-100 text-gray-700 border hover:bg-gray-200'
              }`}
              onClick={() => setFormatMode('normal')}
            >
              சாதாரண பில் (Normal Bill)
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <button
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                language === 'ta' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 border'
              }`}
              onClick={() => setLanguage('ta')}
            >
              தமிழ்
            </button>
            <button
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                language === 'en' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 border'
              }`}
              onClick={() => setLanguage('en')}
            >
              English
            </button>
          </div>

          {/* Paper Size Selector */}
          <div className="flex items-center gap-1.5">
            {['slip', 'a5', 'a4'].map((f) => (
              <button
                key={f}
                className={`px-2.5 py-1 rounded text-xs uppercase font-bold ${
                  f === paperFormat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 border'
                }`}
                onClick={() => setParams({ format: f })}
              >
                {f === 'slip' ? 'Slip' : f}
              </button>
            ))}
          </div>

          {/* Print Button */}
          <button
            className="bg-brand-700 hover:bg-brand-800 text-white font-bold px-5 py-1.5 rounded text-sm flex items-center gap-1.5 shadow"
            onClick={() => window.print()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 002-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Bill
          </button>
        </div>
      </div>

      {/* Main Print Container */}
      <div className="print-container max-w-xl mx-auto px-4">
        <SurandaiInvoice
          bill={bill}
          settings={settings}
          isCommissionView={activeIsCommission}
          lang={language}
        />
      </div>
    </div>
  );
}
