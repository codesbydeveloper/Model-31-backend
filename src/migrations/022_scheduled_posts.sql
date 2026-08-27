-- Scheduled marketing posts (list + calendar views, reschedule, cancel)

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  dealership_id VARCHAR(64) NOT NULL,
  content_id VARCHAR(64) NULL,
  scheduled_at DATETIME NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'America/New_York',
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY scheduled_posts_status (status),
  KEY scheduled_posts_platform (platform),
  KEY scheduled_posts_dealership (dealership_id),
  KEY scheduled_posts_scheduled_at (scheduled_at),
  CONSTRAINT fk_scheduled_posts_dealership
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE CASCADE
);
