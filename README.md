# POS / Distributor Billing System — Phase 1 + 2 + 3 + 4 + 5 + 6 + 7

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

- **Phase 7**: Polish — a real installable PWA (manifest + Workbox service
  worker via `vite-plugin-pwa`), a verified barcode-scanner-speed input path,
  a load test against 5,000 seeded invoices (found and fixed a missing
  composite index), and a dashboard alert for unresolved cash-handover
  discrepancies. See the Phase 7 section below for what could and couldn't
  be verified from this environment.

All 7 phases of the spec are now built. A React Native mobile app (`mobile/`)
was added afterward as a full-parity client of the same backend — see
[`AJ_AGENCY_PROJECT_DOCUMENTATION.md`](AJ_AGENCY_PROJECT_DOCUMENTATION.md) for
the consolidated technical reference covering all three apps (web, mobile,
backend), the full API endpoint list, and database documentation.

## Stack

- Backend: PHP 8.1+, no framework, PDO + a tiny router, JWT auth (`firebase/php-jwt`)
- Frontend: React 18 + Vite, Tailwind CSS, React Query, React Router
- DB: MySQL/MariaDB (XAMPP)

## Prerequisites

- XAMPP running (Apache + MySQL) — project lives at `C:\xampp\htdocs\pos-system`
- PHP 8.1+ and [Composer](https://getcomposer.org/)
- Node.js 18+ and npm

## 1. Database setup

The database is now a single consolidated `schema.sql` + `seed.sql` pair
(previously 15+ separate per-phase files — those are kept for historical
reference under `backend/database/migrations/`, but a fresh install only
needs the two files below). Full detail: [`backend/database/README.md`](backend/database/README.md).

1. Open phpMyAdmin (`http://localhost/phpmyadmin`) and create an empty database, e.g. `pos_system`.
2. Import, in this order:
   1. `backend/database/schema.sql`
   2. `backend/database/seed.sql`

Or from the command line:

```bash
mysql -u root -p pos_system < backend/database/schema.sql
mysql -u root -p pos_system < backend/database/seed.sql
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

## Phase 7 — what's new, and what's honestly unverified

- **PWA**: `vite-plugin-pwa` (Workbox) now generates a real service worker
  and `manifest.webmanifest`, with 192px/512px icons (including `maskable`
  variants) and `theme-color`/`apple-touch-icon` in `index.html`. `npm run
  build` was run and objectively confirms the pipeline works — it emits
  `dist/sw.js`, a `workbox-*.js` runtime chunk, and precaches 7 app-shell
  entries. Per section 12's own instruction, **POS billing is NOT
  offline-first** — every `/api/*` call is `NetworkOnly` in the Workbox
  config (`vite.config.js`), so invoice numbering/stock/payments always hit
  the live server; only the static app shell is cached for fast/offline
  *loading*.
  - **What I could not verify here**: live service-worker registration and
    "Add to Home Screen" install-ability. This coding environment's own
    embedded browser pane blocks *all* ServiceWorker registration as a
    sandbox policy — confirmed by registering a trivial nonsense URL as a
    control, which failed with the identical generic error as the real
    service worker. This is a restriction of the review environment, not a
    defect in the app. **Please verify installability yourself** in a real
    Chrome/Edge desktop browser or an Android device — that was always the
    spec's own instruction for this item ("installability testing on
    Android tablet").
- **Barcode scanner**: verified the actual input path handles scanner-speed
  typing, not just human typing — simulated 8 characters at 2ms apart
  (faster than any realistic keyboard, let alone a scanner sending a full
  barcode over ~20-50ms) followed by Enter, and confirmed it correctly
  exact-matched the item and added it to the cart. No debounce or race
  condition. **Still needs a real physical scanner** to confirm HID
  keyboard-wedge behavior end to end (this only proves the software side).
- **Print testing**: thermal (80mm) and A4 templates were already visually
  verified rendering real invoice data back in Phase 3. **A real thermal
  printer and A4 printer still need physical testing** — paper width,
  margins, and cut behavior can't be confirmed from a browser screenshot.
  Confirm the exact printer make/model + connection type with the client
  before building any native print-bridge (QZ Tray / RawBT), per the
  spec's own open question.
- **Load testing**: `backend/database/seed_load_test.php` bulk-inserts
  N completed invoices directly via SQL (bypassing business logic — it's
  purely for query-performance testing, tagged `invoice_no LIKE 'LOAD-%'`
  for trivial cleanup: `DELETE FROM invoices WHERE invoice_no LIKE
  'LOAD-%';`). Ran it at 5,000 invoices (~10,000 line items) and found the
  `item-wise-sales` and `gst-register` reports were missing a composite
  index — `invoices` only had `(branch_id, status)`, so a date-range filter
  fell back to scanning every one of that branch's completed invoices one
  at a time. Added `idx_invoices_branch_status_date (branch_id, status,
  invoice_date)` — confirmed via `EXPLAIN` the query plan now uses it
  correctly. Also added a 5,000-row safety cap to the three unbounded
  list-style reports (GST/Non-GST/purchase registers, expense-income) so a
  huge date range can't ship a multi-MB JSON payload — a real pagination UI
  is the proper fix if that becomes routine at higher volumes.
- **Dashboard discrepancy alert** (spec item 31): the Dashboard now shows a
  red banner listing every `discrepancy_flagged` cash handover for the
  branch, with a link straight to Cash Handover — verified against the
  discrepancy created back in Phase 5 testing (`HND00001`, short by ₹5).

### Correction to earlier phase notes

Every earlier phase's README text says "MariaDB-safe SQL" / "targets
XAMPP's bundled MariaDB." In practice, this dev machine has a second,
unrelated **MySQL 9.4** Windows service already bound to port 3306 (noted
back in Phase 1's setup), and that's what every phase has actually been
running against and load-tested here — not XAMPP's bundled MariaDB. Nothing
in the schema uses a MariaDB-only feature *except* the one syntax mistake
caught during this phase (`ADD INDEX IF NOT EXISTS`, MariaDB-only — fixed to
plain `ADD INDEX` in `schema_phase7.sql`, consistent with every other
schema file's one-time-apply convention). If deploying to real MariaDB,
this schema will work; if there's ever a genuine MariaDB-only feature
introduced later, re-verify against both.

## Post-Phase-7 fix: Branch create + working header switcher

The backend always supported multiple branches (schema, `?branch_id=`
resolution in nearly every controller, per-branch stock/invoices/parties),
but there was no way to actually *create* a branch from the UI, and the
header branch switcher was still a hardcoded single-option stub from Phase
1's placeholder. Fixed:

- **`/branches`** (gated `branches.manage`, Super Admin by default): lists
  every branch and a "+ Create Branch" form with the full address/GSTIN/PAN
  fields from section 3.1. Creating one also seeds its `INV-`/`EST-`
  invoice-number sequences immediately rather than relying on
  `InvoiceNumberService`'s self-heal-on-first-use path.
- **Header branch switcher** (`branches.switch_context`) now fetches the
  real branch list, defaults to the user's own home branch, and — critically
  — actually changes what data every screen shows. A new `branchStore`
  (Zustand, persisted) holds the selection; `apiClient` attaches it as
  `?branch_id=` on every request; switching triggers
  `queryClient.invalidateQueries()` so the whole app refetches under the new
  branch. Verified live: created "North Branch" and "South Branch" through
  the real UI, switched to North Branch, and watched the Dashboard correctly
  show all-zero KPIs and the Main-Branch-only cash-handover discrepancy
  banner disappear — then switched back and got the original numbers back.

## UI redesign: dark navy/gold navbar + cream premium theme

A visual-only pass (no business logic, API calls, or permission checks
changed) restyling the entire frontend to a premium dark-navy-and-gold
navbar over a warm cream page background, per a reference design.

**Design tokens** — one source of truth in `frontend/tailwind.config.js`
(`navbar`, `gold`, `page`, `border.soft`, `ink`/`ink.muted`/`ink.onnavy`,
`success`, `warning`, `danger`, `highlight`) plus shared base classes in
`frontend/src/index.css` (`.input`, `.card`, `.brand-wordmark`). The brand
wordmark uses Playfair Display (loaded from Google Fonts in `index.html`)
in gold — the same treatment is reused on the navbar and the Login page.

**New shared components** (`frontend/src/components/`): `TopNav.jsx`
(replaces the old `Sidebar.jsx` + `Header.jsx`, which were deleted — one
horizontally-scrolling top navbar for every module the user has permission
to see, active-route highlighting via a filled gold-on-navy pill, the
branch switcher and user/logout block folded into it), `Badge.jsx`
(GST/Non-GST/success/warning/danger/neutral pills), `Card.jsx` (the
shared white rounded-panel wrapper), `Button.jsx` (primary/secondary/
danger/ghost/gold variants, optional shortcut-hint pill — only used where
a real keyboard shortcut exists), `StatusFooter.jsx` (persistent bottom
bar: app version, live online dot, live clock).

**POS/Billing screen** was rebuilt closely following the reference's
two-column layout — a product grid with category-pill filtering (using the
real categories list) and a Grid/List toggle on the left, and a live
"Current Bill" panel with qty steppers, GST/Non-GST/Free-Qty badges, and a
highlighted Total Amount box on the right — while every existing handler
(add-to-cart, discount, hold/pay/clear, barcode-speed search-and-Enter)
was kept byte-for-byte identical, just re-skinned. Verified live: added
items via the new product grid, adjusted qty with the +/− steppers, and
completed a real sale end-to-end — invoice created, stock deducted, and
printed correctly, exactly as before the redesign.

**Every other screen** (Catalog, Parties, Purchasing, Inventory, Returns,
Collections, Cash Handover, Expenses, Reports, Staff & Permissions,
Settings, Branches, Dashboard) was restyled by updating the shared
`Tabs.jsx` and `EntityTable.jsx` components (used across most of them) plus
a mechanical, page-by-page sweep mapping every old gray/blue/green/amber
Tailwind class to its new token equivalent — no bespoke one-off colors were
left behind (verified with a final grep). Screenshotted Inventory, Reports,
Catalog, and Settings to confirm consistency.

### What wasn't changed, and why

- **Print templates** (`ThermalTemplate.jsx`, `A4Template.jsx`,
  `InvoicePrint.jsx`) were deliberately left in their existing neutral
  black-on-white print styling — these are physical documents handed to
  customers, not app screens, and the reference design doesn't cover
  invoice print layouts.
- **No overall bill-level discount %/₹ toggle** was added to the POS
  summary panel (the reference shows one) — this app's discount logic is
  per-line only (`pos.apply_discount`, section 8 of the original spec); a
  toggle that doesn't correspond to any real aggregate-discount calculation
  would be a fabricated, non-functional control, which the brief explicitly
  said to leave out rather than build.
- **No Route/City field on the bill** — invoices don't carry a route/city
  column (that's a customer-level attribute), so this field from the
  reference has no real data to bind to and was omitted rather than faked.
- **"+ Add Customer" navigates to `/parties`** rather than opening a new
  quick-create modal inline in POS — that quick-create flow doesn't exist
  today, so the button does something real (goes to the actual customer
  management screen) instead of being a dead decoration.
- **No keyboard shortcut hints** (no "F9"/"F6"/"F4" pills) — `Button`
  supports one, but this pass didn't wire any real global key handlers, and
  the brief was explicit: never fabricate a shortcut that doesn't exist.
- **The navbar scrolls horizontally** rather than fitting all items like
  the reference's 5-item example — this app has 14 permission-gated
  modules, meaningfully more than the reference mockup, so a horizontal
  scroll (rather than hiding modules behind a "More" menu, which would
  reduce discoverability) was the straightforward way to keep every module
  reachable from one consistent top-nav pattern.

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
      /Controllers   20 controllers (Auth, Item, Invoice, Purchase, Reports, ...)
      /Middleware    JwtAuthMiddleware, PermissionMiddleware, CorsMiddleware
      /Models        14 models (UserModel, ItemModel, InvoiceModel, ...)
      /Helpers       Router, Response
    /public          index.php (single entry point / router)
    /database        schema.sql, seed.sql, README.md, migrations/ (historical)
  /frontend
    /src
      /pages         Login, Dashboard, POS, Catalog, Reports, Settings, ...
      /components    TopNav, Card, Button, CustomerSelect, Toast, ...
      /hooks         useAuth, usePermission
      /api           client.js + one module per domain
      /store         branchStore.js (Zustand, persisted)
      /print         ThermalTemplate.jsx, A4Template.jsx
  /mobile
    /android         Native Android project (Gradle)
    /ios             Native iOS project
    /src
      /screens       one folder per module (pos, products, purchases, reports, ...)
      /components    shared UI (FormModal, ImportExcelModal, ...)
      /api           mirrors frontend/src/api
      /navigation    RootNavigator, DrawerContent
      /config        env.js (hardcoded API base URL — see AJ_AGENCY_PROJECT_DOCUMENTATION.md §8)
  AJ_AGENCY_PROJECT_DOCUMENTATION.md   Consolidated technical reference
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
