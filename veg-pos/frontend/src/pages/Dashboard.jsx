import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardSummary } from '../api/reports';
import { formatINR, formatDateDMY } from '../utils/format';

function Kpi({ label, value, tone = 'brand' }) {
  const toneClasses = {
    brand: 'text-brand-700',
    red: 'text-red-600',
    blue: 'text-blue-600',
  };
  return (
    <div className="card">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${toneClasses[tone]}`}>{formatINR(value)}</div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardSummary().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>{t('common.loading')}</div>;
  if (!data) return null;

  const maxSale = Math.max(1, ...data.last_7_days_sales.map((d) => Number(d.total)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label={t('dashboard.today_sales')} value={data.today_sales} />
        <Kpi label={t('dashboard.today_collection')} value={data.today_collection} tone="blue" />
        <Kpi label={t('dashboard.total_receivable')} value={data.total_receivable} tone="blue" />
        <Kpi label={t('dashboard.total_payable')} value={data.total_payable} tone="red" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3">{t('dashboard.last_7_days')}</h3>
          <div className="flex items-end gap-2 h-40">
            {data.last_7_days_sales.length === 0 && <div className="text-gray-400 text-sm">—</div>}
            {data.last_7_days_sales.map((d) => (
              <div key={d.bill_date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-brand-500 rounded-t"
                  style={{ height: `${Math.max(4, (Number(d.total) / maxSale) * 130)}px` }}
                  title={formatINR(d.total)}
                />
                <div className="text-[10px] text-gray-500">{formatDateDMY(d.bill_date).slice(0, 5)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">{t('dashboard.top_items_month')}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('billing.item')}</th>
                <th>{t('billing.weight')}</th>
                <th>{t('billing.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {data.top_items_month.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.item_name_ta} / {it.item_name_en}</td>
                  <td>{it.total_weight}</td>
                  <td>{formatINR(it.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
