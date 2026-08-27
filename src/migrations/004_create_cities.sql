-- Cities table (regional market settings)

CREATE TABLE IF NOT EXISTS cities (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  state VARCHAR(50) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'USA',
  primary_language VARCHAR(50) NOT NULL DEFAULT 'English',
  secondary_language VARCHAR(50) NULL,
  regional_tone VARCHAR(100) NOT NULL DEFAULT 'Professional',
  inventory_focus VARCHAR(191) NULL,
  financing_focus VARCHAR(50) NOT NULL DEFAULT 'Financing',
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY cities_name_state_unique (name, state),
  KEY cities_status (status)
);
