import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Search, Plus, Trash2, CheckCircle2, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { expenseCategoriesApi, expensesApi, otherIncomeApi } from '../api/postsale';
import { Tabs } from '../components/Tabs';
import { usePermission } from '../hooks/usePermission';
import { Button } from '../components/Button.jsx';

function ExpensesPanel({ canManage }) {
  const queryClient = useQueryClient();
  const expensesQuery = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list });
  const categoriesQuery = useQuery({ queryKey: ['expense-categories'], queryFn: expenseCategoriesApi.list });

  const categories = categoriesQuery.data || [];
  const expenses = expensesQuery.data || [];

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['expenses'] });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Expense logged successfully!');
    },
  });

  const removeMutation = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => {
      invalidate();
      showSuccess('Expense deleted.');
    },
  });

  const resetForm = () => {
    setCategoryId('');
    setAmount('');
    setPaymentMode('cash');
    setDescription('');
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!categoryId) {
      setFormError('Please select a category.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    setFormError('');
    createMutation.mutate({
      category_id: Number(categoryId),
      amount: Number(amount),
      payment_mode: paymentMode,
      description,
    });
  };

  const filteredExpenses = expenses.filter((item) => {
    const catName = categories.find((c) => c.id === item.category_id)?.name || '';
    return (
      item.expense_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      catName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.payment_mode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column Form */}
        <div className="lg:col-span-4">
          <div className="card p-5 space-y-4 sticky top-6">
            <div className="border-b border-border-soft pb-3">
              <h2 className="font-semibold text-ink text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Add Operating Expense
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {formError && (
                <div className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-800/40">{formError}</div>
              )}

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Expense Category *</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="input w-full capitalize"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Description / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Vendor name, bill # or purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input w-full"
                />
              </div>

              {canManage && (
                <div className="pt-2">
                  <Button type="submit" variant="primary" loading={createMutation.isPending} className="w-full">
                    Record Expense
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 w-full text-xs"
              />
            </div>
            <span className="text-xs text-ink-muted">{filteredExpenses.length} expense record(s)</span>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-sm">Expenses History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-soft bg-surface-subtle/30 text-ink-muted font-medium">
                    <th className="px-4 py-3">Expense #</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Payment Mode</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {filteredExpenses.map((item) => {
                    const catName = categories.find((c) => c.id === item.category_id)?.name || '-';
                    return (
                      <tr key={item.id} className="hover:bg-surface-subtle/20 transition">
                        <td className="px-4 py-3 font-mono font-medium text-ink">{item.expense_no || `#${item.id}`}</td>
                        <td className="px-4 py-3 font-medium text-ink">{catName}</td>
                        <td className="px-4 py-3 font-semibold text-red-400">₹{Number(item.amount).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {item.payment_mode || 'cash'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{item.description || '-'}</td>
                        <td className="px-4 py-3 text-ink-muted">{item.expense_date || item.created_at || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          {canManage && (
                            <button
                              onClick={() => removeMutation.mutate(item.id)}
                              className="p-1 rounded hover:bg-surface-subtle text-ink-muted hover:text-red-400 transition"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-ink-muted text-xs">
                        No expenses found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OtherIncomePanel({ canManage }) {
  const queryClient = useQueryClient();
  const incomeQuery = useQuery({ queryKey: ['other-income'], queryFn: otherIncomeApi.list });
  const incomes = incomeQuery.data || [];

  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['other-income'] });

  const createMutation = useMutation({
    mutationFn: otherIncomeApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Extra income logged successfully!');
    },
  });

  const removeMutation = useMutation({
    mutationFn: otherIncomeApi.remove,
    onSuccess: () => {
      invalidate();
      showSuccess('Income record deleted.');
    },
  });

  const resetForm = () => {
    setAmount('');
    setPaymentMode('cash');
    setDescription('');
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      setFormError('Description is required.');
      return;
    }
    setFormError('');
    createMutation.mutate({
      amount: Number(amount),
      payment_mode: paymentMode,
      description: description.trim(),
    });
  };

  const filteredIncomes = incomes.filter((item) => {
    return (
      item.receipt_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.payment_mode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column Form */}
        <div className="lg:col-span-4">
          <div className="card p-5 space-y-4 sticky top-6">
            <div className="border-b border-border-soft pb-3">
              <h2 className="font-semibold text-ink text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Add Extra Income
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {formError && (
                <div className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-800/40">{formError}</div>
              )}

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="input w-full capitalize"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Description / Source *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Scrap sale, commission, rent received..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input w-full"
                />
              </div>

              {canManage && (
                <div className="pt-2">
                  <Button type="submit" variant="primary" loading={createMutation.isPending} className="w-full">
                    Record Income
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search receipts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 w-full text-xs"
              />
            </div>
            <span className="text-xs text-ink-muted">{filteredIncomes.length} receipt record(s)</span>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-sm">Income Receipts History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-soft bg-surface-subtle/30 text-ink-muted font-medium">
                    <th className="px-4 py-3">Receipt #</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Payment Mode</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {filteredIncomes.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-subtle/20 transition">
                      <td className="px-4 py-3 font-mono font-medium text-ink">{item.receipt_no || `#${item.id}`}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-400">₹{Number(item.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {item.payment_mode || 'cash'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-ink-muted">{item.income_date || item.created_at || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {canManage && (
                          <button
                            onClick={() => removeMutation.mutate(item.id)}
                            className="p-1 rounded hover:bg-surface-subtle text-ink-muted hover:text-red-400 transition"
                            title="Delete Receipt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredIncomes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-ink-muted text-xs">
                        No extra income receipts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Expenses() {
  const canManage = usePermission('expenses.manage');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-soft/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Expenses &amp; Income
          </h1>
          <p className="text-xs text-ink-muted mt-1">Manage store operational expenses, extra receipts, and cash flows</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'expenses', label: 'Operating Expenses', content: <ExpensesPanel canManage={canManage} /> },
          { key: 'income', label: 'Extra Income & Receipts', content: <OtherIncomePanel canManage={canManage} /> },
        ]}
      />
    </div>
  );
}

