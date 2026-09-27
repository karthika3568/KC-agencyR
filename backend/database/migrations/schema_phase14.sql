-- =====================================================================
-- Phase 14 — Retail Price / Wholesale Price as an independent, optional
-- pricing layer on top of the normal Item Master price (NET_SRATE).
--
-- Naming note: the `items` table already has legacy `retail_price` and
-- `wholesale_price` columns. `retail_price` is load-bearing — it's the
-- fallback NET_SRATE for items that predate Phase 12 (see
-- ItemModel::resolveUnitPricing) — so it means something completely
-- different from "this item's Retail-mode selling price" and reusing it
-- would silently corrupt that fallback for older items the moment someone
-- configures a Retail price. `wholesale_price` is currently inert (never
-- read for pricing), but for symmetry and to avoid any future ambiguity
-- both new tiers get their own clearly-named columns instead.
--
-- These are NULL by default: an unconfigured item keeps billing exactly as
-- before (Normal mode using NET_SRATE) — see ItemModel::resolveSellingPrice.
-- =====================================================================

ALTER TABLE items
  ADD COLUMN retail_selling_price DECIMAL(12,2) NULL AFTER secondary_net_purrate,
  ADD COLUMN wholesale_selling_price DECIMAL(12,2) NULL AFTER retail_selling_price;

-- price_type is invoice-level, exactly like the existing bill_type column —
-- the billing screen's pricing-mode selector applies to the whole cart, not
-- per line, so it's snapshotted once per invoice, same precedent as bill_type.
ALTER TABLE invoices
  ADD COLUMN price_type ENUM('normal','retail','wholesale') NOT NULL DEFAULT 'normal' AFTER bill_type;
