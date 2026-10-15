-- Multiple photos per inventory vehicle. Images are optional.

CREATE TABLE IF NOT EXISTS merchandising_vehicle_images (
  id VARCHAR(64) NOT NULL,
  vehicle_id VARCHAR(64) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY merchandising_vehicle_images_vehicle (vehicle_id),
  CONSTRAINT merchandising_vehicle_images_vehicle_fk
    FOREIGN KEY (vehicle_id) REFERENCES merchandising_vehicles(id)
    ON DELETE CASCADE
);
