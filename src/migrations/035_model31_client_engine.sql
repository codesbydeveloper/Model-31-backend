-- Base tables already applied on existing databases.
-- Kept so a fresh database gets the same starting schema before 036.

CREATE TABLE IF NOT EXISTS crm_hygiene_stats (
  id INT NOT NULL,
  auto_patch_count INT NOT NULL DEFAULT 0,
  schema_drift_count INT NOT NULL DEFAULT 0,
  quarantine_count INT NOT NULL DEFAULT 0,
  total_leads INT NOT NULL DEFAULT 0,
  melt_active TINYINT NOT NULL DEFAULT 0,
  melt_reason VARCHAR(64) NULL,
  last_melt_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

INSERT IGNORE INTO crm_hygiene_stats (id, auto_patch_count, schema_drift_count, quarantine_count, total_leads, melt_active)
VALUES (1, 0, 0, 0, 0, 0);

CREATE TABLE IF NOT EXISTS crm_quarantine (
  id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NULL,
  missing_fields TEXT NULL,
  raw_json TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY crm_quarantine_created (created_at)
);

CREATE TABLE IF NOT EXISTS routing_logs (
  id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NULL,
  salesperson_id VARCHAR(64) NULL,
  band VARCHAR(8) NULL,
  reason_json TEXT NULL,
  fallback TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY routing_logs_lead (lead_id)
);

CREATE TABLE IF NOT EXISTS stg_sold_units (
  id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NULL,
  sale_id VARCHAR(64) NULL,
  vin VARCHAR(64) NULL,
  stock_number VARCHAR(64) NULL,
  sale_date DATE NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(191) NULL,
  last_name VARCHAR(191) NULL,
  customer_key VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY stg_sold_dealership (dealership_id)
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NULL,
  customer_key VARCHAR(191) NULL,
  event_type VARCHAR(64) NOT NULL,
  detail TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY timeline_customer_key (customer_key),
  KEY timeline_created (created_at)
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NULL,
  period VARCHAR(20) NULL,
  influenced_sales INT NOT NULL DEFAULT 0,
  amount_due DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS billing_line_items (
  id VARCHAR(64) NOT NULL,
  invoice_id VARCHAR(64) NOT NULL,
  sale_id VARCHAR(64) NULL,
  vin VARCHAR(64) NULL,
  stock_number VARCHAR(64) NULL,
  sale_date DATE NULL,
  influenced TINYINT NOT NULL DEFAULT 0,
  qualifying_event_count INT NOT NULL DEFAULT 0,
  event_types TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY billing_line_invoice (invoice_id)
);
