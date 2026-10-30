-- Role-based alerts. Each login only sees their own role (and store / own user when set).

CREATE TABLE IF NOT EXISTS role_notifications (
  id VARCHAR(64) NOT NULL,
  role VARCHAR(50) NOT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(191) NOT NULL,
  message TEXT NOT NULL,
  user_id VARCHAR(64) NULL,
  dealership_id VARCHAR(64) NULL,
  entity_type VARCHAR(50) NULL,
  entity_id VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY role_notifications_role (role),
  KEY role_notifications_user (user_id),
  KEY role_notifications_dealership (dealership_id),
  KEY role_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_notification_reads (
  notification_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  KEY role_notification_reads_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
