-- Lowest price the AI may offer (invoice floor). Asking price stays in `price`.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'merchandising_vehicles' AND COLUMN_NAME = 'min_price'
    ),
    'SELECT 1',
    'ALTER TABLE merchandising_vehicles ADD COLUMN min_price DECIMAL(12, 2) NULL AFTER price'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
