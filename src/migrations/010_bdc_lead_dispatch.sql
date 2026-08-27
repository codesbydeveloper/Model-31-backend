-- BDC Manager dispatch / SLA / escalation fields on leads

ALTER TABLE leads
  ADD COLUMN priority VARCHAR(20) NULL AFTER pipeline,
  ADD COLUMN dispatch_status VARCHAR(20) NULL AFTER priority,
  ADD COLUMN assigned_at DATETIME NULL AFTER dispatch_status,
  ADD COLUMN accepted_at DATETIME NULL AFTER assigned_at,
  ADD COLUMN escalation_reason VARCHAR(255) NULL AFTER accepted_at,
  ADD COLUMN escalation_priority VARCHAR(20) NULL AFTER escalation_reason,
  ADD COLUMN escalation_status VARCHAR(20) NULL AFTER escalation_priority,
  ADD COLUMN escalated_at DATETIME NULL AFTER escalation_status;
