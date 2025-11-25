-- Add new status values to billing_batch_group_items to track Airwallex transfer lifecycle
-- Status flow: pending -> processing -> sent -> paid (success) or failed/cancelled (failure)
-- Note: Webhooks can arrive out of order, so we need to handle that in application logic

-- Update the status comment to reflect new values
COMMENT ON COLUMN billing_batch_group_items.status IS 'Status of the batch item: pending (initial), processing (being processed by Airwallex), sent (sent to bank), paid (completed successfully), failed (transfer failed), cancelled (transfer cancelled)';
