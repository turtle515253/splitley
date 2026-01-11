-- Update expense UPDATE policy to allow group creators to edit any expense in their groups
DROP POLICY IF EXISTS "Expense creators can update their expenses" ON public.expenses;

CREATE POLICY "Expense payers or group creators can update expenses" 
ON public.expenses 
FOR UPDATE 
USING (
  paid_by = auth.uid() 
  OR (group_id IS NOT NULL AND is_group_creator(auth.uid(), group_id))
);

-- Update expense_splits SELECT policy to allow group creators to see all splits
DROP POLICY IF EXISTS "Users can view their expense splits" ON public.expense_splits;

CREATE POLICY "Users can view their expense splits" 
ON public.expense_splits 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_splits.expense_id 
    AND (
      e.paid_by = auth.uid() 
      OR (e.group_id IS NOT NULL AND is_group_creator(auth.uid(), e.group_id))
    )
  )
);