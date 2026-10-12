-- Migration: Add Free Quantity configuration options to branch_print_settings
ALTER TABLE branch_print_settings
  ADD COLUMN allow_local_free_qty TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN allow_distance_free_qty TINYINT(1) NOT NULL DEFAULT 0;
