import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { invoicesApi } from '../api/invoices';
import { vanStockIssuesApi } from '../api/purchasing';
import { ThermalTemplate } from '../print/ThermalTemplate';
import { A4Template } from '../print/A4Template';
import { A5Template } from '../print/A5Template';
import { Button } from './Button.jsx';
import '../print/print.css';

/**
 * Transforms a stock issue transaction into the KC Agency bill presentation format.
 * Maps issue number, date, salesman, branch, product list, unit prices, and line totals
 * without fabricating sales customer, tax, or payment info.
 */
export function adaptStockIssueToPrintData(issue) {
  if (!issue) return null;
  const rawItems = issue.items || [];
  const items = rawItems.map((it, idx) => {
    const qty = Number(it.quantity ?? it.qty ?? 0);
    const unitPrice = Number(it.unit_price ?? it.rate ?? 0);
    const lineAmount = Number(it.line_amount ?? it.amount ?? (qty * unitPrice));
    return {
      id: it.id || idx,
      item_name: it.item_name || it.name || '',
      item_name_snapshot: it.item_name || it.name || '',
      sku: it.sku || it.item_code || '',
      item_code: it.sku || it.item_code || '',
      unit: it.unit || it.unit_code || 'PCS',
      unit_code: it.unit || it.unit_code || 'PCS',
      qty: qty,
      rate: unitPrice,
      unit_price: unitPrice,
      line_total: lineAmount,
      net_amount: lineAmount,
    };
  });

  const totalQty = issue.total_qty != null
    ? Number(issue.total_qty)
    : items.reduce((s, it) => s + it.qty, 0);

  const totalAmount = issue.total_amount != null
    ? Number(issue.total_amount)
    : items.reduce((s, it) => s + it.line_total, 0);

  const issueNo = issue.issue_no || (`VSI-${String(issue.id || '').padStart(5, '0')}`);
  const issueDate = issue.issued_at || issue.created_at || new Date().toISOString();
  const salesmanName = issue.salesman_name || issue.salesman?.name || issue.employee_name || 'Salesman';
  const salesmanCode = issue.salesman_code || issue.salesman?.code || '';
  const salesmanPhone = issue.salesman_phone || issue.salesman?.phone || '';
  const branchName = issue.branch_name || issue.branch?.name || 'Main Branch';
  const customerName = issue.customer_name || '';
  const customerPhone = issue.customer_phone || '';
  const prebookingNo = issue.prebooking_no || '';
  const notes = issue.notes || '';

  return {
    is_stock_issue: true,
    title: 'STOCK ISSUE BILL',
    invoice: {
      invoice_no: issueNo,
      invoice_date: issueDate,
      salesman_name: salesmanName,
      salesman_code: salesmanCode,
      salesman_phone: salesmanPhone,
      customer_name: customerName,
      customer_phone: customerPhone,
      prebooking_no: prebookingNo,
      branch_name: branchName,
      notes: notes,
      items: items,
      grand_total: totalAmount,
      subtotal: totalAmount,
      taxable_value: totalAmount,
    },
    customer: customerName ? { ledger_name: customerName, name: customerName, phone: customerPhone } : null,
    branch: {
      name: branchName,
      print_name: 'KC AGENCY',
    },
    tax_slabs: [],
    amount_in_words: issue.amount_in_words || '',
    total_qty: totalQty,
    total_amount: totalAmount,
  };
}

/**
 * In-app print preview — replaces the old window.open(new tab) flow.
 * Rendered via portal directly into <body> so print.css's
 * `body.has-print-modal #root { display: none }` rule can hide the app
 * shell and print only this modal's content.
 *
 * Supports both sales invoices (invoiceId) and van stock issues (stockIssue / issueId)
 * reusing the established KC Agency bill templates (A4 and Thermal 80mm).
 */
