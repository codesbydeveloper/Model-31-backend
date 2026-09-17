-- Salesperson sales scripts + marketing draft fields (idempotent)

CREATE TABLE IF NOT EXISTS salesperson_scripts (
  id VARCHAR(64) NOT NULL,
  token VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NOT NULL,
  salesperson_id VARCHAR(64) NULL,
  marketing_content_id VARCHAR(64) NULL,
  customer_name VARCHAR(191) NOT NULL,
  vehicle VARCHAR(255) NOT NULL,
  dealership VARCHAR(191) NULL,
  platform VARCHAR(50) NOT NULL,
  script TEXT NOT NULL,
  caption TEXT NOT NULL,
  cta TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY salesperson_scripts_token (token),
  KEY salesperson_scripts_salesperson_id (salesperson_id),
  KEY salesperson_scripts_lead_id (lead_id),
  KEY salesperson_scripts_status (status),
  CONSTRAINT salesperson_scripts_lead_fk
    FOREIGN KEY (lead_id) REFERENCES leads(id)
    ON DELETE CASCADE,
  CONSTRAINT salesperson_scripts_salesperson_fk
    FOREIGN KEY (salesperson_id) REFERENCES users(id)
    ON DELETE SET NULL
);

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ai_content' AND COLUMN_NAME = 'lead_id'
    ),
    'SELECT 1',
    'ALTER TABLE ai_content ADD COLUMN lead_id VARCHAR(64) NULL AFTER dealership_id'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ai_content' AND COLUMN_NAME = 'caption'
    ),
    'SELECT 1',
    'ALTER TABLE ai_content ADD COLUMN caption TEXT NULL AFTER title'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ai_content' AND COLUMN_NAME = 'cta'
    ),
    'SELECT 1',
    'ALTER TABLE ai_content ADD COLUMN cta TEXT NULL AFTER caption'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ai_content' AND COLUMN_NAME = 'salesperson_script_id'
    ),
    'SELECT 1',
    'ALTER TABLE ai_content ADD COLUMN salesperson_script_id VARCHAR(64) NULL AFTER cta'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
