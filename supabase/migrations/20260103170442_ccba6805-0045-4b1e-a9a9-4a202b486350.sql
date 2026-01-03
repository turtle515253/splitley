-- Add explicit deny-all policy for rate_limits table
-- This table should only be accessed via service role from edge functions
-- Service role bypasses RLS, so this policy ensures no regular user access

CREATE POLICY "No direct user access to rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Also add policy for anon role
CREATE POLICY "No anonymous access to rate limits"
ON public.rate_limits
FOR ALL
TO anon
USING (false)
WITH CHECK (false);