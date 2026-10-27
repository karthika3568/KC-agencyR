import { usePermission } from '../hooks/usePermission';
import { CustomersPanel } from './Parties.jsx';
import { Users } from 'lucide-react';

export function Customers() {
  const canManageCustomers = usePermission('parties.manage_customers');

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-soft/40 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Users className="w-5 h-5 text-[#8244AD]" />
            Customers Management
          </h1>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Customer directory, credit limits, billing addresses, and new customer registration
          </p>
        </div>
      </div>

      <CustomersPanel canManage={canManageCustomers} />
    </div>
  );
}

export default Customers;
