# POS / Distributor Billing System — Phase 1 + 2 + 3 + 4 + 5 + 6

Multi-branch, role-based POS + distributor billing system.

- **Phase 1**: authentication, the permission registry, and a frontend shell
  whose sidebar/menus render according to the logged-in user's effective
  permissions.
- **Phase 2**: Catalog (categories, brands, product lines, tax codes, stock
  units, items with unit conversions, Excel import/export) and Parties
  (routes, cities, customers, suppliers — branch-scoped).
- **Phase 3**: Core billing — stock ledger + audit trail, the POS screen
  (GST/Non-GST, cart, discount, split payment, hold/resume), the atomic
  invoice-completion transaction, thermal (80mm) + A4 print templates, and a
  WhatsApp share link.

- **Phase 4**: Purchasing & inventory ops — purchase indents, GRN (goods
  received) with atomic stock increase + supplier ledger, supplier payments
  with FIFO/manual allocation across unpaid GRNs, stock adjustments, van/
  salesman stock issue + day-end return, and a combined Stock Hub view.

- **Phase 5**: Post-sale — sales returns (with or without the original
  invoice, admin-approval path for untraceable ones), purchase returns,
  customer collections with FIFO oldest-bill auto-deduction, cash handover &
  reconciliation with discrepancy tracking, and branch-wise expenses/income.

- **Phase 6**: Reports & Admin — a live Dashboard with real KPI cards, the
  full report catalog (GST/Non-GST registers, purchase register, item-wise
  sales, credit outstanding & aging, expense/income, profit P&L, low stock)
  each with a date range and Excel export, the Staff & Permissions screen
  (create accounts, toggle status, per-employee permission overrides), and
  Settings (Company Profile, Thermal Printer Setup, Invoice Sequence
  Prefixes).

Only Phase 7 (PWA polish, real-device barcode/printer testing, load testing)
remains.

## Stack

- Backend: PHP 8.1+, no framework, PDO + a tiny router, JWT auth (`firebase/php-jwt`)
- Frontend: React 18 + Vite, Tailwind CSS, React Query, React Router
- DB: MySQL/MariaDB (XAMPP)

## Prerequisites

