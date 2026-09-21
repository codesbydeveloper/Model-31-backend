-- Inventory Manager merchandising vehicles

CREATE TABLE IF NOT EXISTS merchandising_vehicles (
  id VARCHAR(64) NOT NULL,
  dealership_id VARCHAR(64) NOT NULL,
  stock_number VARCHAR(50) NOT NULL,
  vin VARCHAR(64) NULL,
  year INT NULL,
  make VARCHAR(100) NULL,
  model VARCHAR(100) NULL,
  vehicle VARCHAR(191) NOT NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  photos_count INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'NEEDS_PHOTOS',
  arrived_at DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY merchandising_stock_dealership (dealership_id, stock_number),
  KEY merchandising_dealership_id (dealership_id),
  KEY merchandising_status (status),
  CONSTRAINT merchandising_vehicles_dealership_fk
    FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    ON DELETE CASCADE
);
