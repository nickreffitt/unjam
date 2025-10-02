-- Add columns to track subscription changes (upgrades, downgrades, cancellations)
ALTER TABLE billing_subscriptions
ADD COLUMN cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE;

-- Create index on current_period_end for querying expiring subscriptions
CREATE INDEX billing_subscriptions_current_period_end_idx ON billing_subscriptions (current_period_end);
