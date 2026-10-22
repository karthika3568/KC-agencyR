-- Migration: Make item_id nullable on invoice_items to support manual Quick Sale items
-- Created: 2026-10-16 09:45:00

ALTER TABLE invoice_items MODIFY item_id INT UNSIGNED NULL;
