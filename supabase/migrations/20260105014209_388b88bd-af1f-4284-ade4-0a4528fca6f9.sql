-- Tighten RLS on profiles to prevent authenticated users from enumerating emails/names
-- Keep roles in separate table (user_roles) and use has_role() for admin checks.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop overly-redundant/conflicting SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Restrict profile access to owner or admin" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Drop existing UPDATE policy so we can re-create with explicit owner/admin rules
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Only the profile owner or an admin can read a profile row
CREATE POLICY "Profiles: owner or admin can read"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Owners can update their own profile row
CREATE POLICY "Profiles: owner can update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can update any profile row (needed for ban/unban, moderation)
CREATE POLICY "Profiles: admins can update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
