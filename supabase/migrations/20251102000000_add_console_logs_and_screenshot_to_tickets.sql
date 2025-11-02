-- Add console_logs and screenshot fields to tickets table
ALTER TABLE tickets ADD COLUMN console_logs JSONB;
ALTER TABLE tickets ADD COLUMN screenshot TEXT;

-- Add comment explaining the fields
COMMENT ON COLUMN tickets.console_logs IS 'JSON array of console log entries captured when ticket was created';
COMMENT ON COLUMN tickets.screenshot IS 'Base64 encoded screenshot of the page when ticket was created';
