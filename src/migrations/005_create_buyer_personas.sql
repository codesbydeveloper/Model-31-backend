-- Buyer personas (used by AI qualification)

CREATE TABLE IF NOT EXISTS buyer_personas (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  min_budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
  max_budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vehicle_preference VARCHAR(255) NULL,
  buying_timeline VARCHAR(100) NULL,
  financing_preference VARCHAR(100) NULL,
  language VARCHAR(50) NOT NULL DEFAULT 'English',
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY buyer_personas_name_unique (name),
  KEY buyer_personas_status (status)
);
