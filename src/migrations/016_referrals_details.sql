-- Referrals: eligible customers + tracking fields

ALTER TABLE marketing_referrals
  ADD COLUMN message TEXT NULL AFTER reward,
  ADD COLUMN lead_label VARCHAR(64) NULL AFTER message,
  ADD COLUMN appointment_id VARCHAR(64) NULL AFTER lead_label,
  ADD COLUMN sale VARCHAR(20) NULL AFTER appointment_id,
  ADD COLUMN eligible_id VARCHAR(64) NULL AFTER sale,
  ADD COLUMN requested_at DATETIME NULL AFTER eligible_id;

CREATE TABLE IF NOT EXISTS referral_eligible_customers (
  id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(191) NOT NULL,
  dealership_id VARCHAR(64) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Eligible',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY referral_eligible_dealership_id (dealership_id),
  CONSTRAINT referral_eligible_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE SET NULL
);
