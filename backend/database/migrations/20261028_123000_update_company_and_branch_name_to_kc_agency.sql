-- Migration: Update company and branch names from AJ Agency to KC Agency
-- Created At: 2026-10-28 12:30:00

UPDATE `company` 
SET `name` = 'KC Agency' 
WHERE `name` = 'AJ Agency' OR `id` = 1;

UPDATE `branches` 
SET `print_name` = 'KC AGENCY' 
WHERE `print_name` = 'AJ AGENCY' OR `id` = 1;

