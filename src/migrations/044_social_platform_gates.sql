-- Super Admin must connect a platform before any dealership can connect it.

CREATE TABLE IF NOT EXISTS social_platform_gates (
  platform VARCHAR(30) NOT NULL,
  connected TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (platform)
);

INSERT IGNORE INTO social_platform_gates (platform, connected) VALUES
  ('Facebook', 0),
  ('Instagram', 0),
  ('WhatsApp', 0),
  ('TikTok', 0),
  ('YouTube', 0),
  ('X', 0);
