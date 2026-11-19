-- Optional BDC CSV fields: lead trade-in; inventory trim, mileage, color.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'trade_in'
    ),
    'SELECT 1',
    'ALTER TABLE leads ADD COLUMN trade_in VARCHAR(255) NULL AFTER vehicle'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'merchandising_vehicles' AND COLUMN_NAME = 'trim'
    ),
    'SELECT 1',
    'ALTER TABLE merchandising_vehicles ADD COLUMN trim VARCHAR(100) NULL AFTER model'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'merchandising_vehicles' AND COLUMN_NAME = 'mileage'
    ),
    'SELECT 1',
    'ALTER TABLE merchandising_vehicles ADD COLUMN mileage INT NULL AFTER trim'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'merchandising_vehicles' AND COLUMN_NAME = 'color'
    ),
    'SELECT 1',
    'ALTER TABLE merchandising_vehicles ADD COLUMN color VARCHAR(50) NULL AFTER mileage'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
