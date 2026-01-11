-- Update all expenses in Dongaam trip group to show Ammar Pardawala as the creator
UPDATE public.expenses 
SET created_by = '957bb771-54a7-43ef-b9cc-a840f6345250'
WHERE group_id = '7fffcd40-1b47-447e-bb9a-f01b7031bacf';