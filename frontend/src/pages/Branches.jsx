import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchesApi } from '../api/branches';
import { usePermission } from '../hooks/usePermission';

const emptyForm = {
  branch_name: '',
  print_name: '',
  gstin: '',
  pan_number: '',
  address_line1: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  support_email: '',
};

function CreateBranchForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: branchesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setForm(emptyForm);
      setOpen(false);
    },
  });

  const update = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createMutation.mutateAsync(form);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create branch');
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mb-4 rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
        + Create Branch
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 font-semibold text-gray-800">New Branch</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Branch name *"><input required value={form.branch_name} onChange={update('branch_name')} className="input" /></Field>
        <Field label="Print name (on invoice header) *"><input required value={form.print_name} onChange={update('print_name')} className="input" /></Field>
        <Field label="GSTIN"><input value={form.gstin} onChange={update('gstin')} className="input" /></Field>
        <Field label="PAN number"><input value={form.pan_number} onChange={update('pan_number')} className="input" /></Field>
        <Field label="Phone"><input value={form.phone} onChange={update('phone')} className="input" /></Field>
        <Field label="Support email"><input type="email" value={form.support_email} onChange={update('support_email')} className="input" /></Field>
        <Field label="Address *" span="col-span-2 sm:col-span-3"><input required value={form.address_line1} onChange={update('address_line1')} className="input" /></Field>
        <Field label="City *"><input required value={form.city} onChange={update('city')} className="input" /></Field>
        <Field label="State *"><input required value={form.state} onChange={update('state')} className="input" /></Field>
        <Field label="Pincode"><input value={form.pincode} onChange={update('pincode')} className="input" /></Field>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="submit" disabled={createMutation.isPending} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
          Create Branch
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded bg-gray-100 px-4 py-1.5 text-sm text-gray-700">
          Cancel
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function Field({ label, children, span = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${span}`}>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export function Branches() {
  const canManage = usePermission('branches.manage');
  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list });
  const branches = branchesQuery.data || [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-800">Branches</h1>

      {canManage && <CreateBranchForm />}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-800">All Branches</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-2">Name</th><th className="px-4 py-2">Print Name</th><th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">GSTIN</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Main?</th><th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-b border-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{b.branch_name}</td>
                <td className="px-4 py-2">{b.print_name}</td>
                <td className="px-4 py-2 text-gray-500">{b.address_line1}, {b.city}, {b.state} {b.pincode}</td>
                <td className="px-4 py-2">{b.gstin || '-'}</td>
                <td className="px-4 py-2">{b.phone || '-'}</td>
                <td className="px-4 py-2">{b.is_main_branch ? 'Yes' : ''}</td>
                <td className="px-4 py-2 capitalize">{b.status}</td>
              </tr>
            ))}
            {branches.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No branches yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
