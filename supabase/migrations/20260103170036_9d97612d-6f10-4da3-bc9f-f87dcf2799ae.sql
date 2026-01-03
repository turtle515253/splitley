-- Create rate_limits table for tracking function call frequency
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, action)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access this table (edge functions use service role)
-- No policies needed for regular users - they can't access this table directly

-- Create index for faster lookups
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action);

-- Create function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id UUID,
  _action TEXT,
  _max_requests INTEGER,
  _window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_record RECORD;
  _window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  _window_start := now() - (_window_seconds || ' seconds')::INTERVAL;
  
  -- Get current rate limit record
  SELECT * INTO _current_record
  FROM public.rate_limits
  WHERE user_id = _user_id AND action = _action;
  
  IF _current_record IS NULL THEN
    -- No record exists, create one
    INSERT INTO public.rate_limits (user_id, action, request_count, window_start)
    VALUES (_user_id, _action, 1, now());
    RETURN TRUE;
  ELSIF _current_record.window_start < _window_start THEN
    -- Window has expired, reset counter
    UPDATE public.rate_limits
    SET request_count = 1, window_start = now()
    WHERE user_id = _user_id AND action = _action;
    RETURN TRUE;
  ELSIF _current_record.request_count < _max_requests THEN
    -- Within window and under limit, increment counter
    UPDATE public.rate_limits
    SET request_count = request_count + 1
    WHERE user_id = _user_id AND action = _action;
    RETURN TRUE;
  ELSE
    -- Rate limit exceeded
    RETURN FALSE;
  END IF;
END;
$$;