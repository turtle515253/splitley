-- Drop the SECURITY DEFINER view that's causing the error
DROP VIEW IF EXISTS public.profiles_display;

-- Drop the function that was used by the view
DROP FUNCTION IF EXISTS public.get_visible_profiles();

-- Update the profiles RLS policy to allow group members to see each other
-- (The view will control which columns are visible)
DROP POLICY IF EXISTS "Users can view only their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile or shared group members"
ON public.profiles
FOR SELECT
USING (auth.uid() = id OR users_share_group(auth.uid(), id));

-- Create a simple view with security_invoker = true
-- This view only exposes non-sensitive columns
-- It inherits RLS from the profiles table
CREATE VIEW public.profiles_display
WITH (security_invoker = true)
AS SELECT 
  id,
  display_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_display TO authenticated;