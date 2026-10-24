-- Remember X mentions and DMs the AI already handled, so each one is answered once.

CREATE TABLE IF NOT EXISTS x_processed_items (
  item_id VARCHAR(100) NOT NULL,
  item_type VARCHAR(10) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id)
);
