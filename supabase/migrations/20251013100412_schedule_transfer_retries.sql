-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http;

-- Create a function to retry failed credit transfers
-- This function will be called by the cron job
CREATE OR REPLACE FUNCTION retry_failed_credit_transfers()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  supabase_url text;
  service_role_key text;
  response http_response;
BEGIN
  -- Get Supabase URL and service role key from environment
  -- These should be set via Supabase secrets or vault
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Validate settings are configured
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE EXCEPTION 'Supabase URL and service role key must be configured';
  END IF;

  -- Make HTTP POST request to edge function
  SELECT * INTO response
  FROM http((
    'POST',
    supabase_url || '/functions/v1/billing_credits?action=retry_failed',
    ARRAY[
      http_header('Authorization', 'Bearer ' || service_role_key),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    ''
  )::http_request);

  -- Parse the response
  result := response.content::json;

  -- Log the result
  RAISE NOTICE 'Retry result: %', result;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to retry credit transfers: %', SQLERRM;
    RETURN json_build_object(
      'error', SQLERRM,
      'totalFailed', 0,
      'retrySucceeded', 0,
      'retryFailed', 0
    );
END;
$$;

-- Schedule the cron job to run every hour at minute 0
-- This will automatically retry all failed credit transfers
SELECT cron.schedule(
  'retry-failed-credit-transfers',  -- Job name
  '0 * * * *',                      -- Cron schedule: every hour at minute 0
  $$SELECT retry_failed_credit_transfers();$$
);

-- Add comment to document the job
COMMENT ON FUNCTION retry_failed_credit_transfers() IS
  'Calls the billing_credits edge function to retry all failed credit transfers. '
  'Scheduled to run hourly via pg_cron. '
  'Requires app.settings.supabase_url and app.settings.service_role_key to be configured.';

-- Instructions for setting up secrets (run these manually):
--
-- Option 1: Using Supabase Vault (recommended)
-- INSERT INTO vault.secrets (name, secret) VALUES
--   ('supabase_url', 'https://your-project.supabase.co'),
--   ('service_role_key', 'your-service-role-key');
--
-- Then update the function to use: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url'
--
-- Option 2: Using ALTER DATABASE (simpler, but less secure)
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

-- Query to view the scheduled job
-- SELECT * FROM cron.job WHERE jobname = 'retry-failed-credit-transfers';

-- Query to view job run history
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'retry-failed-credit-transfers')
-- ORDER BY start_time DESC LIMIT 10;

-- To manually trigger the job (for testing):
-- SELECT retry_failed_credit_transfers();

-- To unschedule the job (if needed):
-- SELECT cron.unschedule('retry-failed-credit-transfers');
