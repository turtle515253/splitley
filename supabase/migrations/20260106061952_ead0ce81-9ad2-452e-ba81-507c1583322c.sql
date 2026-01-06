-- Add currency column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN currency text DEFAULT 'USD';

-- Update the profiles_display view to include currency
DROP VIEW IF EXISTS public.profiles_display;

CREATE VIEW public.profiles_display
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  avatar_url,
  created_at,
  updated_at,
  currency
FROM public.profiles;

GRANT SELECT ON public.profiles_display TO authenticated;