-- Change external_recipient_id from INTEGER to TEXT to support both Wise (numeric) and Airwallex (string) IDs
ALTER TABLE billing_engineer_bank_transfer_accounts
  ALTER COLUMN external_recipient_id TYPE TEXT USING external_recipient_id::TEXT;
