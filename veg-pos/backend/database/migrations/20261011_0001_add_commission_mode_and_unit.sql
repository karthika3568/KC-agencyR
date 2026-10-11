-- Adds explicit commission-mode tracking + an "other deduction" field to
-- commission bills, and a per-line unit snapshot so Item Sales isn't forced
-- into kg for every product. Purely additive — safe to run on a live DB with
-- existing rows (new columns default to values that reproduce prior
-- behaviour: commission_mode defaults to 'percentage', matching how every
-- existing commission bill was computed; other_deduction_amount defaults to
-- 0; unit defaults to 'kg', the only unit the app used before this change).

ALTER TABLE bills
    ADD COLUMN commission_mode ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage' AFTER commission_percent,
    ADD COLUMN other_deduction_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER vadagai_amount;

ALTER TABLE bill_lines
    ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'kg' AFTER item_name_en;

-- Backfill: any existing commission bill that was saved with a NULL
-- commission_percent was, by the old logic, entered as a fixed amount —
-- mark those rows 'fixed' so historical bills keep displaying correctly.
UPDATE bills SET commission_mode = 'fixed' WHERE bill_type = 'commission' AND commission_percent IS NULL;
