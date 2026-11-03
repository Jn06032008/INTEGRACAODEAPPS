/*
# Fix remaining RLS recursion on events, roles, sectors

## Problem
Three more tables had the same self-referential RLS recursion via `user_roles`:
- events (DELETE policy)
- roles (ALL policy)
- sectors (ALL policy)

Each used `EXISTS (SELECT 1 FROM user_roles ...)` which triggers user_roles RLS,
which itself references user_roles — infinite recursion.

## Solution
Replace all `EXISTS (SELECT 1 FROM user_roles ...)` checks with `public.is_sysadmin(auth.uid())`,
the SECURITY DEFINER function created in the previous migration.

## Tables modified
- events — DELETE policy
- roles — ALL policy (split into proper per-verb policies)
- sectors — ALL policy (split into proper per-verb policies)
*/

-- Fix events DELETE policy
DROP POLICY IF EXISTS "events_delete_admin" ON events;
CREATE POLICY "events_delete_admin"
  ON events FOR DELETE TO authenticated
  USING (public.is_sysadmin(auth.uid()));

-- Fix roles policies (split ALL into per-verb)
DROP POLICY IF EXISTS "roles_write_admin" ON roles;
CREATE POLICY "roles_insert_admin"
  ON roles FOR INSERT TO authenticated
  WITH CHECK (public.is_sysadmin(auth.uid()));
CREATE POLICY "roles_update_admin"
  ON roles FOR UPDATE TO authenticated
  USING (public.is_sysadmin(auth.uid()))
  WITH CHECK (public.is_sysadmin(auth.uid()));
CREATE POLICY "roles_delete_admin"
  ON roles FOR DELETE TO authenticated
  USING (public.is_sysadmin(auth.uid()));

-- Fix sectors policies (split ALL into per-verb)
DROP POLICY IF EXISTS "sectors_write_admin" ON sectors;
CREATE POLICY "sectors_insert_admin"
  ON sectors FOR INSERT TO authenticated
  WITH CHECK (public.is_sysadmin(auth.uid()));
CREATE POLICY "sectors_update_admin"
  ON sectors FOR UPDATE TO authenticated
  USING (public.is_sysadmin(auth.uid()))
  WITH CHECK (public.is_sysadmin(auth.uid()));
CREATE POLICY "sectors_delete_admin"
  ON sectors FOR DELETE TO authenticated
  USING (public.is_sysadmin(auth.uid()));
