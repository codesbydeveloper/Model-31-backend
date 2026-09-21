-- Repair order fields for Service Manager All Jobs + detail

ALTER TABLE service_jobs
  ADD COLUMN phone VARCHAR(50) NULL,
  ADD COLUMN email VARCHAR(191) NULL,
  ADD COLUMN appointment_date DATE NULL,
  ADD COLUMN appointment_time VARCHAR(20) NULL,
  ADD COLUMN vin VARCHAR(64) NULL,
  ADD COLUMN mileage INT NULL,
  ADD COLUMN concern VARCHAR(500) NULL,
  ADD COLUMN technician_name VARCHAR(191) NULL,
  ADD COLUMN amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN delay_reason VARCHAR(255) NULL,
  ADD COLUMN csi_score DECIMAL(5, 1) NULL;
