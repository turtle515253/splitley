-- Update the DELETE policy on expenses to allow group creators to delete any expense in their group
DROP POLICY IF EXISTS "Expense creators can delete their expenses" ON public.expenses;

CREATE POLICY "Expense payers or group creators can delete expenses" 
ON public.expenses 
FOR DELETE 
TO authenticated
USING (
  paid_by = auth.uid()  -- The payer can delete
  OR (group_id IS NOT NULL AND is_group_creator(auth.uid(), group_id))  -- Group creator can delete
);

-- Also update the expense_splits DELETE policy
DROP POLICY IF EXISTS "Expense creators can delete splits" ON public.expense_splits;

CREATE POLICY "Expense payers or group creators can delete splits" 
ON public.expense_splits 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM expenses e
    WHERE e.id = expense_splits.expense_id
      AND (
        e.paid_by = auth.uid()  -- The payer can delete splits
        OR (e.group_id IS NOT NULL AND is_group_creator(auth.uid(), e.group_id))  -- Group creator can delete splits
      )
  )
);