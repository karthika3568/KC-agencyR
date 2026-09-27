-- =====================================================================
-- Phase 12 — NET_SRATE / NET_PURRATE as first-class item pricing fields,
-- with independent secondary-unit pricing (S-MRP/S-NET_SRATE/S-NET_PURRATE).
--
-- These are genuinely new business fields, distinct from the existing
-- retail_price/purchase_price columns (kept untouched — nothing currently
-- reading them is removed). net_srate/net_purrate are left NULL for
-- existing items on purpose: every place that reads them for pricing
-- falls back to retail_price/purchase_price explicitly in code (never a
-- silent one-time backfill), per the safe-fallback requirement.
-- =====================================================================

ALTER TABLE items
  ADD COLUMN net_srate DECIMAL(12,2) NULL AFTER mrp,
  ADD COLUMN net_purrate DECIMAL(12,2) NULL AFTER net_srate,
  ADD COLUMN secondary_mrp DECIMAL(12,2) NULL AFTER net_purrate,
  ADD COLUMN secondary_net_srate DECIMAL(12,2) NULL AFTER secondary_mrp,
  ADD COLUMN secondary_net_purrate DECIMAL(12,2) NULL AFTER secondary_net_srate;
