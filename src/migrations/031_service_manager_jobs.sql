-- Service Manager jobs (idempotent)

CREATE TABLE IF NOT EXISTS service_jobs (
  id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NOT NULL,
  advisor_id VARCHAR(64) NULL,
  customer_name VARCHAR(191) NOT NULL,
  vehicle VARCHAR(255) NULL,
  note VARCHAR(500) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  hours_billed DECIMAL(8, 1) NOT NULL DEFAULT 0.0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY service_jobs_dealership_id (dealership_id),
  KEY service_jobs_advisor_id (advisor_id),
  KEY service_jobs_status (status),
  CONSTRAINT service_jobs_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE CASCADE,
  CONSTRAINT service_jobs_advisor_fk
    FOREIGN KEY (advisor_id) REFERENCES users(id)
    ON DELETE SET NULL
);
