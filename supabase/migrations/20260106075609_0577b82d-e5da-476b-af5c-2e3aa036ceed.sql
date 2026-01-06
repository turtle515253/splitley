-- Drop the overly permissive policy that allows any authenticated user to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles for discovery" ON public.profiles;

-- Create a more restrictive policy: users can only view their own profile
-- OR profiles of users they share a group with (needed for expense splitting features)
CREATE POLICY "Users can view own profile or shared group members"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id 
  OR users_share_group(auth.uid(), id)
);