-- Dealership SMS accounts, inbound queue, and STOP list

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dealerships' AND COLUMN_NAME = 'sms_provider'
    ),
    'SELECT 1',
    'ALTER TABLE dealerships ADD COLUMN sms_provider VARCHAR(50) NULL AFTER timezone'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dealerships' AND COLUMN_NAME = 'sms_account_sid'
    ),
    'SELECT 1',
    'ALTER TABLE dealerships ADD COLUMN sms_account_sid VARCHAR(255) NULL AFTER sms_provider'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dealerships' AND COLUMN_NAME = 'sms_auth_token'
    ),
    'SELECT 1',
    'ALTER TABLE dealerships ADD COLUMN sms_auth_token TEXT NULL AFTER sms_account_sid'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dealerships' AND COLUMN_NAME = 'sms_phone_number'
    ),
    'SELECT 1',
    'ALTER TABLE dealerships ADD COLUMN sms_phone_number VARCHAR(30) NULL AFTER sms_auth_token'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dealerships' AND COLUMN_NAME = 'sms_profile_id'
    ),
    'SELECT 1',
    'ALTER TABLE dealerships ADD COLUMN sms_profile_id VARCHAR(255) NULL AFTER sms_phone_number'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dealerships' AND INDEX_NAME = 'dealerships_sms_phone'
    ),
    'SELECT 1',
    'CREATE UNIQUE INDEX dealerships_sms_phone ON dealerships (sms_phone_number)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS sms_messages (
  id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NULL,
  provider_message_id VARCHAR(191) NULL,
  from_number VARCHAR(30) NOT NULL,
  to_number VARCHAR(30) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  send_after DATETIME NULL,
  last_error VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY sms_messages_provider_message (provider_message_id),
  KEY sms_messages_status (status, send_after),
  KEY sms_messages_dealership (dealership_id),
  KEY sms_messages_lead (lead_id)
);

CREATE TABLE IF NOT EXISTS sms_opt_outs (
  dealership_id VARCHAR(64) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (dealership_id, phone_number)
);
