import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listItems } from '../api/items';
import { listParties } from '../api/parties';
import { listPaymentMethods } from '../api/payments';
import { listPurchases, createPurchase, deletePurchase } from '../api/purchases';
import { formatINR, formatDateDMY, todayISO } from '../utils/format';

export default function Purchases() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [parties, setParties] = useState([]);
  const [methods, setMethods] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [lines, setLines] = useState([]);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [methodId, setMethodId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listItems({ active_only: '1' }).then(setItems);
    listParties({ type: 'supplier' }).then(setParties);
    listPaymentMethods().then(setMethods);
    reload();
  }, []);

  function reload() {
    listPurchases().then(setPurchases);
  }

  function addByCode() {
    const match = items.find((i) => i.code.toLowerCase() === code.trim().toLowerCase());
    if (!match) return;
    setLines((ls) => [
      ...ls,
      { key: Date.now(), item_id: match.id, item_name_ta: match.name_ta, item_name_en: match.name_en, rate: match.default_rate || 0, weight: 0, nos: 0 },
    ]);
    setCode('');
  }

  function updateLine(key, field, value) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }
  function removeLine(key) {
    setLines((ls) => ls.filter((l) => l.key !== key));
  }

  const itemsTotal = lines.reduce((s, l) => s + (Number(l.rate) || 0) * (Number(l.weight) || 0), 0);
  const total = itemsTotal - (Number(discount) || 0);
  const balanceDue = total - (Number(paid) || 0);

  async function handleSave() {
    if (!partyId || lines.length === 0) return;
    setSaving(true);
    try {
      await createPurchase({
        party_id: Number(partyId),
        purchase_date: date,
        lines: lines.map((l) => ({ item_id: l.item_id, item_name_ta: l.item_name_ta, item_name_en: l.item_name_en, rate: Number(l.rate), weight: Number(l.weight), nos: Number(l.nos) })),
        discount_amount: Number(discount) || 0,
        paid_amount: Number(paid) || 0,
        payment_method_id: methodId || null,
      });
      setLines([]);
      setPartyId('');
      setDiscount(0);
      setPaid(0);
      reload();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('common.confirm_delete'))) return;
    await deletePurchase(id);
    reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('nav.purchases')}</h1>

      <div className="card space-y-3">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="label">{t('purchases.supplier')}</label>
            <select className="input" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">—</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('common.date')}</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('items.code')}</label>
            <input
              className="input font-mono uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addByCode()}
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>{t('billing.item')}</th>
              <th>{t('billing.rate')}</th>
              <th>{t('billing.weight')}</th>
              <th>{t('billing.amount')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td>{l.item_name_ta}</td>
                <td>
                  <input className="input w-20" type="number" value={l.rate} onChange={(e) => updateLine(l.key, 'rate', e.target.value)} />
                </td>
                <td>
                  <input className="input w-20" type="number" value={l.weight} onChange={(e) => updateLine(l.key, 'weight', e.target.value)} />
                </td>
                <td>{formatINR((Number(l.rate) || 0) * (Number(l.weight) || 0))}</td>
                <td>
                  <button className="text-red-600" onClick={() => removeLine(l.key)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">{t('billing.discount')}</label>
            <input className="input" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('billing.paid_amount')}</label>
            <input className="input" type="number" value={paid} onChange={(e) => setPaid(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('common.method')}</label>
            <select className="input" value={methodId} onChange={(e) => setMethodId(e.target.value)}>
              <option value="">—</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name_ta}
                </option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">{t('billing.balance_due')}</div>
            <div className="text-xl font-bold">{formatINR(balanceDue)}</div>
          </div>
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {t('common.save')}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('purchases.purchase_no')}</th>
              <th>{t('common.date')}</th>
              <th>{t('purchases.supplier')}</th>
              <th>{t('common.total')}</th>
              <th>{t('billing.paid_amount')}</th>
              <th>{t('billing.balance_due')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{p.purchase_no}</td>
                <td>{formatDateDMY(p.purchase_date)}</td>
                <td>{p.party_name}</td>
                <td>{formatINR(p.total)}</td>
                <td>{formatINR(p.paid_amount)}</td>
                <td>{formatINR(p.balance_due)}</td>
                <td>
                  <button className="text-red-600 underline" onClick={() => handleDelete(p.id)}>
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
