import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listItems, createItem, updateItem, deleteItem } from '../api/items';

const BLANK = { name_ta: '', name_en: '', code: '', unit: 'kg', default_rate: '', is_charge_item: false, active: true };

export default function Items() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);

  function load() {
    listItems({ q, active_only: '0' }).then(setItems);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function handleSave(e) {
    e.preventDefault();
    const payload = { ...form, default_rate: form.default_rate === '' ? null : Number(form.default_rate) };
    if (form.id) {
      await updateItem(form.id, payload);
    } else {
      await createItem(payload);
    }
    setForm(null);
    load();
  }

  async function handleDelete(id) {
    if (!window.confirm(t('common.confirm_delete'))) return;
    await deleteItem(id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('nav.items')}</h1>
        <button className="btn-primary" onClick={() => setForm(BLANK)}>
          + {t('common.add')}
        </button>
      </div>

      <input className="input max-w-sm" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('items.code')}</th>
              <th>{t('items.name_ta')}</th>
              <th>{t('items.name_en')}</th>
              <th>{t('items.unit')}</th>
              <th>{t('items.default_rate')}</th>
              <th>{t('items.charge_item')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="font-mono">{it.code}</td>
                <td>{it.name_ta}</td>
                <td>{it.name_en}</td>
                <td>{it.unit}</td>
                <td>{it.default_rate ?? '—'}</td>
                <td>{it.is_charge_item ? t('common.yes') : t('common.no')}</td>
                <td>{it.active ? t('common.active') : t('common.inactive')}</td>
                <td className="space-x-2">
                  <button className="text-brand-700 underline" onClick={() => setForm(it)}>
                    {t('common.edit')}
                  </button>
                  <button className="text-red-600 underline" onClick={() => handleDelete(it.id)}>
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
              <label className="label">{t('items.name_ta')}</label>
              <input className="input" required value={form.name_ta} onChange={(e) => setForm({ ...form, name_ta: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('items.name_en')}</label>
              <input className="input" required value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('items.code')}</label>
                <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="label">{t('items.unit')}</label>
                <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">{t('items.default_rate')}</label>
              <input className="input" type="number" step="0.01" value={form.default_rate ?? ''} onChange={(e) => setForm({ ...form, default_rate: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_charge_item} onChange={(e) => setForm({ ...form, is_charge_item: e.target.checked })} />
              {t('items.charge_item')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              {t('common.active')}
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
