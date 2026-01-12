-- Create group_settlements table for tracking settlements within groups
-- This is separate from the personal settlements table to allow group-wide visibility

CREATE TABLE public.group_settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.group_settlements ENABLE ROW LEVEL SECURITY;

-- All group members can view settlements in their groups
CREATE POLICY "Group members can view group settlements"
ON public.group_settlements
FOR SELECT
USING (is_group_member(auth.uid(), group_id));

-- Users can record payments they made (as payer) - the receiver records the payment
-- Actually, in settle up flow, the person who owes records that they paid
-- So payer records their own payment OR receiver confirms receipt
CREATE POLICY "Users can record group settlements"
ON public.group_settlements
FOR INSERT
WITH CHECK (
  is_group_member(auth.uid(), group_id) 
  AND (auth.uid() = payer_id OR auth.uid() = receiver_id)
);

-- Only the creator of the settlement can delete it
CREATE POLICY "Settlement creators can delete"
ON public.group_settlements
FOR DELETE
USING (auth.uid() = payer_id OR auth.uid() = receiver_id);