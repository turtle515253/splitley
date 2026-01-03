-- Drop the existing view and recreate with security_invoker and no email
DROP VIEW IF EXISTS public.profiles_display;

CREATE OR REPLACE VIEW public.profiles_display
WITH (security_invoker = true) AS
SELECT
  id,
  display_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_display TO authenticated;