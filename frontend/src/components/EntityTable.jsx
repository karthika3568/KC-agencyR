import { useState } from 'react';

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
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-800">{title}</div>

      {canManage && (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 border-b border-gray-100 px-4 py-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="mb-1 block text-xs font-medium text-gray-500">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={form[f.name]}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
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
                  className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
                  required={f.required}
                  step={f.type === 'number' ? 'any' : undefined}
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
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
            <tr key={row.id} className="border-b border-gray-50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2 text-gray-700">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
              {canManage && (
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => onDelete(row.id)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-gray-400">
                No records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
