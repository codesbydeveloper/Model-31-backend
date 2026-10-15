-- One row per Facebook comment or Messenger thread so a reply is sent once.

CREATE TABLE IF NOT EXISTS social_reply_threads (
  id VARCHAR(64) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  external_key VARCHAR(191) NOT NULL,
  page_id VARCHAR(64) NOT NULL,
  sender_id VARCHAR(64) NULL,
  sender_name VARCHAR(191) NULL,
  last_message TEXT NULL,
  phone VARCHAR(50) NULL,
  vehicle VARCHAR(255) NULL,
  lead_id VARCHAR(64) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY social_reply_external_key (external_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
