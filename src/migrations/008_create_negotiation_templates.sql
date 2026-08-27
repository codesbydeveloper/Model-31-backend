-- Negotiation templates (price, payment, trade rules)

CREATE TABLE IF NOT EXISTS negotiation_templates (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  vehicle_type VARCHAR(50) NOT NULL DEFAULT 'New',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  min_price_rule VARCHAR(255) NULL,
  max_discount_rule VARCHAR(255) NULL,
  payment_range VARCHAR(100) NULL,
  trade_range VARCHAR(100) NULL,
  allowed_incentives TEXT NULL,
  allowed_fees TEXT NULL,
  vehicle_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY negotiation_templates_name_unique (name),
  KEY negotiation_templates_status (status)
);
