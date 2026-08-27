-- Add last_active for Users & Roles table

ALTER TABLE users
  ADD COLUMN last_active DATETIME NULL AFTER salesperson_id;
