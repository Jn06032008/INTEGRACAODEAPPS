/*
# Fix RLS recursion and enable login

## Problem
Policies on user_roles, user_sectors and profiles referenced user_roles inside
their own checks, causing infinite recursion and blocking every query.

## Solution
1. Create SECURITY DEFINER function public.is_sysadmin(uid) which bypasses RLS.
2. Replace the self-referential sysadmin checks with calls to that function.

## Security
- is_sysadmin is read-only and only checks role membership.
- RLS stays enabled on every table.
*/

CREATE OR REPLACE FUNCTION public.is_sysadmin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = uid AND r.key = 'sysadmin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_sysadmin(uuid) TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_sysadmin(auth.uid()))
  WITH CHECK (auth.uid() = auth_user_id OR public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "profiles_delete_own_or_admin" ON profiles;
CREATE POLICY "profiles_delete_own_or_admin"
  ON profiles FOR DELETE TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "ur_read_admin_or_self" ON user_roles;
CREATE POLICY "ur_read_admin_or_self"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "ur_write_admin" ON user_roles;
CREATE POLICY "ur_write_admin"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "ur_update_admin" ON user_roles;
CREATE POLICY "ur_update_admin"
  ON user_roles FOR UPDATE TO authenticated
  USING (public.is_sysadmin(auth.uid()))
  WITH CHECK (public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "ur_delete_admin" ON user_roles;
CREATE POLICY "ur_delete_admin"
  ON user_roles FOR DELETE TO authenticated
  USING (public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "us_read_admin_or_self" ON user_sectors;
CREATE POLICY "us_read_admin_or_self"
  ON user_sectors FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "us_write_admin" ON user_sectors;
CREATE POLICY "us_write_admin"
  ON user_sectors FOR INSERT TO authenticated
  WITH CHECK (public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "us_update_admin" ON user_sectors;
CREATE POLICY "us_update_admin"
  ON user_sectors FOR UPDATE TO authenticated
  USING (public.is_sysadmin(auth.uid()))
  WITH CHECK (public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "us_delete_admin" ON user_sectors;
CREATE POLICY "us_delete_admin"
  ON user_sectors FOR DELETE TO authenticated
  USING (public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "audit_read_admin" ON audit_logs;
CREATE POLICY "audit_read_admin"
  ON audit_logs FOR SELECT TO authenticated
  USING (public.is_sysadmin(auth.uid()));
