
-- Fix the INSERT policy for expense_splits to allow any group member to create splits
-- for expenses in their group (not just the payer)

DROP POLICY IF EXISTS "Group members can create splits for group expenses" ON public.expense_splits;

CREATE POLICY "Group members can create splits for group expenses" 
ON public.expense_splits 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM expenses e
    LEFT JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_splits.expense_id
      AND (
        e.paid_by = auth.uid()  -- The payer can always create splits
        OR (e.group_id IS NOT NULL AND gm.user_id = auth.uid())  -- Any group member can create splits for group expenses
      )
  )
);
