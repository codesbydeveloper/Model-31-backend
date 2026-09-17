-- Allow sending a sales script to a salesperson without a lead id

ALTER TABLE salesperson_scripts
  MODIFY COLUMN lead_id VARCHAR(64) NULL;
