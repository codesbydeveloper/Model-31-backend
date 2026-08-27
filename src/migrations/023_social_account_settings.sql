-- Social account settings (idempotent)

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'social_accounts' AND COLUMN_NAME = 'environment'
    ),
    'SELECT 1',
    'ALTER TABLE social_accounts ADD COLUMN environment VARCHAR(20) NOT NULL DEFAULT ''Production'' AFTER model31_source'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'social_accounts' AND COLUMN_NAME = 'posting_enabled'
    ),
    'SELECT 1',
    'ALTER TABLE social_accounts ADD COLUMN posting_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER environment'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'social_accounts' AND COLUMN_NAME = 'auto_publishing'
    ),
    'SELECT 1',
    'ALTER TABLE social_accounts ADD COLUMN auto_publishing TINYINT(1) NOT NULL DEFAULT 0 AFTER posting_enabled'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'social_accounts' AND COLUMN_NAME = 'default_content_type'
    ),
    'SELECT 1',
    'ALTER TABLE social_accounts ADD COLUMN default_content_type VARCHAR(50) NULL DEFAULT ''Vehicle Promotion'' AFTER auto_publishing'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'social_accounts' AND COLUMN_NAME = 'default_language'
    ),
    'SELECT 1',
    'ALTER TABLE social_accounts ADD COLUMN default_language VARCHAR(50) NULL DEFAULT ''English'' AFTER default_content_type'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'social_accounts' AND COLUMN_NAME = 'default_timezone'
    ),
    'SELECT 1',
    'ALTER TABLE social_accounts ADD COLUMN default_timezone VARCHAR(100) NULL DEFAULT ''America/New_York'' AFTER default_language'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
