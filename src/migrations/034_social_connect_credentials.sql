-- Store social connect keys from the Connect modal (no FK for shared hosting)

CREATE TABLE IF NOT EXISTS social_account_credentials (
  account_id VARCHAR(64) NOT NULL,
  credentials_json TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
