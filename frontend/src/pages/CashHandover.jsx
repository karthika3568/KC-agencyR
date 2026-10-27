import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cashHandoversApi } from '../api/postsale';
import { usePermission } from '../hooks/usePermission';
import { Pagination } from '../components/Pagination';
import { useClientPagination } from '../hooks/useClientPagination';

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

  const {
    page: pendingPage,
    setPage: setPendingPage,
    total: pendingTotal,
    paginatedItems: pagedPending,
  } = useClientPagination(pending, 10);

  const {
    page: registerPage,
    setPage: setRegisterPage,
    total: registerTotal,
    paginatedItems: pagedRegister,
  } = useClientPagination(register, 10);

  return (
    <div className="space-y-2.5">
      <div className="border-b border-border-soft pb-2">
        <h1 className="text-xl font-bold text-ink">Cash Handover &amp; Reconciliation</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-border-soft px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink">
          Pending Salesman Collections Ready for Handover
        </div>
        <div className="max-h-[calc(50vh-90px)] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[650px] text-xs">
            <thead className="sticky top-0 bg-page z-10 shadow-sm">
              <tr className="border-b border-border-soft text-left uppercase text-ink-muted font-medium bg-surface-subtle/30">
                <th className="px-3 py-2">Salesman</th>
                <th className="px-3 py-2">Cash Collected</th>
                <th className="px-3 py-2">Digital/UPI</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Cash Being Handed Over</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60">
              {pagedPending.map((p) => (
                <tr key={p.employee_id} className="hover:bg-surface-subtle/20 transition">
                  <td className="px-3 py-1.5 font-medium text-ink">{p.employee_name}</td>
                  <td className="px-3 py-1.5 font-semibold text-emerald-600">₹{p.cash_amount}</td>
                  <td className="px-3 py-1.5 text-ink-muted">₹{p.digital_amount}</td>
                  <td className="px-3 py-1.5 font-medium">₹{p.total_amount}</td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step="any"
                      placeholder={p.cash_amount}
                      value={submittedAmounts[p.employee_id] ?? ''}
                      onChange={(e) => setSubmittedAmounts((prev) => ({ ...prev, [p.employee_id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (canSubmit) {
                            submitMutation.mutate({
                              employee_id: p.employee_id,
                              submitted_amount: Number(submittedAmounts[p.employee_id] ?? p.cash_amount),
                            });
                          }
                        }
                      }}
                      className="input w-24 text-xs py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {canSubmit && (
                      <button
                        onClick={() =>
                          submitMutation.mutate({
                            employee_id: p.employee_id,
                            submitted_amount: Number(submittedAmounts[p.employee_id] ?? p.cash_amount),
                          })
                        }
                        className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-xs"
                      >
                        Handover Cash
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {pending.length === 0 && <tr><td colSpan={6} className="px-3 py-5 text-center text-ink-muted">Nothing pending handover.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={pendingPage} pageSize={10} total={pendingTotal} onPageChange={setPendingPage} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-border-soft px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink">
          Reconciliation Audit Register
        </div>
        <div className="max-h-[calc(50vh-90px)] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[650px] text-xs">
            <thead className="sticky top-0 bg-page z-10 shadow-sm">
              <tr className="border-b border-border-soft text-left uppercase text-ink-muted font-medium bg-surface-subtle/30">
                <th className="px-3 py-2">Handover #</th>
                <th className="px-3 py-2">Salesman</th>
                <th className="px-3 py-2">Submitted</th>
                <th className="px-3 py-2">Verified</th>
                <th className="px-3 py-2">Discrepancy</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60">
              {pagedRegister.map((h) => (
                <tr key={h.id} className="hover:bg-surface-subtle/20 transition">
                  <td className="px-3 py-1.5 font-medium font-mono text-ink">{h.handover_no}</td>
                  <td className="px-3 py-1.5">{h.employee_name}</td>
                  <td className="px-3 py-1.5 font-medium">₹{h.submitted_amount}</td>
                  <td className="px-3 py-1.5">{h.verified_amount ? `₹${h.verified_amount}` : '-'}</td>
                  <td className={`px-3 py-1.5 font-medium ${h.discrepancy && Math.abs(h.discrepancy) > 0.009 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {h.discrepancy ? `₹${h.discrepancy}` : '-'}
                  </td>
                  <td className="px-3 py-1.5 capitalize">{h.status.replace('_', ' ')}</td>
                  <td className="px-3 py-1.5 text-right">
                    {h.status === 'pending' && canVerify && (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          placeholder="Counted"
                          value={verifyAmounts[h.id] ?? ''}
                          onChange={(e) => setVerifyAmounts((prev) => ({ ...prev, [h.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (canVerify) {
                                verifyMutation.mutate({ id: h.id, amount: Number(verifyAmounts[h.id] ?? h.submitted_amount) });
                              }
                            }
                          }}
                          className="input w-20 text-xs py-1"
                        />
                        <button
                          onClick={() => verifyMutation.mutate({ id: h.id, amount: Number(verifyAmounts[h.id] ?? h.submitted_amount) })}
                          className="rounded bg-slate-800 hover:bg-slate-900 px-2 py-1 text-xs text-white"
                        >
                          Verify
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {register.length === 0 && <tr><td colSpan={7} className="px-3 py-5 text-center text-ink-muted">No handovers yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={registerPage} pageSize={10} total={registerTotal} onPageChange={setRegisterPage} />
      </div>
    </div>
  );
}
