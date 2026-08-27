-- Salesperson portal: appointments + sold deals / commission

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NULL,
  salesperson_id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NULL,
  customer_name VARCHAR(191) NOT NULL,
  vehicle VARCHAR(255) NULL,
  appointment_type VARCHAR(50) NOT NULL DEFAULT 'Test Drive',
  appointment_date DATE NOT NULL,
  appointment_time VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY appointments_salesperson_id (salesperson_id),
  KEY appointments_lead_id (lead_id),
  CONSTRAINT appointments_salesperson_fk
    FOREIGN KEY (salesperson_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT appointments_lead_fk
    FOREIGN KEY (lead_id) REFERENCES leads(id)
    ON DELETE SET NULL,
  CONSTRAINT appointments_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sold_deals (
  id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NULL,
  salesperson_id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NULL,
  customer_name VARCHAR(191) NOT NULL,
  vehicle VARCHAR(255) NULL,
  deal_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sale_date DATE NOT NULL,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 2.50,
  base_commission DECIMAL(12, 2) NOT NULL DEFAULT 0,
  bonus DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(12, 2) NOT NULL DEFAULT 0,
  commission_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY sold_deals_salesperson_id (salesperson_id),
  CONSTRAINT sold_deals_salesperson_fk
    FOREIGN KEY (salesperson_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT sold_deals_lead_fk
    FOREIGN KEY (lead_id) REFERENCES leads(id)
    ON DELETE SET NULL,
  CONSTRAINT sold_deals_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY lead_notes_lead_id (lead_id),
  CONSTRAINT lead_notes_lead_fk
    FOREIGN KEY (lead_id) REFERENCES leads(id)
    ON DELETE CASCADE,
  CONSTRAINT lead_notes_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
