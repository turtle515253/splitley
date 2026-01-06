-- Create a security definer function for searching profiles
-- This allows users to discover other users by name without exposing email addresses
CREATE OR REPLACE FUNCTION public.search_profiles_for_discovery(_search_query text, _limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.display_name ILIKE '%' || _search_query || '%'
  LIMIT _limit
$$;