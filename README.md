# POS / Distributor Billing System — Phase 1 (Foundation)

Multi-branch, role-based POS + distributor billing system. This is **Phase 1
only**: authentication, the permission registry, and a frontend shell whose
sidebar/menus render according to the logged-in user's effective permissions.
No catalog, billing, stock, or reports tables/screens exist yet — they land in
later phases.

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
