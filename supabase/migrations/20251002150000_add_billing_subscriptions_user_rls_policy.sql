-- Add RLS policy for users to read their own billing subscriptions
-- This allows users to view subscriptions that belong to their billing customer record

CREATE POLICY "Users can view their own billing subscriptions" ON billing_subscriptions
  FOR SELECT USING (
    stripe_customer_id IN (
      SELECT stripe_customer_id
      FROM billing_customers
      WHERE profile_id IN (
        SELECT id FROM profiles WHERE auth_id = auth.uid()
      )
    )
  );
