-- Create a settlements table to properly track payments between users
CREATE TABLE public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Users can view settlements they are involved in
CREATE POLICY "Users can view their settlements"
ON public.settlements
FOR SELECT
USING (auth.uid() = payer_id OR auth.uid() = receiver_id);

-- Users can create settlements where they are the receiver (recording someone paid them)
CREATE POLICY "Users can record received payments"
ON public.settlements
FOR INSERT
WITH CHECK (auth.uid() = receiver_id);

-- Users can delete their own settlements
CREATE POLICY "Users can delete settlements they created"
ON public.settlements
FOR DELETE
USING (auth.uid() = receiver_id);