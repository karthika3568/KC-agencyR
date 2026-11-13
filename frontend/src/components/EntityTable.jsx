import { useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from './Button.jsx';
import { Pagination } from './Pagination.jsx';
import { useClientPagination } from '../hooks/useClientPagination';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { handleFormKeyDown } from '../utils/formNavigation';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { useEscNavigation, useUnsavedChangesGuard, ESC_PRIORITY } from '../utils/escNavigation.jsx';

function FieldInput({ f, value, onChange }) {
  if (f.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input w-full sm:w-32" required={f.required}>
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
      className="input w-full sm:w-32"
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
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const initialEditRef = useRef(null);

  useEscNavigation({
    priority: ESC_PRIORITY.NESTED_SCREEN,
    onEsc: () => {
      setEditingId(null);
      initialEditRef.current = null;
    },
    enabled: Boolean(editingId),
    hasUnsavedChanges: () => initialEditRef.current !== null && JSON.stringify(editForm) !== initialEditRef.current,
    confirmTitle: 'Discard row edits?',
    confirmMessage: 'You have unsaved changes to this row. Discard them and cancel editing?',
  });

  useUnsavedChangesGuard(!editingId && JSON.stringify(form) !== JSON.stringify(emptyForm), {
    title: 'Discard new entry?',
    message: `You have unsaved fields in "${title}". Leave without saving?`,
  });

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
    const nextEditForm = Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? f.default ?? '']));
    setEditingId(row.id);
    setEditError('');
    setEditForm(nextEditForm);
    initialEditRef.current = JSON.stringify(nextEditForm);
  };

  const saveEdit = async (id) => {
    setEditError('');
    try {
      await onUpdate(id, editForm);
      setEditingId(null);
      initialEditRef.current = null;
    } catch (err) {
      setEditError(err?.response?.data?.errors?.join(', ') || err?.response?.data?.error || 'Update failed');
    }
  };

  const handleDelete = (id, label) => {
    setDeleteError('');
    setPendingDelete({ id, label });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err?.response?.data?.error || 'Unable to delete this record.');
    } finally {
      setDeleting(false);
    }
  };

  const isMobile = useMediaQuery('(max-width: 639px)');
  const {
    page,
    setPage,
    total,
    paginatedItems: pagedRows,
  } = useClientPagination(rows, 10);

  return (
    <div className="card min-w-0">
      <div className="border-b border-border-soft px-4 py-2.5 font-semibold text-ink text-sm">{title}</div>

      {canManage && (
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="flex flex-wrap items-end gap-2 border-b border-border-soft px-4 py-2.5">
          {fields.map((f) => (
            <div key={f.name} className="w-full sm:w-auto">
              <label className="mb-0.5 block text-[11px] font-medium text-ink-muted">{f.label}</label>
              <FieldInput f={f} value={form[f.name]} onChange={(v) => handleChange(f.name, v)} />
            </div>
          ))}
          <Button type="submit" disabled={submitting} size="sm" icon={<Plus size={14} />} className="w-full sm:w-auto">
            Add
          </Button>
          {error && <span className="text-xs text-danger w-full sm:w-auto">{error}</span>}
        </form>
      )}

      {isMobile ? (
        <div className="divide-y divide-border-soft max-h-[calc(100vh-220px)] overflow-y-auto">
          {pagedRows.map((row) =>
            editingId === row.id ? (
              <div key={row.id} className="p-3 bg-primary-soft/30 space-y-2.5">
                <div data-form-container="true" onKeyDown={handleFormKeyDown} className="grid grid-cols-1 gap-2">
                  {fields.map((f) => (
                    <div key={f.name}>
                      <label className="mb-1 block text-xs font-medium text-ink-muted">{f.label}</label>
                      <FieldInput f={f} value={editForm[f.name]} onChange={(v) => setEditForm((p) => ({ ...p, [f.name]: v }))} />
                    </div>
                  ))}
                  {editError && <span className="text-xs text-danger">{editError}</span>}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-soft bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-lavender-100 min-h-[36px]"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(row.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 min-h-[36px]"
                  >
                    <Check size={14} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div key={row.id} className="p-3 hover:bg-lavender-50/40 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-sm font-semibold text-ink break-words">
                      {columns[0].render ? columns[0].render(row) : row[columns[0].key]}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                      {columns.slice(1).map((c) => (
                        <div key={c.key} className="flex items-center gap-1">
                          <span className="text-[11px] uppercase tracking-wider">{c.label}:</span>
                          <span className="font-medium text-ink">{c.render ? c.render(row) : row[c.key]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      {onUpdate && (
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          title="Edit"
                          className="rounded-lg p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-ink-muted hover:bg-lavender-100 hover:text-primary transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id, row[columns[0].key])}
                        title="Delete"
                        className="rounded-lg p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-ink-muted hover:bg-danger-bg hover:text-danger transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {rows.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-ink-muted">No records yet.</div>
          )}
        </div>
      ) : (
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
      )}

      {pendingDelete && (
        <ConfirmDialog
          variant="danger"
          title="Delete this record?"
          message={`Delete "${pendingDelete.label}"? This cannot be undone.`}
          details={deleteError ? <span className="text-rose-600">{deleteError}</span> : null}
          confirmLabel="Delete"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} />
    </div>
  );
}
