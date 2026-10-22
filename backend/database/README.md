# Database Setup — KC Agency POS

This folder holds the complete MySQL/MariaDB structure and safe demo data
for a fresh installation of the KC Agency POS / Distributor Billing System.

## Files

| File | Purpose |
| --- | --- |
| `schema.sql` | **Complete structure** — every table, key, index, and foreign key needed for a fresh install. Consolidated from the project's own incremental migration files (`migrations/schema_phase1.sql` … `schema_phase15.sql`), in the exact order they were actually applied, so it reflects the real, tested schema — nothing rewritten or invented. |
| `seed.sql` | **Safe demo data only** — one company, one branch, the full permission registry + default role grants, one Super Admin login, tax codes/stock units, invoice number sequences, and default expense categories. No real customer, sales, or business data. Consolidated the same way from `migrations/seed_phase1.sql`, `seed_phase2.sql`, `seed_phase3.sql`, `seed_phase5.sql`. |
| `migrations/` | Historical record of every individual phase's schema/seed file, kept for reference and audit trail. **Do not import these separately if you've already imported `schema.sql`/`seed.sql`** — they're superseded by the consolidated files, not additive. |
| `seed_load_test.php` | A standalone load-testing script (bulk-inserts thousands of invoices directly via SQL, bypassing business logic, tagged `invoice_no LIKE 'LOAD-%'` for easy cleanup). Not part of normal setup — see its header comment. |

### One deliberate fix during consolidation

`migrations/schema_phase7.sql` originally did `DROP INDEX uq_invoices_invoice_no` then
re-added it as a branch-scoped key — a fix-up for databases that had already run an
older `schema_phase3.sql`. At some point `schema_phase3.sql` itself was updated to
create the branch-scoped key directly, which makes that particular two-line ALTER a
guaranteed error on a brand-new database (the old global key never existed to drop).
The consolidated `schema.sql` skips those two lines (see the comment in place of them)
so a fresh install actually succeeds; `migrations/schema_phase7.sql` is left untouched
as the historical record. Verified end-to-end (see below) — this is the only change
made to any statement's logic during consolidation; everything else is a literal,
unmodified concatenation of the original files.

## Setup (fresh database)

1. Create an empty database (phpMyAdmin, or the command line):

   ```bash
   mysql -u root -p -e "CREATE DATABASE pos_system CHARACTER SET utf8mb4;"
   ```

2. Import the schema, then the seed data, **in that order**:

   ```bash
   mysql -u root -p pos_system < backend/database/schema.sql
   mysql -u root -p pos_system < backend/database/seed.sql
   ```

3. Configure the backend's `.env` (copy `backend/.env.example` → `backend/.env`) to point
   at this database — `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.

4. Start Apache/PHP (see the root `README.md` for the full backend setup) and log in with
   the seeded Super Admin account documented there.

This was verified end-to-end in this session: both files were imported into a throwaway
database with no errors, producing 55 tables, 48 permissions, and 129 default
role-permission grants, then the throwaway database was dropped.

## Notes

- Both files are MySQL/MariaDB-safe (`ENGINE=InnoDB`, `utf8mb4`). `CREATE TABLE IF NOT
  EXISTS` is used throughout, so re-running `schema.sql` against an already-set-up
  database is safe; the seed data uses `INSERT ... ON DUPLICATE KEY UPDATE` /
  `INSERT IGNORE` where the underlying table supports it, so `seed.sql` is also safe to
  re-run.
- The seeded Super Admin password is documented in the root `README.md` — it's a
  dev-only default; change it immediately on any real deployment.
- Never commit a real production database dump here. If you need to snapshot real data
  for debugging, keep it outside the repository.
