#!/bin/bash
# Cron script to process ticket payments every 5 minutes

# Load environment variables from secure file
if [ -f /opt/unjam/.env.cron ]; then
  source /opt/unjam/.env.cron
else
  echo "Error: /opt/unjam/.env.cron not found"
  exit 1
fi

# Call the ticket payment edge function
curl -X POST "${SUPABASE_URL}/functions/v1/ticket-payment" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json"

# Call the retry pending transfers edge function
curl -X POST "${SUPABASE_URL}/functions/v1/retry-pending-transfers" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json"
