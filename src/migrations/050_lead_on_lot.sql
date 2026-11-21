-- Customer on lot flag when they text HERE.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'on_lot'
    ),
    'SELECT 1',
    'ALTER TABLE leads ADD COLUMN on_lot TINYINT(1) NOT NULL DEFAULT 0 AFTER notes'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'on_lot_at'
    ),
    'SELECT 1',
    'ALTER TABLE leads ADD COLUMN on_lot_at DATETIME NULL AFTER on_lot'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
