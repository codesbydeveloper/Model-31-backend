-- Personal cell that receives the buyer-arrival test text.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dealerships' AND COLUMN_NAME = 'sms_manager_mobile'
    ),
    'SELECT 1',
    'ALTER TABLE dealerships ADD COLUMN sms_manager_mobile VARCHAR(30) NULL AFTER sms_phone_number'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
