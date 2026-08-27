-- Scoring rules (single config row for weights + tiers)

CREATE TABLE IF NOT EXISTS scoring_rules (
  id VARCHAR(64) NOT NULL,
  budget_weight INT NOT NULL DEFAULT 20,
  desired_vehicle_weight INT NOT NULL DEFAULT 20,
  buying_timeline_weight INT NOT NULL DEFAULT 20,
  location_weight INT NOT NULL DEFAULT 20,
  financing_preference_weight INT NOT NULL DEFAULT 20,
  tier_a_min INT NOT NULL DEFAULT 80,
  tier_a_max INT NOT NULL DEFAULT 100,
  tier_b_min INT NOT NULL DEFAULT 40,
  tier_b_max INT NOT NULL DEFAULT 79,
  tier_c_min INT NOT NULL DEFAULT 0,
  tier_c_max INT NOT NULL DEFAULT 39,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
