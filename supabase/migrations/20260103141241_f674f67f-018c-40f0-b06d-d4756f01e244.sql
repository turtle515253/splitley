-- Phase 1: Create helper function to check if users share a group (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.users_share_group(_user_id1 uuid, _user_id2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = _user_id1
      AND gm2.user_id = _user_id2
  )
$$;

-- Phase 1: Fix Critical Profiles SELECT Policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or shared group members"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR public.users_share_group(auth.uid(), id)
);

-- Phase 2: Add Missing Foreign Key Constraints
ALTER TABLE public.expenses
ADD CONSTRAINT fk_expenses_paid_by 
FOREIGN KEY (paid_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.expenses
ADD CONSTRAINT fk_expenses_group_id 
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.expense_splits
ADD CONSTRAINT fk_expense_splits_expense_id 
FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;

ALTER TABLE public.expense_splits
ADD CONSTRAINT fk_expense_splits_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.group_members
ADD CONSTRAINT fk_group_members_group_id 
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.group_members
ADD CONSTRAINT fk_group_members_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.groups
ADD CONSTRAINT fk_groups_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Phase 3: Create helper function to check if user is group creator
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = _group_id
      AND created_by = _user_id
  )
$$;

-- Phase 3: Add Group Member Removal Policy (allow creators to remove members)
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

CREATE POLICY "Users can leave groups or creators can remove members"
ON public.group_members
FOR DELETE
USING (
  user_id = auth.uid() 
  OR public.is_group_creator(auth.uid(), group_id)
);

-- Phase 3: Add Expense Splits DELETE Policy
CREATE POLICY "Expense creators can delete splits"
ON public.expense_splits
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_splits.expense_id
      AND e.paid_by = auth.uid()
  )
);

-- Phase 3: Add Groups DELETE Policy
CREATE POLICY "Group creators can delete their groups"
ON public.groups
FOR DELETE
USING (created_by = auth.uid());