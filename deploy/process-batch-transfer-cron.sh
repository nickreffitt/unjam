#!/bin/bash
# Cron script to process weekly batch transfers every Monday at 10am UTC

# Load environment variables from secure file
if [ -f /opt/unjam/.env.cron ]; then
  source /opt/unjam/.env.cron
else
  echo "Error: /opt/unjam/.env.cron not found"
  exit 1
fi

# Call the batch transfer edge function
curl -X POST "${SUPABASE_URL}/functions/v1/ticket-payment?action=batch-transfer" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json"
