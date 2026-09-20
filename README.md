# POS / Distributor Billing System — Phase 1 + 2 + 3

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

Purchasing, returns, cash handover, and reports still don't exist — they
land in later phases.

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

Or from the command line:

```bash
mysql -u root -p pos_system < backend/database/schema.sql
mysql -u root -p pos_system < backend/database/seed.sql
mysql -u root -p pos_system < backend/database/schema_phase2.sql
mysql -u root -p pos_system < backend/database/seed_phase2.sql
mysql -u root -p pos_system < backend/database/schema_phase3.sql
mysql -u root -p pos_system < backend/database/seed_phase3.sql
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