- XAMPP running (Apache + MySQL) — project lives at `C:\xampp\htdocs\pos-system`
- PHP 8.1+ and [Composer](https://getcomposer.org/)
- Node.js 18+ and npm

## 1. Database setup

1. Open phpMyAdmin (`http://localhost/phpmyadmin`) and create an empty database, e.g. `pos_system`.
2. Import, **in this exact order**:
   1. `backend/database/schema.sql`
   2. `backend/database/seed.sql`
   3. `backend/database/schema_phase2.sql`
   4. `backend/database/seed_phase2.sql`
   5. `backend/database/schema_phase3.sql`
   6. `backend/database/seed_phase3.sql`
   7. `backend/database/schema_phase4.sql`
   8. `backend/database/schema_phase5.sql`
   9. `backend/database/seed_phase5.sql`
   10. `backend/database/schema_phase6.sql`

Or from the command line:

```bash
mysql -u root -p pos_system < backend/database/schema.sql
mysql -u root -p pos_system < backend/database/seed.sql
mysql -u root -p pos_system < backend/database/schema_phase2.sql
mysql -u root -p pos_system < backend/database/seed_phase2.sql
mysql -u root -p pos_system < backend/database/schema_phase3.sql
mysql -u root -p pos_system < backend/database/seed_phase3.sql
mysql -u root -p pos_system < backend/database/schema_phase4.sql
mysql -u root -p pos_system < backend/database/schema_phase5.sql
mysql -u root -p pos_system < backend/database/seed_phase5.sql
mysql -u root -p pos_system < backend/database/schema_phase6.sql
```

## 2. Backend setup

```bash
cd backend
composer install
copy .env.example .env    # Windows; use `cp` on macOS/Linux
```

Edit `.env` and set `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` to match your
MySQL setup, and change `JWT_SECRET` to a random string.

The backend is served directly by Apache from
`http://localhost/pos-system/backend/public/` — no separate PHP server needed
as long as XAMPP's Apache is running and this folder sits under `htdocs`.

Health check once Apache is running:

```bash
curl -X POST http://localhost/pos-system/backend/public/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"Admin@123\"}"
```

## 3. Frontend setup

```bash
cd frontend
npm install
copy .env.example .env    # Windows; use `cp` on macOS/Linux
npm run dev
```

Open `http://localhost:5173` and log in.

## Phase 2 — what's new

- **Catalog** (`/catalog`): Items (with category/brand/product line/tax/unit
  dropdowns and per-item alternate-unit conversions), Categories, Brands,
  Product Lines, Tax Codes, Stock Units. List/view is open to any logged-in
  user; create/update/delete requires `catalog.manage_items` — enforced
  server-side by `PermissionMiddleware`, same as Phase 1.
- **Items Excel import/export** (still under `/catalog` → Items tab):
  "Download Template" gives a blank `.xlsx` with the expected headers,
  "Preview" validates every row (unknown category/unit/tax-code, duplicate
  item_code, missing item_name) without writing anything, and "Commit
  Import" then inserts only the rows that passed validation — invalid rows
  are reported back with their row number and specific error, never silently
  dropped or partially inserted.
- **Parties** (`/parties`): Customers, Suppliers, Routes, Cities. Routes,
  Customers, and Suppliers are **branch-scoped** — a user without
  `branches.switch_context` is hard-locked to their own home branch on every
  read and write (the `?branch_id=` query param is ignored for them), so
  editing the URL can't leak another branch's parties.
- New backend pieces: a small regex `Router` (`backend/src/Helpers/Router.php`)
  replacing the Phase 1 `switch` statement, a generic `SimpleCrudModel` +
  `CrudController`/`BranchScopedCrudController` for the ~10 lookup-style
  tables, and a dedicated `ItemModel`/`ItemController` for the richer
  items+unit-conversions+Excel flow.

## Phase 3 — what's new

- **Stock ledger** (`stock_ledger` + `stock_movements`): `StockLedgerService`
  is the *only* code path allowed to change `quantity_on_hand` — every call
  writes both the running balance and a full audit row in the same
  transaction. Nothing in Phase 3 populates stock upward yet (no purchasing
  module exists until Phase 4), so a sale can push a branch's quantity
  negative — that's expected for now, not a bug, and will self-correct once
  GRN/purchases land.
- **POS screen** (`/pos`): GST/Non-GST toggle, customer picker (walk-in or a
  branch customer), barcode-ready search (type or scan + Enter — a scanner is
  just a fast typist), per-line qty/free-qty/discount/rate, live-computed bill
  summary, Hold Bill / Complete & Print, Resume Held Bills with Discard.
  Per-line discount is gated behind `pos.apply_discount`, rate override behind
  `pos.edit_price_at_sale`, exactly as declared in the Phase 1 permission
  registry.
- **Invoice completion** (`InvoiceModel::complete`): one atomic transaction —
  assigns the invoice number (`InvoiceNumberService`, locked per branch+series
  with `SELECT ... FOR UPDATE`, only at completion, never at hold time, so a
  discarded held bill never burns a number), deducts stock for every line,
  inserts `invoice_payments`, and — if the payment doesn't fully cover the
  total and a customer is attached — records the shortfall as `sale_credit` in
  the append-only `credit_transactions` ledger via `CreditLedgerService`.
  Held bills (`status='held'`) never touch any of this, per amendment 4.8a.
- **Print + WhatsApp**: `/print/invoice/:id?format=thermal|a4` is a standalone
  route (no sidebar chrome) that fetches a pre-computed print payload — tax
  breakdown by GST slab, amount-in-words (`NumberToWords`, Indian
  lakhs/crores), customer outstanding — and renders it via `window.print()`
  with dedicated 80mm-thermal and A4 CSS. WhatsApp share is the MVP `wa.me`
  deep link with a prefilled text summary (no PDF attachment — see
  assumptions below).

### Assumptions / deliberate simplifications in Phase 3

- **IGST/interstate billing is not implemented.** Every sale computes
  CGST+SGST only (an even split of the item's GST%); the spec itself lists
  interstate billing as an open question to confirm with the client, so this
  mirrors that. Adding it later means: a `state` column on `customers`, and a
  branch-in-customer-state check in `InvoiceModel::computeTotals`.
- **No PDF generation (`dompdf`) yet.** WhatsApp share sends a text summary
  via `wa.me`, not a PDF link — `window.print()` (browser print dialog covers
  saving as PDF manually) is what the spec says to ship first; a downloadable
  PDF endpoint is a follow-up, not a Phase 3 blocker.
- **No stock-availability check blocks a sale.** Since purchasing (Phase 4)
  doesn't exist yet, there's no legitimate way stock could be positive yet
  either — blocking oversell now would make the POS screen unusable for
  testing. Revisit once GRN exists.
- **Camera/photo OCR scan-to-cart (spec section 8.1–8.4) was not built.** It
  needs a Tesseract OCR binary + another Composer package and is explicitly
  scoped as "once the base cart is stable" — the barcode/type-ahead add-to-cart
  flow is fully functional without it. Flag if you want it added now.
- **Branch print settings** (bank details, UPI QR, custom terms &
  conditions, thermal/A4 default) aren't built yet — that's Phase 6 Settings.
  The print templates use the `branches` fields from Phase 1 and a
  placeholder terms block.

## Phase 4 — what's new

- **Purchase Indents** (`/purchasing` → Purchase Indents): raise a request to
  a supplier (`orders.create_purchase_indent`), no stock effect until it's
  converted to a GRN.
- **GRN / Purchases** (`/purchasing` → GRN): `purchases.create_grn` records
  goods received — atomically inserts the GRN + line items, increases stock,
  and (if not fully paid up front) posts the shortfall to
  `supplier_ledger_transactions`. If it came from an indent, the indent flips
  to `converted_to_grn`. Cost columns (grand total, paid, pending) are hidden
  from anyone without `purchases.view_purchase_cost`. `purchases.delete_grn`
  never hard-deletes — it flips `status='cancelled'` and reverses both the
  stock movement and the ledger entry in one transaction (verified: deleting
  a GRN with a since-partially-paid balance drove the supplier's running
  balance back to exactly zero).
- **Supplier Payments** (`/purchasing` → Supplier Payments):
  `purchases.settle_supplier_payment` records a payment and allocates it
  FIFO (oldest unpaid GRN first) across that supplier's outstanding GRNs —
  the UI shows a live per-GRN "this pay / remaining" preview as the amount is
  typed, mirroring the server's own allocation. The API also accepts an
  explicit `allocations` array for a manual split instead of FIFO.
- **Stock Adjustment** (`/inventory` → Stock Adjustment):
  `inventory.stock_adjustment` records a damage/spoilage/count-correction/
  other addition or deduction, gated and audited like every other stock
  change.
- **Van / Salesman Stock** (`/inventory` → Van / Salesman Stock):
  `inventory.issue_van_stock` moves quantity from the branch's floor stock to
  a specific employee's own `stock_ledger` row (`owner_type='employee'`), and
  a day-end return reverses it — both legs logged so the two owners' ledgers
  always net to zero across the pair of movements.
- **Stock Hub** (`/inventory` → Stock Hub): one combined table across every
  owner (branch floor + each salesman's van), plus a low-stock banner for
  anything at or under its `min_stock_threshold`.

### Assumptions / simplifications in Phase 4

- **No separate "warehouse" entity.** The schema's `owner_type` enum still
  has `warehouse` reserved for a future central-warehouse model, but this
  MVP has one stock pool per branch — GRN receipts increase `owner_type=
  'branch'`, the same pool Phase 3's POS sale deducts from. Introducing a
  distinct warehouse-vs-branch-floor split is a schema-compatible follow-up,
  not a breaking change.
- **GRN/indent/issue/return numbers use a simple per-row auto-increment code**
  (`GRN00001`, `PI00001`, `ISS00001`, `RTN00001`), not the atomic per-branch
  sequence built for tax invoices in Phase 3 — GRNs aren't a legal filing
  document the way a sales invoice is, so the concurrency guarantee matters
  less here. Revisit if the client's auditor disagrees.
- **A minimal read-only `/api/users` endpoint** was added so the "issue van
  stock to this salesman" dropdown has names to show — full Staff Accounts
  management (create/edit logins, the permission-toggle screen) is still
  Phase 6, untouched here.

## Phase 5 — what's new

- **Sales Returns** (`/returns` → Sales Returns): `returns.sales_return`
  creates a return with or without the original invoice. With an invoice, it
  auto-approves and immediately adds stock back; if `refund_action=
  credit_note` and a customer is attached, it also posts a `credit_reversal`
  to the customer's ledger (reducing what they owe — a bug where this
  actually *increased* their balance was caught and fixed during testing,
  see `CreditLedgerService`). Without an invoice ("untraceable"), the return
  sits at `pending_approval` with zero stock/credit effect until someone with
  `returns.approve_untraceable_return` approves or rejects it — verified live:
  a cashier's untraceable return got a 403 on self-approval, then the Super
  Admin's approval flipped it and applied the stock movement.
- **Purchase Returns** (`/returns` → Purchase Returns):
  `returns.purchase_return` mirrors the above on the supplier side — reduces
  stock and posts a `debit_note_adjustment` to the supplier ledger.
- **Customer Collections** (`/collections`): `credit.view_shopwide_outstanding`
  sees the "Route Pending Credit Balances" panel; `collections.
  field_collection_entry` opens the Collect modal, which shows a live FIFO
  preview (oldest invoice first) as the amount is typed and updates every
  touched invoice's `paid_amount`/`payment_status` in one transaction —
  tested through the real UI end to end (₹130 owed → collected ₹80 → ₹50
  remains, receipt `REC00002` recorded).
- **Cash Handover & Reconciliation** (`/cash-handover`):
  `handover.submit_cash_handover` batches a salesman's not-yet-handed-over
  collections (split cash vs digital) into one handover;
  `handover.verify_reconcile` counts the physical cash and the system flags
  `discrepancy_flagged` whenever verified ≠ submitted (tested: submitted 35,
  verified 30 → discrepancy -5.00, flagged red in the register).
- **Expenses & Income** (`/expenses`): `expenses.manage` records branch-wise
  operating expenses (against a seeded category list) and extra income/
  receipts, each with an auto-generated `EXP00001`/`INC00001` code.

### Assumptions / simplifications in Phase 5

- **`BranchScopedCrudController` gained optional auto-code-generation and
  `autoDefaults`** (column → `fn($claims)`, e.g. `created_by`,
  `expense_date`) so expenses/income didn't need bespoke controllers — same
  reuse pattern as Phase 2's `CrudController` code-prefix support.
- **Both new ledger services (`SupplierLedgerService` in Phase 4 and
  `CreditLedgerService` here) needed a sign-convention fix** for their
  "reversal" transaction types (`debit_note_adjustment`, `credit_reversal`)
  — both were initially coded to increase the balance like the ledger's
  primary "charge" type, when a reversal must decrease it. Caught by
  end-to-end testing (a return was making the customer owe *more*), fixed,
  and re-verified before commit.
- **Cash handover batches every un-linked collection**, not just cash ones —
  the register still shows the cash/digital split per section 4.16, but a
  UPI collection sits in the same handover batch for audit completeness
  rather than needing a separate reconciliation flow.

## Phase 6 — what's new

- **Dashboard** (`/`): real KPI cards — today's/monthly sales, today's/
  monthly purchases, inventory valuation, customer & supplier net
  outstanding, collections/expenses/income today, low-stock count — all
  computed live from the actual tables, gated behind
  `dashboard.view_financial_summary`.
- **Reports** (`/reports`): GST Sales Register (hardcoded `bill_type='gst'`,
  never toggleable, per rule 5), Non-GST Register (kept strictly separate),
  Purchase Register, Item-wise Sales, Credit Outstanding & Aging, Expense &
  Income, Profit (P&L), and Low Stock — each with a from/to date filter, each
  gated behind its own permission code, and each with an "Export to Excel"
  button gated additionally behind `reports.export_excel` (verified: exported
  the GST register as a real downloadable `.xlsx`).
- **Staff & Permissions** (`/staff`): `staff.manage_accounts` creates
  accounts and toggles active/inactive; `staff.manage_permissions` opens a
  per-employee panel where every permission shows its role default and can
  be cycled through Role default → Force allow → Force deny → back to role
  default. Verified live: granted a cashier `catalog.manage_price_lists`
  through the real UI, confirmed via API it landed as an isolated override
  without disturbing their existing `catalog.manage_items` override.
- **Settings** (`/settings`): Company Profile edits the branch's own
  `branches` row (address/GSTIN/etc. — the same fields Phase 1 seeded as
  placeholders); Thermal Printer Setup edits `branch_print_settings` (bank/
  UPI details, terms & conditions, printer type); Invoice Sequence Prefixes
  lets `settings.manage` change the `INV-`/`EST-` prefix without touching the
  running counter, so numbering never repeats or resets.

### Two bugs caught and fixed during Phase 6 testing

- **`POST /api/users` silently created accounts with `branch_id: null`** for
  a Super Admin (or anyone with `branches.switch_context`) who didn't pass an
  explicit `branch_id` — `resolveBranchId()` correctly returns "every branch"
  (`null`) for that role on a *read*, but a new account needs one real home
  branch. Fixed to fall back to the creator's own branch.
- **Saving a permission override silently deleted every *other* override for
  that user.** `setPermissionOverrides` did a delete-all-then-reinsert of
  only the overrides in the current request, but the Staff & Permissions UI
  only ever sends the permissions actually touched in that session (by
  design, so a long scroll of 42 toggles doesn't need re-sending on every
  save) — the mismatch meant saving one toggle wiped out every earlier one.
  Changed to a targeted upsert/clear per permission_id instead of a full
  replace; re-verified two independent overrides now coexist correctly.

### Assumptions / simplifications in Phase 6

- **Profit (P&L) report's COGS uses each item's *current* `cost_price`**,
  not a price snapshotted at sale time — `invoice_items` only stores the
  sale `rate`, not cost, so a cost-price change shifts this report
  retroactively for past periods. Storing a `cost_price_snapshot` on
  `invoice_items` is the fix if this matters for the client; flagged rather
  than silently assumed away.
- **The report engine is per-report endpoints, not one fully generic
  filter/order-by engine** (section 10 describes route/brand/employee/
  customer/payment-status/order-by filters uniformly across every report) —
  each report here takes the filters that make sense for it (mostly date
  range), which covers the named report catalog without the extra generic-engine
  machinery. Extending any one report with more filters is additive, not a
  rewrite.
- **Roles themselves are still read-only** (`GET /api/roles` only) — creating
  new roles or editing which permissions a role grants by default isn't
  built; only per-employee overrides on top of the existing 5 seeded roles.

## Default Super Admin login (seeded — change immediately)

```
Email:    admin@example.com
Password: Admin@123
```

## Verifying Phase 1 is working

1. Log in as the seeded Super Admin — you should land on the Dashboard shell
   with a full sidebar (Dashboard, POS, Catalog, Reports, Staff & Permissions).
2. `GET /api/auth/me` (with the returned Bearer token) returns your full
   permission-code list.
3. In phpMyAdmin, create a second user with `role_id = 5` (Billing Executive)
   and a bcrypt password hash (`php -r "echo password_hash('Test@123', PASSWORD_BCRYPT);"`).
   Log in as them — the sidebar should show far fewer items (no Catalog, no
   Staff & Permissions), because their role doesn't grant those permission codes.
4. As that same restricted user, call
   `GET /api/staff/accounts` (Bearer token) — it should return **403 Forbidden**,
   proving permission checks are enforced server-side, not just hidden in the UI.
   The same call as the Super Admin returns 200.

## Folder structure

```
/pos-system
  /backend
    /config          database.php, config.php (.env-driven)
    /src
      /Controllers   AuthController
      /Middleware    JwtAuthMiddleware, PermissionMiddleware, CorsMiddleware
      /Models        UserModel (effective-permission computation)
      /Helpers       JwtHelper, Response
      /Services      (empty — later phases: StockLedgerService, InvoiceNumberService, ...)
    /public          index.php (single entry point / router), .htaccess
    /database        schema.sql, seed.sql
  /frontend
    /src
      /pages         Login, Dashboard, stub pages for future modules
      /components    Sidebar, Header, Can, ProtectedRoute, AppShell
      /hooks         useAuth, usePermission
      /api           client.js, auth.js
      /store         (empty — later phases: cart/UI state via Zustand)
      /print         (empty — later phases: thermal/A4 invoice templates)
```

## Assumptions made in Phase 1 (not 100% explicit in the spec)

- **Default `role_permissions` mapping** for Manager, Field Sales Executive,
  and Billing Executive is a reasonable starting point, not specified exactly
  in the spec — Admin can freely re-toggle any of these per employee once the
  Staff & Permissions screen is built in a later phase. Super Admin gets every
  permission; Admin gets every permission except `branches.manage`.
- **Backend is served by Apache directly** from `backend/public` under XAMPP's
  htdocs (matching "must run unmodified under XAMPP"), rather than via
  `php -S`. `index.php` strips a `/pos-system/backend/public` prefix so it
  also works if you later move it to its own vhost root.
- **PWA is scaffolded but not wired up**, per the Phase 1 spec note — a
  `manifest.json` exists and is linked from `index.html`, but there's no
  service worker yet and no app icons (added in Phase 7 polish).
- **Placeholder branch/company data**: one `company` row and one `branches`
  row are seeded with dummy address/GSTIN text — real values get edited once
  the Settings screen exists (Phase 6).
- The seeded Super Admin password is `Admin@123` — printed here in plaintext
  once, as requested; treat this repo/README as containing a dev-only secret
  and rotate it before any real deployment.
