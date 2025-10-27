CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable vault extension for secrets management
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

SELECT
  cron.schedule(
    'invoke-ticket-payments-every-5-minutes',
    '*/5 * * * *',
    $$
    SELECT
      net.http_get(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/ticket-payment',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
        )
        timeout_milliseconds:=5000
      ) as request_id;
    $$
  );