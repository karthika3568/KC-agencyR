import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * The header branch switcher's selection (section 3: "Switching branch
 * changes which invoices/stock they see, and — critically — which branch
 * address prints on any new invoice they personally bill"). Only ever
 * meaningful for a user with branches.switch_context — apiClient attaches
 * this as ?branch_id= on every request when set, and every backend
 * controller's resolveBranchId() already honors that param for such users
 * (and silently ignores it for anyone else, so this is never a security
 * boundary — just a UX convenience).
 */
export const useBranchStore = create(
  persist(
    (set) => ({
      selectedBranchId: null,
      setSelectedBranchId: (id) => set({ selectedBranchId: id }),
    }),
    { name: 'pos_selected_branch' }
  )
);
