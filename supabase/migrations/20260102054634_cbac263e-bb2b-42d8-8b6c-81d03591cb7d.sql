-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Users can add members to groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;

-- Fix group_members SELECT policy - use the outer table reference correctly
CREATE POLICY "Users can view members of groups they belong to" 
ON public.group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  )
);

-- Fix group_members INSERT policy - allow users to add members to groups they belong to, or add themselves
CREATE POLICY "Users can add members to groups they belong to" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  )) 
  OR (user_id = auth.uid())
);

-- Fix groups SELECT policy - reference groups.id correctly
CREATE POLICY "Users can view groups they belong to" 
ON public.groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = groups.id 
    AND gm.user_id = auth.uid()
  )
  OR created_by = auth.uid()
);