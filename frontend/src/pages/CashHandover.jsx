import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cashHandoversApi } from '../api/postsale';
import { usePermission } from '../hooks/usePermission';

export function CashHandover() {
  const queryClient = useQueryClient();
  const canSubmit = usePermission('handover.submit_cash_handover');
  const canVerify = usePermission('handover.verify_reconcile');
  const [submittedAmounts, setSubmittedAmounts] = useState({});
  const [verifyAmounts, setVerifyAmounts] = useState({});

  const pendingQuery = useQuery({ queryKey: ['handover-pending'], queryFn: cashHandoversApi.pending });
  const registerQuery = useQuery({ queryKey: ['handovers'], queryFn: cashHandoversApi.list });

  const submitMutation = useMutation({
    mutationFn: cashHandoversApi.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-pending'] });
      queryClient.invalidateQueries({ queryKey: ['handovers'] });
    },
  });
  const verifyMutation = useMutation({
    mutationFn: ({ id, amount }) => cashHandoversApi.verify(id, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['handovers'] }),
  });

  const pending = pendingQuery.data || [];
  const register = registerQuery.data || [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Cash Handover &amp; Reconciliation</h1>

      <div className="mb-4 card">
        <div className="border-b border-border-soft px-4 py-3 font-semibold text-ink">
          Pending Salesman Collections Ready for Handover
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Salesman</th><th className="px-4 py-2">Cash Collected</th><th className="px-4 py-2">Digital/UPI</th>
              <th className="px-4 py-2">Total</th><th className="px-4 py-2">Cash Being Handed Over</th><th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((p) => (
              <tr key={p.employee_id} className="border-b border-border-soft">
                <td className="px-4 py-2">{p.employee_name}</td>
                <td className="px-4 py-2">{p.cash_amount}</td>
                <td className="px-4 py-2">{p.digital_amount}</td>
                <td className="px-4 py-2 font-medium">{p.total_amount}</td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    step="any"
                    placeholder={p.cash_amount}
                    value={submittedAmounts[p.employee_id] ?? ''}
                    onChange={(e) => setSubmittedAmounts((prev) => ({ ...prev, [p.employee_id]: e.target.value }))}
                    className="input w-28"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  {canSubmit && (
                    <button
                      onClick={() =>
                        submitMutation.mutate({
                          employee_id: p.employee_id,
                          submitted_amount: Number(submittedAmounts[p.employee_id] ?? p.cash_amount),
                        })
                      }
                      className="rounded bg-success px-3 py-1 text-xs font-semibold text-white"
                    >
                      Handover Cash
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {pending.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">Nothing pending handover.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="border-b border-border-soft px-4 py-3 font-semibold text-ink">Reconciliation Audit Register</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Handover #</th><th className="px-4 py-2">Salesman</th><th className="px-4 py-2">Submitted</th>
              <th className="px-4 py-2">Verified</th><th className="px-4 py-2">Discrepancy</th><th className="px-4 py-2">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {register.map((h) => (
              <tr key={h.id} className="border-b border-border-soft">
                <td className="px-4 py-2">{h.handover_no}</td>
                <td className="px-4 py-2">{h.employee_name}</td>
                <td className="px-4 py-2">{h.submitted_amount}</td>
                <td className="px-4 py-2">{h.verified_amount ?? '-'}</td>
                <td className={`px-4 py-2 font-medium ${h.discrepancy && Math.abs(h.discrepancy) > 0.009 ? 'text-red-600' : 'text-success'}`}>
                  {h.discrepancy ?? '-'}
                </td>
                <td className="px-4 py-2 capitalize">{h.status.replace('_', ' ')}</td>
                <td className="px-4 py-2 text-right">
                  {h.status === 'pending' && canVerify && (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="Counted"
                        value={verifyAmounts[h.id] ?? ''}
                        onChange={(e) => setVerifyAmounts((prev) => ({ ...prev, [h.id]: e.target.value }))}
                        className="input w-24"
                      />
                      <button
                        onClick={() => verifyMutation.mutate({ id: h.id, amount: Number(verifyAmounts[h.id] ?? h.submitted_amount) })}
                        className="rounded bg-gray-800 px-2 py-1 text-xs text-white"
                      >
                        Verify
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {register.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-muted">No handovers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
