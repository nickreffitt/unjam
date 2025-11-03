-- Add console_logs column to tickets table to store captured console logs
ALTER TABLE tickets
ADD COLUMN console_logs JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN tickets.console_logs IS 'Array of console log objects captured from the customer preview page. Each object contains: type (log/warn/error/info/debug), message (string), timestamp (ISO string), and optional args (array).';
