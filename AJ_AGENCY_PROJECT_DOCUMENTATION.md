# AJ Agency — Project Documentation

Complete technical reference for the AJ Agency POS / Distributor Billing System:
a React.js web app, a React Native mobile app, and a PHP REST API backend on
MySQL/MariaDB. Everything below is verified against the actual codebase at the
time of writing — no invented tables, endpoints, or versions.

For the phase-by-phase build history and detailed feature notes, see the root
[`README.md`](README.md). This document is the consolidated reference.

---

## 1. System Overview

```
AJ Agency
   │
   ├── React.js Web (frontend/)
   │       │
   │       └── PHP REST API (backend/)
   │                 │
   │                 └── MySQL / MariaDB
   │
   └── React Native Mobile (mobile/)
           │
           └── same PHP REST API (backend/)
                     │
                     └── same MySQL / MariaDB
```

Both the web app and the mobile app are thin clients over **one shared backend**
— there is no separate mobile API. Both talk to the same
`backend/public/index.php` router and the same database.

### Request flow

```
Login (email + password)
 ↓
AuthController::login() — verifies password_hash(), returns a signed JWT
 ↓
Client stores the JWT (browser: in-memory/localStorage via the frontend's
 axios client; mobile: react-native-encrypted-storage)
 ↓
Every subsequent request sends "Authorization: Bearer <token>"
 ↓
JwtAuthMiddleware::authenticate() verifies the token, decodes claims
 (user id, role, branch_id, effective permission codes)
 ↓
PermissionMiddleware::require($claims, 'some.permission.code') — 403s if missing
 ↓
Controller runs its business logic against the PDO connection
 ↓
MySQL
 ↓
JSON response
 ↓
UI updates (React Query cache invalidation on web/mobile)
```

---

## 2. Repository Structure

```
pos-system/                          (git root — this is the repo, not a subfolder)
├── backend/                         PHP REST API
│   ├── config/                     database.php, config.php (.env-driven)
│   ├── database/                   schema.sql, seed.sql, README.md, migrations/
│   ├── public/                     index.php (single entry point/router), uploads/
│   ├── src/
│   │   ├── Controllers/
│   │   ├── Middleware/             CorsMiddleware, JwtAuthMiddleware, PermissionMiddleware
│   │   ├── Models/
│   │   └── Helpers/                Router, Response, etc.
│   ├── vendor/                     (gitignored — composer install)
│   ├── .env.example
│   └── composer.json
├── frontend/                        React web app
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── store/                  Zustand (branch context, etc.)
│   │   └── print/                  Thermal/A4 invoice templates
│   ├── .env.example
│   └── package.json
├── mobile/                          React Native app
│   ├── android/                    Native Android project (Gradle)
│   ├── ios/                        Native iOS project
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── api/
│   │   ├── navigation/
│   │   └── config/env.js           Hardcoded API base URL (no .env — see §7)
│   └── package.json
├── AJ_AGENCY_PROJECT_DOCUMENTATION.md   (this file)
├── README.md
└── .gitignore
```

There is no separate top-level `database/` folder — the project's own convention
(established since Phase 1) keeps all SQL under `backend/database/`, so that's
where the consolidated `schema.sql`/`seed.sql` live.

---

## 3. Stack & Versions (verified, not assumed)

