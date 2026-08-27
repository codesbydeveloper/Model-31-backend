-- Performance metrics extras on AI content

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ai_content' AND COLUMN_NAME = 'impressions'
    ),
    'SELECT 1',
    'ALTER TABLE ai_content ADD COLUMN impressions INT NOT NULL DEFAULT 0 AFTER reach'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ai_content' AND COLUMN_NAME = 'engagement'
    ),
    'SELECT 1',
    'ALTER TABLE ai_content ADD COLUMN engagement DECIMAL(5, 2) NOT NULL DEFAULT 0 AFTER impressions'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
