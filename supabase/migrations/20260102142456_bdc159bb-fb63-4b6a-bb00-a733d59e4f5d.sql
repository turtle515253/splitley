-- Create a security definer function to check group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Drop all problematic policies
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Users can add members to groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.group_members;

-- Recreate group_members SELECT policy using the function
CREATE POLICY "Users can view members of groups they belong to" 
ON public.group_members 
FOR SELECT 
USING (public.is_group_member(auth.uid(), group_id));

-- Recreate group_members INSERT policy - allow adding self or if already a member
CREATE POLICY "Users can add members to groups they belong to" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  public.is_group_member(auth.uid(), group_id) 
  OR user_id = auth.uid()
);

-- Recreate groups SELECT policy using the function
CREATE POLICY "Users can view groups they belong to" 
ON public.groups 
FOR SELECT 
USING (
  public.is_group_member(auth.uid(), id) 
  OR created_by = auth.uid()
);