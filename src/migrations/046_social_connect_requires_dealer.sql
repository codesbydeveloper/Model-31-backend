-- A social row is disconnected until that dealership connects it.

ALTER TABLE social_accounts
  MODIFY status VARCHAR(20) NOT NULL DEFAULT 'DISCONNECTED';

UPDATE social_accounts sa
LEFT JOIN social_account_credentials c ON c.account_id = sa.id
SET sa.status = 'DISCONNECTED'
WHERE sa.status = 'CONNECTED'
  AND c.account_id IS NULL;
