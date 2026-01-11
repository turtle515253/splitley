-- Add created_by column to track who added the expense
ALTER TABLE public.expenses 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Set existing expenses to have created_by = paid_by (best assumption for existing data)
UPDATE public.expenses SET created_by = paid_by WHERE created_by IS NULL;

-- Make it NOT NULL after backfilling
ALTER TABLE public.expenses ALTER COLUMN created_by SET NOT NULL;

-- Set default for new expenses to current user
ALTER TABLE public.expenses ALTER COLUMN created_by SET DEFAULT auth.uid();