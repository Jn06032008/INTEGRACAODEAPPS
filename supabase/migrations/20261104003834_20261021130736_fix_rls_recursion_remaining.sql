/*
# Fix remaining RLS recursion on events, roles, sectors

## Problem
events (DELETE), roles (ALL) and sectors (ALL) checked user_roles directly, causing recursion.

## Solution
Use public.is_sysadmin(auth.uid()) in those checks and split ALL policies per verb.

## Security
- roles and sectors writes remain restricted to sysadmins.
- Reads stay open to authenticated users, as before.
*/

DROP POLICY IF EXISTS "events_delete_admin" ON events;
CREATE POLICY "events_delete_admin"
  ON events FOR DELETE TO authenticated
  USING (public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "roles_write_admin" ON roles;
DROP POLICY IF EXISTS "roles_insert_admin" ON roles;
CREATE POLICY "roles_insert_admin"
  ON roles FOR INSERT TO authenticated
  WITH CHECK (public.is_sysadmin(auth.uid()));
DROP POLICY IF EXISTS "roles_update_admin" ON roles;
CREATE POLICY "roles_update_admin"
  ON roles FOR UPDATE TO authenticated
  USING (public.is_sysadmin(auth.uid()))
  WITH CHECK (public.is_sysadmin(auth.uid()));
DROP POLICY IF EXISTS "roles_delete_admin" ON roles;
CREATE POLICY "roles_delete_admin"
  ON roles FOR DELETE TO authenticated
  USING (public.is_sysadmin(auth.uid()));

DROP POLICY IF EXISTS "sectors_write_admin" ON sectors;
DROP POLICY IF EXISTS "sectors_insert_admin" ON sectors;
CREATE POLICY "sectors_insert_admin"
  ON sectors FOR INSERT TO authenticated
  WITH CHECK (public.is_sysadmin(auth.uid()));
DROP POLICY IF EXISTS "sectors_update_admin" ON sectors;
CREATE POLICY "sectors_update_admin"
  ON sectors FOR UPDATE TO authenticated
  USING (public.is_sysadmin(auth.uid()))
  WITH CHECK (public.is_sysadmin(auth.uid()));
DROP POLICY IF EXISTS "sectors_delete_admin" ON sectors;
CREATE POLICY "sectors_delete_admin"
  ON sectors FOR DELETE TO authenticated
  USING (public.is_sysadmin(auth.uid()));
