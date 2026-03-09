-- =============================================
-- Fix ALL RLS policies to PERMISSIVE and secure profile ban fields
-- =============================================

-- === PROFILES ===
DROP POLICY IF EXISTS "Profiles: owner or admin can read" ON profiles;
DROP POLICY IF EXISTS "Profiles: owner can update" ON profiles;
DROP POLICY IF EXISTS "Profiles: admins can update" ON profiles;

CREATE POLICY "Profiles: owner or admin can read"
ON profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Profiles: owner can update"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_banned IS NOT DISTINCT FROM (SELECT p.is_banned FROM profiles p WHERE p.user_id = auth.uid())
  AND banned_at IS NOT DISTINCT FROM (SELECT p.banned_at FROM profiles p WHERE p.user_id = auth.uid())
  AND banned_reason IS NOT DISTINCT FROM (SELECT p.banned_reason FROM profiles p WHERE p.user_id = auth.uid())
);

CREATE POLICY "Profiles: admins can update"
ON profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- === LAMPADAIRES ===
DROP POLICY IF EXISTS "Anyone authenticated can view lampadaires" ON lampadaires;
DROP POLICY IF EXISTS "Admins can manage lampadaires" ON lampadaires;

CREATE POLICY "Anyone authenticated can view lampadaires"
ON lampadaires FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage lampadaires"
ON lampadaires FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- === SIGNALEMENTS ===
DROP POLICY IF EXISTS "Users can view their own reports" ON signalements;
DROP POLICY IF EXISTS "Admins can view all reports" ON signalements;
DROP POLICY IF EXISTS "Users can create reports" ON signalements;
DROP POLICY IF EXISTS "Admins can update reports" ON signalements;

CREATE POLICY "Users can view their own reports"
ON signalements FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports"
ON signalements FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create reports"
ON signalements FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update reports"
ON signalements FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- === USER_ROLES ===
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

CREATE POLICY "Users can view their own roles"
ON user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- === LAMPADAIRE_HISTORY ===
DROP POLICY IF EXISTS "Anyone authenticated can view history" ON lampadaire_history;
DROP POLICY IF EXISTS "Admins can create history" ON lampadaire_history;
DROP POLICY IF EXISTS "Admins can delete history" ON lampadaire_history;

CREATE POLICY "Anyone authenticated can view history"
ON lampadaire_history FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create history"
ON lampadaire_history FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete history"
ON lampadaire_history FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- === PUSH_SUBSCRIPTIONS ===
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can view their own push subscriptions"
ON push_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
ON push_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON push_subscriptions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all push subscriptions"
ON push_subscriptions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));