-- Marketing acquisition personas (list cards, create modal, detail page)

CREATE TABLE IF NOT EXISTS marketing_personas (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  target_audience VARCHAR(255) NULL,
  tone VARCHAR(50) NOT NULL DEFAULT 'Friendly',
  language VARCHAR(50) NOT NULL DEFAULT 'English',
  primary_platform VARCHAR(50) NOT NULL DEFAULT 'Instagram',
  platforms JSON NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  followers INT NOT NULL DEFAULT 0,
  engagement INT NOT NULL DEFAULT 0,
  leads_count INT NOT NULL DEFAULT 0,
  appointments INT NOT NULL DEFAULT 0,
  sold INT NOT NULL DEFAULT 0,
  dm_interactions INT NOT NULL DEFAULT 0,
  story_interactions INT NOT NULL DEFAULT 0,
  returning_visitors INT NOT NULL DEFAULT 0,
  intent_signals INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY marketing_personas_name_unique (name),
  KEY marketing_personas_status (status)
);
