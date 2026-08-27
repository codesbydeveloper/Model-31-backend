-- Life Events: details, dismiss, mock lead

ALTER TABLE marketing_life_events
  ADD COLUMN detected_from VARCHAR(100) NULL AFTER event_type,
  ADD COLUMN vehicle_need VARCHAR(255) NULL AFTER event_date,
  ADD COLUMN intent VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' AFTER vehicle_need,
  ADD COLUMN customer_signal TEXT NULL AFTER notes,
  ADD COLUMN lead_label VARCHAR(64) NULL AFTER customer_signal,
  ADD COLUMN lead_id VARCHAR(64) NULL AFTER lead_label;
