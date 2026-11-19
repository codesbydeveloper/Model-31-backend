-- Manager email that receives deal sheets on lot arrival.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dealerships' AND COLUMN_NAME = 'sms_manager_email'
    ),
    'SELECT 1',
    'ALTER TABLE dealerships ADD COLUMN sms_manager_email VARCHAR(191) NULL AFTER sms_manager_mobile'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
