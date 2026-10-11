import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listParties, createParty, updateParty, deleteParty, getPartyLedger } from '../api/parties';
import { formatINR, formatDateDMY } from '../utils/format';

const BLANK = { name: '', phone: '', place: '', type: 'customer', opening_balance: 0 };

export default function Parties() {
  const { t } = useTranslation();
  const [parties, setParties] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [ledgerParty, setLedgerParty] = useState(null);
  const [ledger, setLedger] = useState(null);

  function load() {
    listParties({ q }).then(setParties);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function handleSave(e) {
    e.preventDefault();
    if (form.id) {
      await updateParty(form.id, form);
    } else {
      await createParty(form);
    }
    setForm(null);
    load();
  }

  async function handleDelete(id) {
    if (!window.confirm(t('common.confirm_delete'))) return;
    await deleteParty(id);
    load();
  }

  async function openLedger(party) {
    setLedgerParty(party);
    const data = await getPartyLedger(party.id);
    setLedger(data);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('nav.parties')}</h1>
        <button className="btn-primary" onClick={() => setForm(BLANK)}>
          + {t('common.add')}
        </button>
      </div>

      <input className="input max-w-sm" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.phone')}</th>
              <th>{t('common.place')}</th>
              <th>{t('parties.type')}</th>
              <th>{t('common.balance')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {parties.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.phone}</td>
                <td>{p.place}</td>
                <td>{t(`parties.type_${p.type}`)}</td>
                <td className={Number(p.balance) < 0 ? 'text-red-600' : 'text-brand-700'}>{formatINR(p.balance)}</td>
                <td className="space-x-2">
                  <button className="text-brand-700 underline" onClick={() => openLedger(p)}>
                    {t('parties.view_ledger')}
                  </button>
                  <button className="text-brand-700 underline" onClick={() => setForm(p)}>
                    {t('common.edit')}
                  </button>
                  <button className="text-red-600 underline" onClick={() => handleDelete(p.id)}>
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print">
          <form onSubmit={handleSave} className="card w-full max-w-md space-y-3">
            <h2 className="font-bold text-lg">{form.id ? t('common.edit') : t('common.add')}</h2>
            <div>
              <label className="label">{t('common.name')}</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('common.phone')}</label>
                <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('common.place')}</label>
                <input className="input" value={form.place || ''} onChange={(e) => setForm({ ...form, place: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">{t('parties.type')}</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="customer">{t('parties.type_customer')}</option>
                <option value="supplier">{t('parties.type_supplier')}</option>
                <option value="both">{t('parties.type_both')}</option>
              </select>
            </div>
            {!form.id && (
              <div>
                <label className="label">{t('parties.opening_balance')}</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.opening_balance}
                  onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">+ = party owes shop, − = shop owes party</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </div>
      )}

      {ledgerParty && ledger && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print p-4">
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">{ledgerParty.name} — {t('parties.ledger')}</h2>
              <button className="btn-secondary" onClick={() => { setLedgerParty(null); setLedger(null); }}>
                {t('common.close')}
              </button>
            </div>
            <div className="text-sm">
              {t('common.balance')}:{' '}
              <span className={ledger.current_balance < 0 ? 'text-red-600 font-bold' : 'text-brand-700 font-bold'}>
                {formatINR(ledger.current_balance)}
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>Ref</th>
                  <th>{t('common.amount')}</th>
                  <th>{t('common.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.entries.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDateDMY(e.entry_date)}</td>
                    <td>{e.description}</td>
                    <td className={Number(e.amount) < 0 ? 'text-red-600' : ''}>{formatINR(e.amount)}</td>
                    <td>{formatINR(e.running_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
