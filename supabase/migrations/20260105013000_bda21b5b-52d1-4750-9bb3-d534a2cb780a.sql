-- Add a RESTRICTIVE policy that explicitly requires either:
-- 1. User viewing their own profile, OR
-- 2. User is an admin
-- RESTRICTIVE policies must ALL pass (in addition to at least one PERMISSIVE policy passing)
CREATE POLICY "Restrict profile access to owner or admin"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);