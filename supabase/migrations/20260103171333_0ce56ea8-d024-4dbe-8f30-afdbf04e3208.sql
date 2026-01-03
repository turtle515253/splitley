-- Drop the SECURITY DEFINER view (flagged by linter)
DROP VIEW IF EXISTS public.profiles_display;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_visible_profiles() TO authenticated;