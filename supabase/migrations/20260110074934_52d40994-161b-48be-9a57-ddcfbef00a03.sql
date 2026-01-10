-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Expense payers can create splits" ON public.expense_splits;

-- Create a new INSERT policy that allows:
-- 1. The expense payer to create splits (original behavior)
-- 2. Group members to create splits for expenses in their group
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
        e.paid_by = auth.uid()  -- The payer can create splits
        OR (e.group_id IS NOT NULL AND gm.user_id = auth.uid())  -- Group members can create splits
      )
  )
);