-- Pause SMS without deleting saved carrier keys.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dealerships' AND COLUMN_NAME = 'sms_status'
    ),
    'SELECT 1',
    'ALTER TABLE dealerships ADD COLUMN sms_status VARCHAR(20) NULL AFTER sms_profile_id'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE dealerships
SET sms_status = 'CONNECTED'
WHERE sms_provider IS NOT NULL
  AND sms_phone_number IS NOT NULL
  AND (sms_status IS NULL OR sms_status = '');
