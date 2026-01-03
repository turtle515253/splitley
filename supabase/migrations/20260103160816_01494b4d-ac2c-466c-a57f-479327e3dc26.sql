-- Create a secure view that masks email for non-owners
-- This allows users to see their own email but hides others' emails
CREATE OR REPLACE VIEW public.profiles_display AS
SELECT 
  id,
  display_name,
  avatar_url,
  CASE WHEN id = auth.uid() THEN email ELSE NULL END as email,
  created_at,
  updated_at
FROM public.profiles;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.profiles_display TO authenticated;

-- Add a comment explaining the view's purpose
COMMENT ON VIEW public.profiles_display IS 'Secure view that masks email addresses for non-owners to prevent email exposure to group members';