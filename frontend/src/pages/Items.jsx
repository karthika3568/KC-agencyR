import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listItems, createItem, updateItem, deleteItem } from '../api/items';
import { handleFormKeyDown } from '../utils/formNavigation';

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

      <div className="card overflow-hidden">
        {/* Mobile & Tablet Card View (< md) */}
        <div className="md:hidden divide-y divide-border-soft max-h-[calc(100dvh-240px)] overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="p-3 space-y-2 hover:bg-page/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink break-words">{it.name_en || it.name_ta}</div>
                  {it.name_ta && it.name_en && (
                    <div className="text-xs text-ink-muted">{it.name_ta}</div>
                  )}
                  <div className="text-[11px] text-ink-muted font-mono mt-0.5">Code: {it.code}</div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                  it.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {it.active ? t('common.active') : t('common.inactive')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-surface-subtle/40 p-2 text-[11px]">
                <div>
                  <div className="text-[10px] uppercase text-ink-muted">{t('items.unit')}</div>
                  <div className="font-semibold text-ink">{it.unit}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-muted">{t('items.default_rate')}</div>
                  <div className="font-semibold text-ink">{it.default_rate ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-muted">{t('items.charge_item')}</div>
                  <div className="font-semibold text-ink">{it.is_charge_item ? t('common.yes') : t('common.no')}</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-border-soft/60">
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-border-soft bg-slate-50 px-2.5 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 min-h-[32px]"
                  onClick={() => setForm(it)}
                  title={t('common.edit')}
                  type="button"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>{t('common.edit')}</span>
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-border-soft bg-slate-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 min-h-[32px]"
                  onClick={() => handleDelete(it.id)}
                  title={t('common.delete')}
                  type="button"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>{t('common.delete')}</span>
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-6 text-center text-xs text-ink-muted">No items found.</div>
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
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
                <td className="py-2 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors inline-flex items-center justify-center"
                      onClick={() => setForm(it)}
                      title={t('common.edit')}
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors inline-flex items-center justify-center"
                      onClick={() => handleDelete(it.id)}
                      title={t('common.delete')}
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print">
          <form onSubmit={handleSave} onKeyDown={handleFormKeyDown} className="card w-full max-w-md space-y-3">
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
