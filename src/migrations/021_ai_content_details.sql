-- AI content detail extras: scenes (video) + activity history

ALTER TABLE ai_content
  ADD COLUMN scenes JSON NULL AFTER brief;

CREATE TABLE IF NOT EXISTS ai_content_activities (
  id VARCHAR(64) NOT NULL,
  content_id VARCHAR(64) NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  actor VARCHAR(191) NULL,
  detail TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ai_content_activities_content (content_id),
  CONSTRAINT fk_ai_content_activities_content
    FOREIGN KEY (content_id) REFERENCES ai_content(id)
    ON DELETE CASCADE
);
