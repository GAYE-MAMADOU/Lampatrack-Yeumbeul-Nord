-- Enable RLS on email_verification_codes table
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- No policies needed as this table will only be accessed via edge functions with service role key
-- This prevents direct client access to verification codes