import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listUsers, createUser, updateUser, getAuditLog } from '../api/settings';
import { formatDateDMY } from '../utils/format';

const BLANK = { name: '', username: '', password: '', pin: '', role: 'staff' };

export default function Users({ embedded = false }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [audit, setAudit] = useState([]);
  const [showAudit, setShowAudit] = useState(false);

  function load() {
    listUsers().then(setUsers);
  }

  useEffect(load, []);

  async function handleSave(e) {
    e.preventDefault();
    if (form.id) {
      await updateUser(form.id, form);
    } else {
      await createUser(form);
    }
    setForm(null);
    load();
  }

  async function openAudit() {
    const rows = await getAuditLog();
    setAudit(rows);
    setShowAudit(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!embedded ? (
          <h1 className="text-xl font-bold">{t('nav.users')}</h1>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-gray-800">{t('nav.users')}</h2>
            <p className="text-xs text-gray-500">Manage operator logins and access roles</p>
          </div>
        )}
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={openAudit}>
            Audit Log
          </button>
          <button className="btn-primary" onClick={() => setForm(BLANK)}>
            + {t('common.add')}
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>Username</th>
              <th>Role</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.active ? t('common.active') : t('common.inactive')}</td>
                <td>
                  <button className="text-brand-700 underline" onClick={() => setForm({ ...u, password: '', pin: '' })}>
                    {t('common.edit')}
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
            {!form.id && (
              <div>
                <label className="label">Username</label>
                <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
            )}
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Billing Staff</option>
              </select>
            </div>
            <div>
              <label className="label">Password {form.id && '(leave blank to keep)'}</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!form.id} />
            </div>
            <div>
              <label className="label">Quick PIN (optional)</label>
              <input className="input" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
            </div>
            {form.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                {t('common.active')}
              </label>
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

      {showAudit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print p-4">
          <div className="card w-full max-w-3xl max-h-[85vh] overflow-y-auto space-y-3">
            <div className="flex justify-between">
              <h2 className="font-bold text-lg">Audit Log</h2>
              <button className="btn-secondary" onClick={() => setShowAudit(false)}>
                {t('common.close')}
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDateDMY(a.created_at)}</td>
                    <td>{a.username}</td>
                    <td>{a.action}</td>
                    <td>{a.entity_type} #{a.entity_id}</td>
                    <td className="text-xs">{a.details}</td>
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