export function PrintPreviewModal({ invoiceId, stockIssue, issueId, onClose }) {
  const isStockIssue = Boolean(stockIssue || issueId);
  const [format, setFormat] = useState(isStockIssue ? 'a4' : 'thermal');
  const [data, setData] = useState(() => (stockIssue ? adaptStockIssueToPrintData(stockIssue) : null));
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('has-print-modal');
    return () => document.body.classList.remove('has-print-modal');
  }, []);

  useEffect(() => {
    if (invoiceId) {
      invoicesApi.print(invoiceId)
        .then((res) => {
          setData(res);
          const pType = res?.branch_print_settings?.printer_type;
          if (pType === 'a5') {
            setFormat('a5');
          } else if (pType === 'a4') {
            setFormat('a4');
          } else if (pType?.startsWith('thermal')) {
            setFormat('thermal');
          }
        })
        .catch((err) => setError(err?.response?.data?.error || 'Failed to load invoice print data'));
    } else if (stockIssue?.id || issueId) {
      const targetId = stockIssue?.id || issueId;
      vanStockIssuesApi.get(targetId)
        .then((fullIssue) => {
          setData(adaptStockIssueToPrintData(fullIssue));
        })
        .catch((err) => {
          if (!stockIssue) {
            setError(err?.response?.data?.error || 'Failed to load stock issue print data');
          }
        });
    }
  }, [invoiceId, issueId, stockIssue?.id]);

  const whatsappHref = () => {
    if (!data) return '#';
    if (data.is_stock_issue) {
      const phone = (data.invoice.salesman_phone || '').replace(/\D/g, '');
      const text = encodeURIComponent(
        `Hi ${data.invoice.salesman_name || ''}! Stock Issue ${data.invoice.invoice_no || ''} from KC AGENCY — Total Qty: ${data.total_qty}, Total Value: Rs. ${data.total_amount}.`
      );
      return `https://wa.me/${phone ? '91' + phone : ''}?text=${text}`;
    }
    const phone = (data.invoice.customer_phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hi! Your invoice ${data.invoice.invoice_no || ''} from ${data.branch?.print_name || 'KC AGENCY'} — Total: Rs. ${data.invoice.grand_total}. Thank you for your business!`
    );
    return `https://wa.me/${phone ? '91' + phone : ''}?text=${text}`;
  };

  const hasPhone = data?.invoice?.customer_phone || (data?.is_stock_issue && data?.invoice?.salesman_phone);

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-auto bg-black/40 py-6">
      <div className="no-print mx-auto mb-4 flex flex-wrap items-center gap-2 max-w-3xl rounded-lg bg-white p-3 shadow-sm">
        <span className="text-sm font-medium text-gray-600">Format:</span>
        <button
          type="button"
          onClick={() => setFormat('thermal')}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${format === 'thermal' ? 'bg-[#6F2DA8] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Thermal (80mm)
        </button>
        <button
          type="button"
          onClick={() => setFormat('a4')}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${format === 'a4' ? 'bg-[#6F2DA8] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          A4
        </button>
        <button
          type="button"
          onClick={() => setFormat('a5')}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${format === 'a5' ? 'bg-[#6F2DA8] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          A5
        </button>
        <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          {hasPhone && (
            <a href={whatsappHref()} target="_blank" rel="noreferrer" className="rounded bg-green-600 px-3 py-1 text-sm text-white">
              Share via WhatsApp
            </a>
          )}
          <Button icon={<Printer size={14} />} onClick={() => window.print()}>Print</Button>
          <Button variant="secondary" icon={<X size={14} />} onClick={onClose}>Close</Button>
        </div>
      </div>

      {error && <div className="mx-auto w-fit rounded-lg bg-white p-6 text-red-600 shadow-sm">{error}</div>}
      {!error && !data && <div className="mx-auto w-fit rounded-lg bg-white p-6 text-gray-500 shadow-sm">Loading…</div>}
      {data && (
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
      )}
    </div>,
    document.body
  );
}