| Layer | Technology | Verified version |
| --- | --- | --- |
| Backend language | PHP | 8.2.12 (CLI, this environment); `composer.json` requires `>=8.1` |
| Backend deps | `firebase/php-jwt` `^7.1`, `vlucas/phpdotenv` `^5.6`, `phpoffice/phpspreadsheet` `^5.10` | via Composer |
| Backend web server | Apache (XAMPP) | serves `backend/public/` directly |
| Database | MySQL/MariaDB | this dev machine runs MySQL Server 9.4 on port 3306 (not XAMPP's bundled MariaDB — see root README's "Correction to earlier phase notes") |
| Frontend | React | 18.3.1 |
| Frontend build | Vite | 5.4.8, with `vite-plugin-pwa` 0.21.2 |
| Frontend state/data | Zustand 4.5.5, `@tanstack/react-query` 5.59.0 |
| Frontend routing | `react-router-dom` 6.27.0 |
| Frontend styling | Tailwind CSS 3.4.13 |
| Mobile framework | React Native | 0.87.1 |
| Mobile React | React | 19.2.3 |
| Mobile nav | `@react-navigation` (native 7.4.1, drawer 7.14.2, bottom-tabs 7.19.2, native-stack 7.19.2) |
| Mobile data | `@tanstack/react-query` 5.103.2 |
| Node (this environment) | 22.14.0 | matches mobile's `engines.node >= 22.11.0` |
| JDK (this environment) | OpenJDK 17.0.10 |
| Composer | 2.10.3 |
| Gradle wrapper | 9.4.1 (`mobile/android/gradle/wrapper/gradle-wrapper.properties`) |
| Android Gradle Plugin toolchain | `compileSdk`/`targetSdk` 36, `minSdk` 24, `buildToolsVersion` 36.0.0, `ndkVersion` 27.1.12297006, Kotlin 2.2.0 |
| Hermes | enabled (`hermesEnabled=true` in `gradle.properties`) |
| New Architecture | enabled (`newArchEnabled=true`) |
| Android application ID | `com.ajagencymobile` |

---

## 4. Database

Full detail: [`backend/database/README.md`](backend/database/README.md).

- **`backend/database/schema.sql`** — the complete structure for a fresh install
  (55 tables), consolidated from the project's own incremental migration files
  in their original, already-applied order.
- **`backend/database/seed.sql`** — safe demo data only: 1 company, 1 branch,
  the full permission registry (48 permissions) + default role grants (129
  role-permission rows), 1 Super Admin login, tax codes, stock units, invoice
  sequences, expense categories.
- **`backend/database/migrations/`** — the original per-phase files, kept for
  historical reference.
- Both files were test-imported end-to-end into a throwaway database during
  this documentation pass and verified to succeed with no errors (see §4 of
  `backend/database/README.md` for the one fix that was needed and why).

### Key tables and relationships (by module)

| Module | Core tables |
| --- | --- |
| Auth & permissions | `company`, `branches`, `roles`, `permissions`, `role_permissions`, `users`, `user_permissions`, `login_log` |
| Catalog | `categories`, `brands`, `category_brands`, `product_lines`, `tax_codes`, `stock_units`, `items`, `item_unit_conversions`, `item_branches` |
| Parties | `routes`, `cities`, `customers`, `suppliers`, `supplier_routes` |
| Billing | `stock_ledger`, `stock_movements`, `invoice_sequences`, `invoices`, `invoice_items`, `invoice_payments`, `credit_transactions` |
| Purchasing | `purchase_requests`, `purchase_request_items`, `purchases` (GRN), `purchase_items`, `supplier_ledger_transactions`, `supplier_payments`, `supplier_payment_allocations` |
| Inventory ops | `stock_adjustments`, `stock_issue_notes`, `stock_issue_items`, `stock_return_notes`, `stock_return_items` |
| Returns | `sales_returns`, `sales_return_items`, `purchase_returns`, `purchase_return_items` |
| Collections & cash | `customer_collections`, `collection_allocations`, `cash_handovers`, `cash_handover_items` |
| Expenses | `expense_categories`, `expenses`, `other_income` |
| Orders | `customer_prebookings`, `customer_prebooking_items` |
| Settings | `branch_print_settings` |

### Important constraints/business rules baked into the schema

- **`invoices.invoice_no` is unique per branch**, not globally
  (`uq_invoices_branch_invoice_no (branch_id, invoice_no)`) — two branches can
  each have an `INV-000001`.
- **`item_branches`** is the source of truth for where an item is sellable — an
  item with zero rows here is available *nowhere*, not "everywhere" (a
  deliberate departure from the original "items are global" design). This is
  the mechanism behind the branch-context filtering documented in §8.
