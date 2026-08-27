-- Marketing campaigns (list, create modal, detail overview)

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  dealership_id VARCHAR(64) NOT NULL,
  objective VARCHAR(50) NOT NULL DEFAULT 'Lead Generation',
  platforms JSON NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
  target_audience VARCHAR(100) NULL,
  description TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  reach INT NOT NULL DEFAULT 0,
  engagement DECIMAL(5, 2) NOT NULL DEFAULT 0,
  leads_count INT NOT NULL DEFAULT 0,
  appointments_count INT NOT NULL DEFAULT 0,
  sold_deals INT NOT NULL DEFAULT 0,
  revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY marketing_campaigns_status (status),
  KEY marketing_campaigns_dealership (dealership_id),
  CONSTRAINT fk_marketing_campaigns_dealership
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE CASCADE
);
