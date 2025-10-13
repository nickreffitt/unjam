# Cron Job Setup for Failed Transfer Retry

This document describes how to set up an hourly cron job to automatically retry failed credit transfers.

## Overview

The `billing_credits` edge function includes an endpoint that retries all failed credit transfers. This is useful for recovering from transient failures like:
- Stripe API timeouts
- Network connectivity issues
- Temporary service outages

## Endpoint

```
POST /billing_credits?action=retry_failed
Authorization: Bearer <service_role_key>
```

## Response Format

```json
{
  "totalFailed": 5,
  "retrySucceeded": 3,
  "retryFailed": 2,
  "results": [
    { "ticketId": "ticket-123", "success": true },
    { "ticketId": "ticket-456", "success": false, "error": "Engineer account not enabled" }
  ]
}
```

## Setup Options

### Option 1: Supabase Cron (Recommended)

Use Supabase's built-in pg_cron extension:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly retry job
SELECT cron.schedule(
  'retry-failed-credit-transfers',
  '0 * * * *',  -- Every hour at minute 0
  $$
    SELECT
      net.http_post(
        url := 'https://your-project.supabase.co/functions/v1/billing_credits?action=retry_failed',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        )
      );
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Unschedule job (if needed)
SELECT cron.unschedule('retry-failed-credit-transfers');
```

**Note**: You'll need to configure the service role key as a Supabase secret:
```bash
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key
```

### Option 2: External Cron Service

Use an external service like:
- **GitHub Actions** (with scheduled workflows)
- **Vercel Cron** (if using Vercel)
- **AWS EventBridge**
- **Google Cloud Scheduler**

Example GitHub Actions workflow (`.github/workflows/retry-failed-transfers.yml`):

```yaml
name: Retry Failed Credit Transfers

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  retry-failed-transfers:
    runs-on: ubuntu-latest
    steps:
      - name: Call retry endpoint
        run: |
          curl -X POST \
            'https://your-project.supabase.co/functions/v1/billing_credits?action=retry_failed' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}' \
            -H 'Content-Type: application/json'
```

### Option 3: Manual Retry

For one-off retries or testing:

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/billing_credits?action=retry_failed' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Monitoring

### Check Failed Transfers

Query the database to see current failed transfers:

```sql
SELECT
  id,
  ticket_id,
  engineer_id,
  amount,
  credit_value,
  error_message,
  created_at
FROM engineer_transfers
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### View Retry Success Rate

```sql
SELECT
  DATE_TRUNC('day', created_at) as date,
  status,
  COUNT(*) as count
FROM engineer_transfers
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', created_at), status
ORDER BY date DESC;
```

## Alerts

Consider setting up alerts for:
- High number of failed transfers (> 10)
- Failed transfers older than 24 hours
- Retry jobs that consistently fail

## Testing

Test the cron endpoint manually:

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SERVICE_ROLE_KEY="your_service_role_key"

# Run retry
curl -X POST \
  "$SUPABASE_URL/functions/v1/billing_credits?action=retry_failed" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Job Not Running

1. **Check cron schedule is active**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'retry-failed-credit-transfers';
   ```

2. **Check job run history**:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'retry-failed-credit-transfers')
   ORDER BY start_time DESC;
   ```

3. **Verify service role key**: Ensure the key has proper permissions

### High Failure Rate

If retries consistently fail:
1. Check engineer Connect accounts are properly configured
2. Verify Stripe API keys are valid
3. Review error messages in `engineer_transfers` table
4. Check Supabase function logs

## Best Practices

- ✅ Monitor retry success rates
- ✅ Set up alerts for persistent failures
- ✅ Review error messages to identify systemic issues
- ✅ Keep retry interval reasonable (hourly is good balance)
- ✅ Log all retry attempts for audit trail
- ❌ Don't retry too frequently (avoid rate limits)
- ❌ Don't ignore persistent failures (investigate root cause)
