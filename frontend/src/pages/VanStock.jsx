import { useSearchParams } from 'react-router-dom';
import { Package, ShieldCheck } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';
import { VanStockPanel } from './Inventory.jsx';

export function VanStock() {
  const [searchParams] = useSearchParams();
  const canIssue = usePermission('inventory.issue_van_stock');
  const canAdjust = usePermission('inventory.stock_adjustment');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-soft/40 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Package className="w-5 h-5 text-[#8244AD]" />
            Van Stock Allocation &amp; Reconciliation
          </h1>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Monitor on-hand inventory inside sales vans, issue stock from branch floor, and process day-end stock returns
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canAdjust && (
            <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
              <ShieldCheck size={12} />
              Stock Adjustments Authorized
            </span>
          )}
        </div>
      </div>

      <VanStockPanel canManage={canIssue} />
    </div>
  );
}

export default VanStock;