- **Stock is only ever mutated through `StockLedgerService`** (application-level
  invariant, not a DB trigger) — every change writes both the running balance
  (`stock_ledger`) and an audit row (`stock_movements`) in the same transaction.
- **`balance_amount` on `sales_returns`/`purchase_returns` is a generated column**
  (`return_total - refund_amount`), not stored redundantly.
- Composite index `idx_invoices_branch_status_date (branch_id, status,
  invoice_date)` exists specifically because a 5,000-invoice load test found
  the reports queries needed it (see root README's Phase 7 notes).

---

## 5. Backend (PHP REST API)

- **No framework** — a small regex-based `Router` (`backend/src/Helpers/Router.php`)
  dispatches to controller closures registered in `backend/public/index.php`.
- **Auth**: `firebase/php-jwt`-based JWT, issued on login, verified by
  `JwtAuthMiddleware::authenticate()` on every protected route. Claims carry
  the user id, role, branch, and effective permission codes.
- **Authorization**: `PermissionMiddleware::require($claims, 'code')` — every
  permission-gated route calls this explicitly; there is no route-level
  middleware stack, so it's enforced per-controller-action, verified in earlier
  phases to return real 403s (see root README's Phase 1 verification steps).
- **CORS**: `CorsMiddleware::handle()`, origins from `APP_CORS_ORIGINS` (comma-separated).
- **DB access**: raw PDO (`config/database.php` → `get_pdo()`), prepared
  statements throughout, `PDO::ATTR_EMULATE_PREPARES => false`.
- **Branch scoping**: most list/read/write operations resolve an effective
  `branch_id` — either the user's own home branch, or (for roles with
  `branches.switch_context`) whatever `?branch_id=` query param the client
  sends. This is *not* enforced identically everywhere — see §8.
- **File uploads**: `backend/public/uploads/` (item images), gitignored.
- **Excel import/export**: `phpoffice/phpspreadsheet`, used by `ItemController`
  for the Items import/export/template flow.
- **`backend/package.json`** exists solely to pull in `jspdf`/`jspdf-autotable`
  as Node dependencies — these are not used by the PHP code; they exist for a
  Node-side tooling/reporting script outside the request path. Its
  `node_modules/` is gitignored like any other.

### Folder reference

```
backend/src/Controllers/   20 controllers (Auth, Branch, Item, Invoice, Purchase,
                            PurchaseReturn, SalesReturn, StockHub, CashHandover,
                            Collection, CustomerPrebooking, Dashboard, Reports,
                            Settings, PurchaseRequest, StockAdjustment,
                            SupplierPayment, User, VanStock, Crud/BranchScopedCrud)
backend/src/Models/        14 models (one per major entity, plus SimpleCrudModel
                            for the ~10 generic lookup tables)
backend/src/Middleware/    CorsMiddleware, JwtAuthMiddleware, PermissionMiddleware
```

---

## 6. API Reference (grouped, from the actual router)

All endpoints are prefixed `/api`. Authentication is `Bearer <JWT>` unless
noted. Permission codes are enforced server-side by `PermissionMiddleware`.
This list was extracted directly from `backend/public/index.php` (153 routes).

### Authentication
| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/login` | none | Returns a JWT + user profile |
| GET | `/auth/me` | Bearer | Current user's profile + effective permissions |

### Branches
`GET/POST /branches`, `GET/PUT /branches/{id}` — gated `branches.manage`.

### Catalog
`GET/POST /categories`, `PUT/DELETE /categories/{id}`, `GET/PUT
/categories/{id}/brands`, `GET/POST /brands`, `PUT/DELETE /brands/{id}`,
`GET/POST /product-lines`, `PUT/DELETE /product-lines/{id}`, `GET/POST
/tax-codes`, `PUT/DELETE /tax-codes/{id}`, `GET/POST /stock-units`, `PUT/DELETE
/stock-units/{id}` — gated `catalog.manage_items` for writes.

### Items
`GET /items`, `GET /items/{id}`, `POST/PUT/DELETE /items[/{id}]`, `GET
/items/pricing`, `PUT /items/pricing`, `GET /items/export`, `GET
/items/import/template`, `POST /items/import/preview`, `POST
/items/import/commit`, `POST /items/{id}/image`, `DELETE /items/{id}/image`,
`POST /items/image-search`.

### Parties
`GET/POST /customers`, `PUT /customers/{id}`, `GET
/customers/{id}/unpaid-invoices`, `GET/POST /suppliers`, `PUT
/suppliers/{id}`, `GET /suppliers/balances`, `GET
/suppliers/{id}/unpaid-grns`, `GET/POST /routes`, `PUT /routes/{id}`, `GET/PUT
/routes/{id}/suppliers`, `GET/POST /cities`, `PUT/DELETE /cities/{id}`.

### Billing / Invoices
`GET /invoices`, `GET /invoices/{id}`, `POST /invoices`, `PUT
/invoices/{id}`, `PUT /invoices/{id}/edit`, `POST /invoices/{id}/complete`,
`POST /invoices/{id}/cancel`, `GET /invoices/{id}/print`, `GET
/invoices/{id}/returnable-items`.

### Purchasing
`GET/POST /purchase-requests`, `GET /purchase-requests/{id}`, `POST
/purchase-requests/{id}/approve`, `POST /purchase-requests/{id}/cancel`,
`GET/POST /purchases`, `GET /purchases/{id}`, `PUT /purchases/{id}`, `GET
/purchases/{id}/returnable-items`, `GET/POST /supplier-payments`.

### Inventory
`GET/POST /stock-adjustments`, `GET /stock-hub`, `GET /stock-hub/low-stock`,
`GET /van-stock/{employeeId}`, `POST /van-stock/issue`, `POST /van-stock/return`.

### Returns
`GET/POST /sales-returns`, `GET /sales-returns/{id}`, `POST
/sales-returns/{id}/approve`, `POST /sales-returns/{id}/reject`, `GET/POST
/purchase-returns`, `GET /purchase-returns/{id}`.

### Collections & Cash
`GET/POST /collections`, `GET /collections/pending`, `GET/POST
/cash-handovers`, `GET /cash-handovers/pending`, `POST
/cash-handovers/{id}/verify`.

### Expenses
`GET/POST /expense-categories`, `GET/POST /expenses`, `DELETE
/expenses/{id}`, `GET/POST /other-income`, `DELETE /other-income/{id}`.

### Orders (Customer Pre-Booking)
`GET/POST /customer-prebookings`, `GET /customer-prebookings/{id}`, `PUT
/customer-prebookings/{id}`, `PUT /customer-prebookings/{id}/status`, `POST
/customer-prebookings/{id}/cancel`, `GET /customer-prebookings/export`.

### Reports
`GET /reports/branch-wise-sales`, `/brand-wise-sales`,
`/brand-category-wise-sales`, `/category-wise-sales`, `/customer-wise-sales`,
`/route-wise-sales`, `/supplier-wise-sales`, `/item-wise-sales`,
`/credit-outstanding`, `/gst-register`, `/non-gst-register`,
`/purchase-register`, `/expense-income`, `/profit` — each gated by its own
report permission code, each with a date-range filter.

### Dashboard
`GET /dashboard/summary` — gated `dashboard.view_financial_summary`.

### Staff & Permissions
`GET/POST /users`, `GET/PUT /users/{id}`, `GET/PUT /users/{id}/permissions`,
`GET /roles` (read-only), `GET /permissions` (registry), `GET /staff/accounts`
(Phase-1 self-check endpoint).

### Settings
`GET/PUT /settings/branch`, `GET/PUT /settings/print`, `GET
/settings/sequences`, `PUT /settings/sequences/{id}`.

---

## 7. Frontend (React Web)

- **Routing**: `react-router-dom`, top-level shell in `App.jsx`.
- **State**: React Query for server state; Zustand (`store/branchStore.js`,
  persisted to localStorage) for the selected-branch UI context.
- **API layer**: `src/api/*.js` — one module per domain (`catalog.js`,
  `invoices.js`, `purchasing.js`, `admin.js`), all going through a shared
  axios client (`src/api/client.js`) that attaches the JWT and the persisted
  `branch_id` to every request.
- **Auth**: JWT stored client-side, `usePermission()` hook gates UI by
  permission code (mirroring server-side enforcement, not replacing it).
- **Pages** (`src/pages/`): Login, Dashboard, POS (billing), Catalog,
  ItemsPanel, Parties, Purchasing, Inventory, Returns, Collections,
  CashHandover, Expenses, Reports, StaffPermissions, Settings, Branches,
  OrderManagement, InvoiceManagement, InvoicePrint, PriceAdjustment.
- **Print**: `src/print/ThermalTemplate.jsx` (80mm) and `A4Template.jsx`,
  rendered via `window.print()`.
- **PWA**: `vite-plugin-pwa` generates a Workbox service worker; every
  `/api/*` call is `NetworkOnly` (billing is not offline-first by design —
  only the static app shell is cached).
- **Env var**: `VITE_API_BASE_URL` (see `frontend/.env.example`) — the only
  environment variable the frontend actually reads (verified by grep).

---

## 8. Mobile (React Native)

- **Navigation**: `@react-navigation` — a drawer (`DrawerContent.jsx`) as the
  root shell, with stack/tab navigators per module (`RootNavigator.jsx`,
  `navItems.js`).
- **State**: React Query for server state; no separate global client store —
  simpler screens manage local state directly.
- **API layer**: mirrors the web app's `src/api/*.js` structure, all through
  a shared axios client (`src/api/client.js`) that attaches the JWT from
  `react-native-encrypted-storage` and maps every failure to one
  user-safe message (`friendlyErrorMessage`).
- **Auth/local storage**: `@react-native-async-storage/async-storage` +
  `react-native-encrypted-storage` for the token/session.
- **Barcode/camera**: `react-native-camera-kit`.
- **Printing**: `react-native-bluetooth-escpos-printer` (thermal receipts),
  `react-native-html-to-pdf` (PDF), `react-native-share` (share sheet).
- **Excel**: `xlsx` (client-side) + the same backend import/export endpoints
  as web.

### API base URL — no `.env` on mobile

Unlike the backend and web frontend, **the mobile app does not use `.env`
files or any environment-variable loading mechanism** (no `react-native-config`,
no `dotenv` package in `package.json`). The API base URL is a single hardcoded
constant:

```js
// mobile/src/config/env.js
export const API_BASE_URL = 'http://10.34.140.90/pos/backend/public/api';

```

`10.0.2.2` is the Android emulator's alias for the host machine's own
`localhost`; a physical device needs the host's real LAN IP (as it is set
here), and that IP is machine-specific — **edit this file directly** when
setting up on a new machine or network, rather than looking for a `.env.example`
that would misrepresent how this app actually resolves its API URL.

### Android configuration (source of truth: the committed Gradle files)

| Setting | Value | Source |
| --- | --- | --- |
| `applicationId` | `com.ajagencymobile` | `android/app/build.gradle` |
| `minSdkVersion` / `compileSdk` / `targetSdk` | 24 / 36 / 36 | `android/build.gradle` |
| `buildToolsVersion` | 36.0.0 | `android/build.gradle` |
| `ndkVersion` | 27.1.12297006 | `android/build.gradle` |
| Kotlin | 2.2.0 | `android/build.gradle` |
| Gradle wrapper | 9.4.1 | `android/gradle/wrapper/gradle-wrapper.properties` |
| Hermes | enabled | `android/gradle.properties` |
| New Architecture | enabled | `android/gradle.properties` |
| Debug signing | `debug.keystore` / alias `androiddebugkey` (committed debug-only keystore, standard RN default — not a secret) | `android/app/build.gradle` |
| Release signing | **not configured** — release builds currently reuse the debug signing config (`signingConfig signingConfigs.debug` under `buildTypes.release`) | `android/app/build.gradle` |

**Do not replace these committed Gradle files with another project's** — per
the source-of-truth principle, this project's own `android/build.gradle`,
`android/app/build.gradle`, `android/settings.gradle`,
`android/gradle.properties`, and `android/gradle/wrapper/` are authoritative.

### Release build — what's real vs. what still needs setup

The `package.json` scripts are `android`, `ios`, `start`, `lint`, `test` —
there is no dedicated `assembleRelease`/`bundleRelease` npm script defined, so
release builds use the standard React Native Gradle commands directly:

```bash
# Debug build + install to a connected device/emulator
npx react-native run-android

# Release APK
cd android && ./gradlew assembleRelease

# Release AAB (Play Store)
cd android && ./gradlew bundleRelease
```

**Signing caveat, stated plainly**: because `buildTypes.release` currently
points at the debug keystore, the above `assembleRelease`/`bundleRelease`
commands will produce a release-configured but debug-signed artifact — not
suitable for a real Play Store upload. Generating a real upload keystore and
wiring it into a dedicated release `signingConfig` (without committing the
keystore or its password) is required before a genuine production release;
this documentation does not fabricate that step since it hasn't been done in
this codebase.

---

## 9. Billing Flow (POS)

```
Select item (search / barcode scan+Enter)
 ↓
Add to cart (qty, free-qty, per-line discount if pos.apply_discount)
 ↓
GST / Non-GST toggle (whole-invoice, never per-line)
 ↓
Price mode: normal / retail / wholesale (invoice-level, Phase 14)
 ↓
Payment (split cash/digital; shortfall vs. attached customer → sale_credit)
 ↓
Complete & Print → atomic transaction: invoice number assigned,
  stock deducted via StockLedgerService, invoice_payments inserted,
  credit ledger updated if applicable
 ↓
Thermal (80mm) or A4 print template, or WhatsApp share (wa.me text link)
```

- IGST/interstate billing is **not implemented** — every sale computes
  CGST+SGST only.
- A held bill (`status='held'`) never touches invoice numbering or stock —
  only `Complete` does.

---

## 10. Reports

Every report in §6's Reports group takes a date-range filter and is
independently gated by its own permission code; each has an "Export to
Excel" action gated additionally behind `reports.export_excel`. GST and
Non-GST registers are strictly separate — a bill's `bill_type` is fixed at
creation and never toggle-able after the fact.

## 11. Staff & Permissions

- 5 seeded roles (`roles` table), each with a `role_permissions` default set.
- Per-employee overrides (`user_permissions`, `is_granted` 1/0) sit on top of
  the role default and can force-allow or force-deny any individual
  permission code, cycling back to "role default" when cleared.
- Every permission check happens server-side in `PermissionMiddleware`; the
  frontend's `usePermission()` only hides UI, it does not gate access.

---

## 12. Known branch-scoping inconsistency (found this session, not yet fixed)

`ItemController::resolveBranchId()` honors an incoming `?branch_id=` query
param **unconditionally** — it is not gated behind the
`branches.switch_context` permission the way branch-resolution is gated in
some other controllers built in later phases. Practically: the web app's
persisted branch-context filter (`branchStore`, localStorage) attaches
`branch_id` to every request including Items list calls, and because
`ItemModel::all()` inner-joins `item_branches` when a `branch_id` is present,
**an item mapped only to "Main Branch" will not appear when a different
branch is selected in the header switcher** — this looks like a missing-data
bug but is actually the branch-scoping filter working as designed, just
without a permission gate on who can trigger it via the query string. This
was diagnosed via direct `curl` testing (with and without `branch_id`) during
this session, not fixed — flagging it here rather than silently leaving it
undocumented. If you see "items not showing" reports, check the branch
switcher first.

---

## 13. Setup for a New Developer

```bash
# 1. Clone
git clone <this repository's URL>
cd pos-system

# 2. Backend
cd backend
composer install
copy .env.example .env      # Windows; `cp` on macOS/Linux
# edit .env: DB_DATABASE, DB_USERNAME, DB_PASSWORD, JWT_SECRET

# 3. Database
mysql -u root -p -e "CREATE DATABASE pos_system CHARACTER SET utf8mb4;"
mysql -u root -p pos_system < database/schema.sql
mysql -u root -p pos_system < database/seed.sql

# 4. Serve the backend
# Place/keep this repo under XAMPP's htdocs so Apache serves
# backend/public/ directly — no separate PHP server needed.

# 5. Frontend
cd ../frontend
npm install
copy .env.example .env
npm run dev
# open http://localhost:5173

# 6. Mobile
cd ../mobile
npm install
# edit src/config/env.js — set API_BASE_URL to your machine's LAN IP
# (or 10.0.2.2 for the Android emulator)
npx react-native start        # Metro, in one terminal
npx react-native run-android  # in another terminal
```

Default seeded login (dev only — rotate before any real deployment):

```
Email:    admin@example.com
Password: Admin@123
```

---

## 14. Troubleshooting (project-specific, observed during this work)

- **"Cannot reach the server" on mobile, works fine on web** — almost always
  `mobile/src/config/env.js`'s hardcoded IP. `10.0.2.2` only works from the
  Android *emulator*; a physical device needs your machine's actual LAN IP,
  and that IP changes if your machine reconnects to a different network.
- **CORS errors on web in dev** — check `APP_CORS_ORIGINS` in `backend/.env`
  includes the exact origin Vite is serving from (default `http://localhost:5173`).
- **"Inserted 0" / items seem missing after import** — check the branch
  switcher in the web navbar first (see §12) before assuming the import or
  backend failed; verified this session via direct API testing.
- **`mysql.exe` from XAMPP fails with a `caching_sha2_password` plugin
  error** — this dev machine's actual running MySQL service is a separately
  installed **MySQL Server 9.4** (not XAMPP's bundled MariaDB), and XAMPP's
  bundled client is too old to load that auth plugin. Use the MySQL 9.4
  client (`C:\Program Files\MySQL\MySQL Server 9.4\bin\mysql.exe` on this
  machine) or phpMyAdmin instead.
- **Gradle/Android build issues** — confirm your local Android SDK has
  `compileSdk`/`targetSdk` 36 and NDK 27.1.12297006 installed via Android
  Studio's SDK Manager; these are pinned in `android/build.gradle`, not
  auto-installed.

---

## 15. First-Day Developer Checklist

```
[ ] Install PHP 8.1+, Composer, Node 18+ (22+ recommended), MySQL/MariaDB
[ ] Install JDK 17, Android Studio + SDK 36 + NDK 27.1.12297006 (mobile only)
[ ] Clone the repository, checkout main
[ ] backend: composer install; copy .env.example to .env; edit DB_* and JWT_SECRET
[ ] Create the database; import backend/database/schema.sql then seed.sql
[ ] Confirm XAMPP/Apache serves backend/public/ (or point your own web server at it)
[ ] frontend: npm install; copy .env.example to .env; npm run dev
[ ] Log in at http://localhost:5173 with the seeded Super Admin
[ ] mobile: npm install; edit src/config/env.js to your machine's LAN IP
[ ] mobile: npx react-native start, then npx react-native run-android
[ ] Verify GET /api/auth/me returns your permission list (Bearer token from login)
[ ] Verify a POS sale completes end-to-end (stock deducts, invoice prints)
[ ] Verify a report loads and exports to Excel
```

---

## 16. What this documentation does NOT claim

- No live browser or physical-device test was re-run as part of writing this
  document — the functional verifications cited above (Phase 1–7 checks, the
  branch-scoping diagnosis) were performed in earlier sessions and are
  reported here as-is; the schema/seed import (§4) *was* freshly re-verified
  in this session against a real MySQL 9.4 instance.
- Release-signing for Android (§8) is explicitly flagged as not production-ready
  rather than glossed over.
- IGST/IGST-adjacent state-based tax logic is not implemented (§9) — not a bug,
  a documented open scope item from the original spec.
