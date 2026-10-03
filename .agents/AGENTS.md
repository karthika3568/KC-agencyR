# Project Rules for AJ Agency ERP

## Database Schema & Migration Rule
- Whenever any database schema change (INSERT, ALTER, UPDATE, DELETE) is performed, ALWAYS create a migration SQL file in `backend/database/migrations/` with format: `YYYYMMDD_HHMMSS_relevant_name.sql`.
- Update `backend/database/schema.sql` and `backend/database/seed.sql` to maintain master schema consistency.
- Always commit and push the migration SQL file to Git.

## Deployment Rule
- **Mandatory Git Push First**: Local changes MUST be committed and pushed to Git (`git push origin main` or `git push origin dev`) **BEFORE** running deployment scripts. If unpushed, the deployment script will block execution.
- **DEV Deployment (`python deploy.py --env dev`)**:
  - All local changes MUST be pushed to `origin/<branch>`.
  - Blocked if uncommitted changes or unpushed commits exist.
- **PRODUCTION Deployment (`python deploy.py --env prod`)**:
  - You MUST be on the `main` branch.
  - All local changes MUST be pushed to `origin/main`.
  - Blocked with error message if not on `main` or if unpushed.
- `python deploy.py` without arguments auto-detects current branch (`main` -> PROD, `dev` -> DEV).
- Keep deployment scripts (`deploy.py`, `deploy_all.py`, `scratch/`) in `.gitignore` and NEVER commit deployment secret credentials to Git.

## Database & Data Safety Rules (CRITICAL)
- **Zero Data Loss Policy**: No `TRUNCATE`, `DROP`, or bulk `DELETE` SQL operations are permitted in deployment scripts or routine APIs. Destructive testing files are strictly prohibited.
- **Automated Pre-Deploy Backup**: Every time `deploy.py` is executed, it automatically performs a full compressed MySQL backup (`.sql.gz`) via SSH to `/var/www/6e8e3914-aa89-4bf4-80a7-3fdbd9b757a9/db_backups/` BEFORE any frontend or backend files are uploaded.
- **Strict Backup Verification**: If the backup creation fails or the resulting file is empty (0 bytes), deployment is halted immediately to guarantee zero data loss.
- **Automated Backup Rotation**: To prevent server storage exhaustion, the backup utility retains the latest 15 backups per environment and automatically prunes older files.
- **User Files & Uploads Protection**: Customer documents, uploads, images, attachments (`uploads/`, `public/uploads/`, `images/`, `attachments/`), and `.env` must NEVER be overwritten, cleared, or deleted during builds or deployments.
- **No Database Resets via Scripts**:
  - Deployments and scripts NEVER reset or clear the database.
  - Automated or script-based database resets are completely disabled. Any structural changes must strictly go through migration SQL files in `backend/database/migrations/`.
