import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expenseCategoriesApi, expensesApi, otherIncomeApi } from '../api/postsale';
import { EntityTable } from '../components/EntityTable';
import { Tabs } from '../components/Tabs';
import { usePermission } from '../hooks/usePermission';

function ExpensesPanel({ canManage }) {
  const queryClient = useQueryClient();
  const expensesQuery = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list });
  const categoriesQuery = useQuery({ queryKey: ['expense-categories'], queryFn: expenseCategoriesApi.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['expenses'] });
  const create = useMutation({ mutationFn: expensesApi.create, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: expensesApi.remove, onSuccess: invalidate });

  const categories = categoriesQuery.data || [];

  return (
    <EntityTable
      title="Operating Expenses"
      canManage={canManage}
      fields={[
        {
          name: 'category_id', label: 'Category', type: 'select', required: true,
          options: categories.map((c) => ({ value: c.id, label: c.name })),
        },
        { name: 'amount', label: 'Amount', type: 'number', required: true },
        {
          name: 'payment_mode', label: 'Payment mode', type: 'select', default: 'cash',
          options: [
            { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' },
            { value: 'card', label: 'Card' }, { value: 'bank_transfer', label: 'Bank Transfer' },
          ],
        },
        { name: 'description', label: 'Description' },
      ]}
      columns={[
        { key: 'expense_no', label: 'Expense #' },
        { key: 'category_id', label: 'Category', render: (r) => categories.find((c) => c.id === r.category_id)?.name || '-' },
        { key: 'amount', label: 'Amount' },
        { key: 'payment_mode', label: 'Mode' },
        { key: 'description', label: 'Description' },
        { key: 'expense_date', label: 'Date' },
      ]}
      rows={expensesQuery.data || []}
      onCreate={(data) => create.mutateAsync({ ...data, category_id: Number(data.category_id), amount: Number(data.amount) })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function OtherIncomePanel({ canManage }) {
  const queryClient = useQueryClient();
  const incomeQuery = useQuery({ queryKey: ['other-income'], queryFn: otherIncomeApi.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['other-income'] });
  const create = useMutation({ mutationFn: otherIncomeApi.create, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: otherIncomeApi.remove, onSuccess: invalidate });

  return (
    <EntityTable
      title="Extra Income & Receipts"
      canManage={canManage}
      fields={[
        { name: 'amount', label: 'Amount', type: 'number', required: true },
        {
          name: 'payment_mode', label: 'Payment mode', type: 'select', default: 'cash',
          options: [
            { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' },
            { value: 'card', label: 'Card' }, { value: 'bank_transfer', label: 'Bank Transfer' },
          ],
        },
        { name: 'description', label: 'Description', required: true },
      ]}
      columns={[
        { key: 'receipt_no', label: 'Receipt #' },
        { key: 'amount', label: 'Amount' },
        { key: 'payment_mode', label: 'Mode' },
        { key: 'description', label: 'Description' },
        { key: 'income_date', label: 'Date' },
      ]}
      rows={incomeQuery.data || []}
      onCreate={(data) => create.mutateAsync({ ...data, amount: Number(data.amount) })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

export function Expenses() {
  const canManage = usePermission('expenses.manage');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Expenses &amp; Income</h1>
      <Tabs
        tabs={[
          { key: 'expenses', label: 'Operating Expenses', content: <ExpensesPanel canManage={canManage} /> },
          { key: 'income', label: 'Extra Income & Receipts', content: <OtherIncomePanel canManage={canManage} /> },
        ]}
      />
    </div>
  );
}
