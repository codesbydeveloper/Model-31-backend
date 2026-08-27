-- Leads table (references dealerships + users)

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(191) NOT NULL,
  customer_phone VARCHAR(50) NULL,
  customer_email VARCHAR(191) NULL,
  vehicle VARCHAR(255) NULL,
  budget VARCHAR(100) NULL,
  timeline VARCHAR(100) NULL,
  location VARCHAR(191) NULL,
  financing VARCHAR(50) NULL,
  score INT NOT NULL DEFAULT 0,
  tier VARCHAR(20) NOT NULL DEFAULT 'Tier D',
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  dealership_id VARCHAR(64) NULL,
  salesperson_id VARCHAR(64) NULL,
  source VARCHAR(100) NULL,
  pipeline VARCHAR(50) NOT NULL DEFAULT 'MODEL 31',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY leads_status (status),
  KEY leads_dealership_id (dealership_id),
  KEY leads_salesperson_id (salesperson_id),
  CONSTRAINT leads_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE SET NULL,
  CONSTRAINT leads_salesperson_fk
    FOREIGN KEY (salesperson_id) REFERENCES users(id)
    ON DELETE SET NULL
);
