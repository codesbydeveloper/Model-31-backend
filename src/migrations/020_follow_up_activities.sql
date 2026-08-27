-- Activity log for follow-up sequence detail page

CREATE TABLE IF NOT EXISTS follow_up_sequence_activities (
  id VARCHAR(64) NOT NULL,
  sequence_id VARCHAR(64) NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  detail TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY follow_up_activities_sequence (sequence_id),
  CONSTRAINT fk_follow_up_activities_sequence
    FOREIGN KEY (sequence_id) REFERENCES follow_up_sequences(id)
    ON DELETE CASCADE
);
