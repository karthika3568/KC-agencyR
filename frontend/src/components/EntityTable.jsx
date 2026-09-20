import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './Button.jsx';

/**
 * Generic "add row + list + delete" manager for simple catalog/party lookup
 * tables (categories, brands, tax codes, routes, ...). Not meant for items or
 * customers, which have dedicated richer forms.
 */
export function EntityTable({ title, fields, columns, rows, onCreate, onDelete, canManage }) {
  const emptyForm = Object.fromEntries(fields.map((f) => [f.name, f.default ?? '']));
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onCreate(form);
      setForm(emptyForm);
    } catch (err) {
      setError(err?.response?.data?.errors?.join(', ') || err?.response?.data?.error || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="border-b border-border-soft px-4 py-3 font-semibold text-ink">{title}</div>

      {canManage && (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 border-b border-border-soft px-4 py-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="mb-1 block text-xs font-medium text-ink-muted">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={form[f.name]}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  className="input w-32"
                  required={f.required}
                >
                  <option value="">--</option>
                  {f.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  value={form[f.name]}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  className="input w-32"
                  required={f.required}
                  step={f.type === 'number' ? 'any' : undefined}
                />
              )}
            </div>
          ))}
          <Button type="submit" disabled={submitting} size="sm" icon={<Plus size={14} />}>
            Add
          </Button>
          {error && <span className="text-sm text-danger">{error}</span>}
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft bg-page/60 text-left text-xs uppercase text-ink-muted">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-2 font-medium">
                {c.label}
              </th>
            ))}
            {canManage && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border-soft last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2 text-ink">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
              {canManage && (
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => onDelete(row.id)}
                    className="text-xs font-medium text-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-ink-muted">
                No records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
