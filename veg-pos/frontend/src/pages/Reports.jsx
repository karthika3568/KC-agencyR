import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  dailySalesReport,
  itemWiseSalesReport,
  topItemsReport,
  partyOutstandingReport,
  commissionReport,
  paymentCollectionReport,
  purchaseReport,
  profitReport,
} from '../api/reports';
import { formatINR, formatDateDMY, todayISO } from '../utils/format';

const REPORTS = [
  'daily_sales',
  'item_wise',
  'top_items',
  'party_outstanding',
  'commission_report',
  'payment_collection',
  'purchase_report',
  'profit',
];

function presetRange(preset) {
  const today = new Date();
  const toISO = (d) => d.toISOString().slice(0, 10);
  if (preset === 'today') return { from: toISO(today), to: toISO(today) };
  if (preset === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: toISO(y), to: toISO(y) };
  }
  if (preset === 'this_week') {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    return { from: toISO(start), to: toISO(today) };
  }
  if (preset === 'this_month') {
    return { from: toISO(new Date(today.getFullYear(), today.getMonth(), 1)), to: toISO(today) };
  }
  if (preset === 'last_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toISO(start), to: toISO(end) };
  }
  return { from: toISO(new Date(today.getFullYear(), today.getMonth(), 1)), to: toISO(today) };
}

export default function Reports() {
  const { t } = useTranslation();
  const [report, setReport] = useState('daily_sales');
  const [range, setRange] = useState(presetRange('this_month'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchers = {
    daily_sales: dailySalesReport,
    item_wise: itemWiseSalesReport,
    top_items: topItemsReport,
    party_outstanding: partyOutstandingReport,
    commission_report: commissionReport,
    payment_collection: paymentCollectionReport,
    purchase_report: purchaseReport,
    profit: profitReport,
  };

  async function run() {
    setLoading(true);
    try {
      const res = await fetchers[report](range);
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold no-print">{t('nav.reports')}</h1>

      <div className="card space-y-3 no-print">
        <div className="flex flex-wrap gap-2">
          {REPORTS.map((r) => (
            <button key={r} className={report === r ? 'btn-primary' : 'btn-secondary'} onClick={() => { setReport(r); setData(null); }}>
              {t(`reports.${r}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {['today', 'yesterday', 'this_week', 'this_month', 'last_month'].map((p) => (
            <button key={p} className="btn-secondary text-xs" onClick={() => setRange(presetRange(p))}>
              {t(`reports.${p}`)}
            </button>
          ))}
          <input type="date" className="input w-36" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <input type="date" className="input w-36" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          <button className="btn-primary" onClick={run} disabled={loading}>
            {t('common.search')}
          </button>
          {data && (
            <button className="btn-secondary" onClick={() => window.print()}>
              {t('common.print')}
            </button>
          )}
        </div>
      </div>

      {data && <ReportView report={report} data={data} range={range} t={t} />}
    </div>
  );
}

function ReportView({ report, data, range, t }) {
  const title = `${t(`reports.${report}`)} (${formatDateDMY(range.from)} - ${formatDateDMY(range.to)})`;

  if (report === 'daily_sales') {
    return (
      <div className="card">
        <h2 className="font-semibold mb-2">{title}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              <th>Bills</th>
              <th>Sales</th>
              <th>Discount</th>
              <th>Cash</th>
              <th>UPI</th>
              <th>Net Banking</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.bill_date}>
                <td>{formatDateDMY(r.bill_date)}</td>
                <td>{r.bill_count}</td>
                <td>{formatINR(r.total_sales)}</td>
                <td>{formatINR(r.total_discount)}</td>
                <td>{formatINR(r.cash)}</td>
                <td>{formatINR(r.upi)}</td>
                <td>{formatINR(r.net_banking)}</td>
                <td>{formatINR(r.credit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm">Commission earned: {formatINR(data.commission_earned)}</p>
      </div>
    );
  }

  if (report === 'item_wise' || report === 'top_items') {
    return (
      <div className="card">
        <h2 className="font-semibold mb-2">{title}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('billing.item')}</th>
              <th>{t('billing.weight')}</th>
              <th>{t('common.amount')}</th>
              {report === 'item_wise' && <th>Bills</th>}
              {report === 'item_wise' && <th>Avg Rate</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((r, idx) => (
              <tr key={idx}>
                <td>{r.item_name_ta} / {r.item_name_en}</td>
                <td>{r.total_weight}</td>
                <td>{formatINR(r.total_amount)}</td>
                {report === 'item_wise' && <td>{r.bill_count}</td>}
                {report === 'item_wise' && <td>{formatINR(r.average_rate)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (report === 'party_outstanding') {
    return (
      <div className="card">
        <h2 className="font-semibold mb-2">{title}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.phone')}</th>
              <th>{t('common.balance')}</th>
              <th>0-7d</th>
              <th>8-30d</th>
              <th>30+d</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.phone}</td>
                <td className={Number(r.balance) < 0 ? 'text-red-600' : ''}>{formatINR(r.balance)}</td>
                <td>{formatINR(r.recent_7d)}</td>
                <td>{formatINR(r.aging_8_30)}</td>
                <td>{formatINR(r.aging_30_plus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (report === 'commission_report') {
    return (
      <div className="card space-y-4">
        <h2 className="font-semibold mb-2">{title}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              <th>Gross</th>
              <th>Commission</th>
              <th>Bills</th>
            </tr>
          </thead>
          <tbody>
            {data.by_day.map((r) => (
              <tr key={r.bill_date}>
                <td>{formatDateDMY(r.bill_date)}</td>
                <td>{formatINR(r.gross_total)}</td>
                <td>{formatINR(r.commission_earned)}</td>
                <td>{r.bill_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Gross</th>
              <th>Commission</th>
              <th>Bills</th>
            </tr>
          </thead>
          <tbody>
            {data.by_supplier.map((r) => (
              <tr key={r.party_id}>
                <td>{r.name}</td>
                <td>{formatINR(r.gross_total)}</td>
                <td>{formatINR(r.commission_earned)}</td>
                <td>{r.bill_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (report === 'payment_collection') {
    return (
      <div className="card">
        <h2 className="font-semibold mb-2">{title}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              <th>{t('common.method')}</th>
              <th>{t('common.total')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, idx) => (
              <tr key={idx}>
                <td>{formatDateDMY(r.payment_date)}</td>
                <td>{r.method}</td>
                <td>{formatINR(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (report === 'purchase_report') {
    return (
      <div className="card">
        <h2 className="font-semibold mb-2">{title}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              <th>Purchases</th>
              <th>{t('common.total')}</th>
              <th>Paid</th>
              <th>{t('billing.balance_due')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.purchase_date}>
                <td>{formatDateDMY(r.purchase_date)}</td>
                <td>{r.purchase_count}</td>
                <td>{formatINR(r.total)}</td>
                <td>{formatINR(r.paid)}</td>
                <td>{formatINR(r.balance_due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (report === 'profit') {
    return (
      <div className="card space-y-2 max-w-md">
        <h2 className="font-semibold mb-2">{title}</h2>
        <Row label="Sales total" value={data.sales_total} />
        <Row label="Commission income" value={data.commission_income} />
        <Row label="Income total" value={data.income_total} />
        <Row label="Purchase total" value={data.purchase_total} />
        <Row label="Profit" value={data.profit} bold />
      </div>
    );
  }

  return null;
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-semibold' : ''}>{label}</span>
      <span className={bold ? 'font-bold' : ''}>{formatINR(value)}</span>
    </div>
  );
}
