-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own profile or shared group members" ON public.profiles;

-- Create new policy allowing authenticated users to search profiles for discovery
CREATE POLICY "Authenticated users can view profiles for discovery"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);