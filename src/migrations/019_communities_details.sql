-- Extend marketing communities for acquisition table + detail page

ALTER TABLE marketing_communities
  ADD COLUMN location VARCHAR(191) NULL AFTER platform,
  ADD COLUMN audience INT NOT NULL DEFAULT 0 AFTER location,
  ADD COLUMN leads_count INT NOT NULL DEFAULT 0 AFTER engagement,
  ADD COLUMN qualified_count INT NOT NULL DEFAULT 0 AFTER leads_count,
  ADD COLUMN appointments INT NOT NULL DEFAULT 0 AFTER qualified_count,
  ADD COLUMN last_activity DATETIME NULL AFTER status;

UPDATE marketing_communities
SET audience = COALESCE(members, 0)
WHERE audience = 0 AND members IS NOT NULL;

CREATE TABLE IF NOT EXISTS marketing_community_activities (
  id VARCHAR(64) NOT NULL,
  community_id VARCHAR(64) NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  detail TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY community_activities_community (community_id),
  CONSTRAINT fk_community_activities_community
    FOREIGN KEY (community_id) REFERENCES marketing_communities(id)
    ON DELETE CASCADE
);
