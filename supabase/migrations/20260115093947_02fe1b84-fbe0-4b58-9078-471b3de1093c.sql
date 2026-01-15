-- Drop the existing restrictive policy on expense_splits
DROP POLICY IF EXISTS "Users can view their expense splits" ON expense_splits;

-- Create a new policy that allows group members to see all splits for group expenses
CREATE POLICY "Group members can view all splits for group expenses" 
ON expense_splits 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_splits.expense_id
    AND (
      (e.paid_by = auth.uid()) OR
      (e.group_id IS NOT NULL AND is_group_member(auth.uid(), e.group_id))
    )
  ))
);