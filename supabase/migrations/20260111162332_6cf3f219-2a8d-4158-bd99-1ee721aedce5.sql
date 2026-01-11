-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Expense payers or group creators can delete splits" ON public.expense_splits;

-- Create a new policy that allows expense payers to delete splits for their expenses
-- This aligns with the expense UPDATE policy which allows paid_by to update the expense
CREATE POLICY "Expense payers or group creators can delete splits" 
ON public.expense_splits 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_splits.expense_id 
    AND (
      e.paid_by = auth.uid() 
      OR (e.group_id IS NOT NULL AND is_group_creator(auth.uid(), e.group_id))
    )
  )
);