-- Drop and recreate the view with SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.profiles_display;

CREATE VIEW public.profiles_display 
WITH (security_invoker = true)
AS
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

COMMENT ON VIEW public.profiles_display IS 'Secure view that masks email addresses for non-owners to prevent email exposure to group members';