-- $31 charges from sold-file phone matches (Way A).

CREATE TABLE IF NOT EXISTS model31_charges (
  id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NULL,
  buyer_name VARCHAR(191) NOT NULL,
  buyer_phone VARCHAR(30) NOT NULL,
  vin VARCHAR(32) NOT NULL DEFAULT '',
  sold_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 31.00,
  source VARCHAR(30) NOT NULL DEFAULT 'SOLD_FILE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY model31_charges_unique (dealership_id, lead_id, vin),
  KEY model31_charges_dealer (dealership_id),
  KEY model31_charges_lead (lead_id),
  CONSTRAINT model31_charges_dealer_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE CASCADE,
  CONSTRAINT model31_charges_lead_fk
    FOREIGN KEY (lead_id) REFERENCES leads(id)
    ON DELETE SET NULL
);
