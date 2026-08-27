-- Dealership portal tables

CREATE TABLE IF NOT EXISTS conversation_messages (
  id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY conversation_messages_lead_id (lead_id),
  CONSTRAINT conversation_messages_lead_fk
    FOREIGN KEY (lead_id) REFERENCES leads(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_accounts (
  id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  account_name VARCHAR(191) NOT NULL,
  owner_name VARCHAR(191) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'CONNECTED',
  model31_source VARCHAR(10) NOT NULL DEFAULT 'OFF',
  posts INT NOT NULL DEFAULT 0,
  followers INT NOT NULL DEFAULT 0,
  reach INT NOT NULL DEFAULT 0,
  leads_count INT NOT NULL DEFAULT 0,
  engagement DECIMAL(5, 2) NOT NULL DEFAULT 0,
  last_sync DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY social_accounts_dealership_id (dealership_id),
  CONSTRAINT social_accounts_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dealership_crm (
  dealership_id VARCHAR(64) NOT NULL,
  provider VARCHAR(100) NOT NULL DEFAULT 'VinSolutions',
  status VARCHAR(20) NOT NULL DEFAULT 'CONNECTED',
  crm_mode VARCHAR(20) NOT NULL DEFAULT 'READ ONLY',
  pipeline VARCHAR(50) NOT NULL DEFAULT 'DEALERSHIP',
  source_label VARCHAR(100) NOT NULL DEFAULT 'CRM - Model 31',
  leads_synced INT NOT NULL DEFAULT 0,
  customers_synced INT NOT NULL DEFAULT 0,
  appointments_synced INT NOT NULL DEFAULT 0,
  sold_deals_synced INT NOT NULL DEFAULT 0,
  sync_errors INT NOT NULL DEFAULT 0,
  last_sync DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (dealership_id),
  CONSTRAINT dealership_crm_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_content (
  id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ai_content_dealership_id (dealership_id),
  CONSTRAINT ai_content_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dealership_settings (
  dealership_id VARCHAR(64) NOT NULL,
  lead_alerts TINYINT(1) NOT NULL DEFAULT 1,
  crm_auto_sync TINYINT(1) NOT NULL DEFAULT 1,
  appointment_reminders TINYINT(1) NOT NULL DEFAULT 1,
  after_hours_routing TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (dealership_id),
  CONSTRAINT dealership_settings_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE CASCADE
);

ALTER TABLE users
  ADD COLUMN presence VARCHAR(20) NOT NULL DEFAULT 'OFFLINE' AFTER status;
