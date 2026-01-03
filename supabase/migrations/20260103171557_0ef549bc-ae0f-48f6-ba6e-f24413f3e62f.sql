-- Recreate profiles_display as a simple view with security_invoker
-- The underlying profiles table now only allows users to see their own profile
-- But we need group members to see each other's non-sensitive info

-- First, update the profiles RLS to allow viewing group members but exclude sensitive data
-- We'll use a two-tier approach:
-- 1. profiles table: only owner can see (already set)
-- 2. profiles_display view: calls the secure function

-- Create the view that uses the secure function
CREATE VIEW public.profiles_display 
WITH (security_invoker = false)
AS SELECT * FROM public.get_visible_profiles();

-- Grant select on the view to authenticated users
GRANT SELECT ON public.profiles_display TO authenticated;