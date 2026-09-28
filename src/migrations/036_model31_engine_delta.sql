-- Columns and tables the sealed engine, hygiene worker, routing, and trust portal need.

ALTER TABLE crm_hygiene_stats
  ADD COLUMN last_checked_at DATETIME NULL;

ALTER TABLE stg_sold_units
  ADD COLUMN customer_name VARCHAR(191) NULL,
  ADD COLUMN customer_id VARCHAR(64) NULL,
  ADD COLUMN match_tier TINYINT NULL;

CREATE TABLE IF NOT EXISTS crm_melt_plate_events (
  id VARCHAR(64) NOT NULL,
  trigger_type VARCHAR(64) NOT NULL,
  stats TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS crm_hygiene_leads (
  id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NOT NULL,
  phone_number VARCHAR(50) NULL,
  status VARCHAR(50) NULL,
  hygiene_status VARCHAR(40) NOT NULL,
  payload TEXT NULL,
  internal_lead_id VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY crm_hygiene_leads_lead_id (lead_id)
);

CREATE TABLE IF NOT EXISTS salesperson_metrics (
  salesperson_id VARCHAR(64) NOT NULL,
  band CHAR(1) NOT NULL,
  close_rate DECIMAL(8, 4) NOT NULL DEFAULT 0,
  share_percent_30d DECIMAL(8, 2) NOT NULL DEFAULT 0,
  leads_30d INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (salesperson_id)
);

CREATE TABLE IF NOT EXISTS lead_guard_events (
  id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NOT NULL,
  guard_type VARCHAR(40) NOT NULL,
  salesperson_id VARCHAR(64) NULL,
  detail VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY lead_guard_events_lead (lead_id),
  KEY lead_guard_events_type (guard_type, lead_id)
);

CREATE TABLE IF NOT EXISTS salesperson_penalties (
  id VARCHAR(64) NOT NULL,
  salesperson_id VARCHAR(64) NULL,
  lead_id VARCHAR(64) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY salesperson_penalties_lead (lead_id)
);

CREATE TABLE IF NOT EXISTS influence_results (
  id VARCHAR(64) NOT NULL,
  sale_id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NULL,
  vin VARCHAR(32) NULL,
  stock_number VARCHAR(64) NULL,
  sale_date DATE NOT NULL,
  qualifying_event_count INT NOT NULL DEFAULT 0,
  audit_events TEXT NULL,
  influenced TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY influence_results_sale (sale_id)
);
