import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from './Button.jsx';
import { Pagination } from './Pagination.jsx';
import { useClientPagination } from '../hooks/useClientPagination';
import { handleFormKeyDown } from '../utils/formNavigation';

function FieldInput({ f, value, onChange }) {
  if (f.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input w-32" required={f.required}>
        <option value="">--</option>
        {f.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={f.type || 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input w-32"
      required={f.required}
      step={f.type === 'number' ? 'any' : undefined}
    />
  );
}

/**
 * Generic "add row + list + edit + delete" manager for simple catalog/party
 * lookup tables (categories, brands, tax codes, ...). Pass onUpdate
 * to enable inline row editing — every table using this component gets
 * real Edit, not just Create, for free.
 */
export function EntityTable({ title, fields, columns, rows, onCreate, onUpdate, onDelete, canManage }) {
  const emptyForm = Object.fromEntries(fields.map((f) => [f.name, f.default ?? '']));
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');

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

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditError('');
    setEditForm(Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? f.default ?? ''])));
  };

  const saveEdit = async (id) => {
    setEditError('');
    try {
      await onUpdate(id, editForm);
      setEditingId(null);
    } catch (err) {
      setEditError(err?.response?.data?.errors?.join(', ') || err?.response?.data?.error || 'Update failed');
    }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    await onDelete(id);
  };

  const {
    page,
    setPage,
    total,
    paginatedItems: pagedRows,
  } = useClientPagination(rows, 10);

  return (
    <div className="card">
      <div className="border-b border-border-soft px-4 py-2.5 font-semibold text-ink text-sm">{title}</div>

      {canManage && (
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="flex flex-wrap items-end gap-2 border-b border-border-soft px-4 py-2.5">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="mb-0.5 block text-[11px] font-medium text-ink-muted">{f.label}</label>
              <FieldInput f={f} value={form[f.name]} onChange={(v) => handleChange(f.name, v)} />
            </div>
          ))}
          <Button type="submit" disabled={submitting} size="sm" icon={<Plus size={14} />}>
            Add
          </Button>
          {error && <span className="text-xs text-danger">{error}</span>}
        </form>
      )}

      <div className="overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-soft bg-lavender-50 text-left text-[11px] uppercase text-ink-muted font-semibold tracking-wider sticky top-0 bg-lavender-50 z-10">
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2 font-semibold">
                  {c.label}
                </th>
              ))}
              {canManage && <th className="px-3 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
          {pagedRows.map((row) =>
            editingId === row.id ? (
              <tr key={row.id} className="border-b border-border-soft bg-primary-soft/30 last:border-0">
                <td colSpan={columns.length} className="px-4 py-2.5">
                  <div data-form-container="true" onKeyDown={handleFormKeyDown} className="flex flex-wrap items-end gap-2">
                    {fields.map((f) => (
                      <div key={f.name}>
                        <label className="mb-1 block text-xs font-medium text-ink-muted">{f.label}</label>
                        <FieldInput f={f} value={editForm[f.name]} onChange={(v) => setEditForm((p) => ({ ...p, [f.name]: v }))} />
                      </div>
                    ))}
                    {editError && <span className="text-sm text-danger">{editError}</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => saveEdit(row.id)} title="Save" className="rounded-lg p-1.5 text-success hover:bg-success-bg">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} title="Cancel" className="rounded-lg p-1.5 text-ink-muted hover:bg-lavender-100">
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={row.id} className="border-b border-border-soft hover:bg-lavender-50/50 transition-colors last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-1.5 text-ink">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
                {canManage && (
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex justify-end gap-1">
                      {onUpdate && (
                        <button onClick={() => startEdit(row)} title="Edit" className="rounded-lg p-1 text-ink-muted hover:bg-lavender-100 hover:text-primary transition-colors">
                          <Pencil size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(row.id, row[columns[0].key])}
                        title="Delete"
                        className="rounded-lg p-1 text-ink-muted hover:bg-danger-bg hover:text-danger transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )
          )}
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
    <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} />
  </div>
);
}
