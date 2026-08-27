-- Dealerships table (must run before users — users references dealerships)

CREATE TABLE IF NOT EXISTS dealerships (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(50) NULL,
  zip_code VARCHAR(20) NULL,
  phone VARCHAR(50) NULL,
  website VARCHAR(255) NULL,
  brands VARCHAR(255) NULL,
  timezone VARCHAR(64) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  crm_status VARCHAR(20) NOT NULL DEFAULT 'Disconnected',
  social_status VARCHAR(20) NOT NULL DEFAULT 'Disconnected',
  active_leads INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY dealerships_name_unique (name)
);
