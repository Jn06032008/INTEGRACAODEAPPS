/*
# Fix RLS Recursion and Enable Login

## Problem
The RLS policies on `user_roles`, `user_sectors`, and `profiles` had infinite recursion:
- `user_roles` SELECT policy checked `EXISTS (SELECT 1 FROM user_roles ...)` — self-referential
- `profiles` SELECT policy checked `EXISTS (SELECT 1 FROM user_roles ...)` — which triggered user_roles RLS, causing recursion

This caused ALL queries from authenticated users to fail silently, making login impossible
(the auth succeeds but loadAppUser gets zero rows from profiles).

## Solution
1. Create a SECURITY DEFINER function `is_sysadmin(uid uuid)` that checks if a user
   has the 'sysadmin' role. SECURITY DEFINER runs with the function owner's privileges,
   bypassing RLS — this breaks the recursion.
2. Replace all self-referential sysadmin checks in policies with calls to `is_sysadmin()`.
3. Grant EXECUTE on the function to `authenticated` role.

## Tables modified
- `profiles` — SELECT and UPDATE policies simplified
- `user_roles` — SELECT policy simplified, write policies simplified
- `user_sectors` — SELECT policy simplified, write policies simplified
- `audit_logs` — SELECT policy simplified
- Any other table with sysadmin checks in policies

## Security
- The `is_sysadmin()` function is read-only and only checks role membership.
- All RLS policies remain enabled.
- No data is lost — only policy definitions change.
*/

-- 1. Create the is_sysadmin function (SECURITY DEFINER to bypass RLS recursion)
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

-- 2. Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.is_sysadmin(uuid) TO authenticated;

-- 3. Fix profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_sysadmin(auth.uid()))
  WITH CHECK (auth.uid() = auth_user_id OR public.is_sysadmin(auth.uid()));

-- profiles_insert_self stays the same (no recursion issue)
-- profiles_delete_own_or_admin if it exists
DROP POLICY IF EXISTS "profiles_delete_own_or_admin" ON profiles;
CREATE POLICY "profiles_delete_own_or_admin"
  ON profiles FOR DELETE TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_sysadmin(auth.uid()));

-- 4. Fix user_roles policies
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

-- 5. Fix user_sectors policies
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

-- 6. Fix audit_logs SELECT policy
DROP POLICY IF EXISTS "audit_read_admin" ON audit_logs;
CREATE POLICY "audit_read_admin"
  ON audit_logs FOR SELECT TO authenticated
  USING (public.is_sysadmin(auth.uid()));
