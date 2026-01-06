-- Add CHECK constraints to expenses table
ALTER TABLE public.expenses
ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0),
ADD CONSTRAINT expenses_amount_reasonable CHECK (amount <= 999999.99),
ADD CONSTRAINT expenses_description_length CHECK (char_length(description) > 0 AND char_length(description) <= 500);

-- Add CHECK constraint to expense_splits table
ALTER TABLE public.expense_splits
ADD CONSTRAINT splits_amount_non_negative CHECK (amount >= 0);