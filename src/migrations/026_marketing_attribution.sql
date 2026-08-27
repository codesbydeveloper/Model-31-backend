-- Marketing attribution breakdown rows

CREATE TABLE IF NOT EXISTS marketing_attribution (
  id VARCHAR(64) NOT NULL,
  source VARCHAR(100) NOT NULL,
  pipeline VARCHAR(50) NOT NULL,
  campaign_name VARCHAR(191) NULL,
  platform VARCHAR(50) NOT NULL,
  content_label VARCHAR(191) NULL,
  leads INT NOT NULL DEFAULT 0,
  qualified INT NOT NULL DEFAULT 0,
  appointments INT NOT NULL DEFAULT 0,
  sold INT NOT NULL DEFAULT 0,
  revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY marketing_attribution_pipeline (pipeline),
  KEY marketing_attribution_platform (platform)
);
