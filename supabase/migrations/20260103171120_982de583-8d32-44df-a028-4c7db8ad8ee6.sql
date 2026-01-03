-- Drop the existing SELECT policy that exposes email to group members
DROP POLICY IF EXISTS "Users can view own profile or shared group members" ON public.profiles;

-- Create new policy: users can ONLY see their own profile directly
-- For viewing other users, use profiles_display view
CREATE POLICY "Users can view only their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Update profiles_display view to be SECURITY DEFINER style
-- This allows group members to see non-sensitive profile data
DROP VIEW IF EXISTS public.profiles_display;

-- Create a function that returns profile display info for group members
CREATE OR REPLACE FUNCTION public.get_visible_profiles()
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = auth.uid()  -- Own profile
     OR users_share_group(auth.uid(), p.id)  -- Shared group members
$$;

-- Create a view that wraps the function for easier querying
CREATE VIEW public.profiles_display AS
SELECT * FROM public.get_visible_profiles();