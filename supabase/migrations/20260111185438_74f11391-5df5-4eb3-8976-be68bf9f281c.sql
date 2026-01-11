-- Update RLS policy to allow expense payers to also settle splits
-- This allows creditors to mark debts as settled when someone pays them

DROP POLICY IF EXISTS "Users can update their own splits (settle)" ON public.expense_splits;

CREATE POLICY "Users can update their own splits or payer can settle"
ON public.expense_splits
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM expenses e 
    WHERE e.id = expense_splits.expense_id 
    AND e.paid_by = auth.uid()
  )
);