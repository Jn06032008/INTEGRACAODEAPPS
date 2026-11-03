/*
# Gestão do Estúdio — RLS Policies

Applies row-level security policies to all tables.
This is a closed, trusted ~30-user team. Operational data is shared among
authenticated users; admin/audit data is restricted to sysadmins.
*/

-- Helper: is current user a sysadmin?
-- (inlined in policies for clarity)

-- profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = auth_user_id
    OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin')
  );
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = auth_user_id);
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id
    OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'))
  WITH CHECK (auth.uid() = auth_user_id
    OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'));

-- sectors
DROP POLICY IF EXISTS "sectors_read_all" ON sectors;
CREATE POLICY "sectors_read_all" ON sectors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sectors_write_admin" ON sectors;
CREATE POLICY "sectors_write_admin" ON sectors FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'));

-- roles
DROP POLICY IF EXISTS "roles_read_all" ON roles;
CREATE POLICY "roles_read_all" ON roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "roles_write_admin" ON roles;
CREATE POLICY "roles_write_admin" ON roles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'));

-- user_sectors
DROP POLICY IF EXISTS "us_read_admin_or_self" ON user_sectors;
CREATE POLICY "us_read_admin_or_self" ON user_sectors FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'));
DROP POLICY IF EXISTS "us_write_admin" ON user_sectors;
CREATE POLICY "us_write_admin" ON user_sectors FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'));

-- user_roles
DROP POLICY IF EXISTS "ur_read_admin_or_self" ON user_roles;
CREATE POLICY "ur_read_admin_or_self" ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id WHERE ur2.user_id = auth.uid() AND r2.key = 'sysadmin'));
DROP POLICY IF EXISTS "ur_write_admin" ON user_roles;
CREATE POLICY "ur_write_admin" ON user_roles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'));

-- events: shared operational data
DROP POLICY IF EXISTS "events_read_all" ON events;
CREATE POLICY "events_read_all" ON events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "events_insert_auth" ON events;
CREATE POLICY "events_insert_auth" ON events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "events_update_auth" ON events;
CREATE POLICY "events_update_auth" ON events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "events_delete_admin" ON events;
CREATE POLICY "events_delete_admin" ON events FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'));

-- checklist_templates
DROP POLICY IF EXISTS "ct_read_all" ON checklist_templates;
CREATE POLICY "ct_read_all" ON checklist_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ct_write_auth" ON checklist_templates;
CREATE POLICY "ct_write_auth" ON checklist_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- checklist_template_items
DROP POLICY IF EXISTS "cti_read_all" ON checklist_template_items;
CREATE POLICY "cti_read_all" ON checklist_template_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cti_write_auth" ON checklist_template_items;
CREATE POLICY "cti_write_auth" ON checklist_template_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- checklist_runs
DROP POLICY IF EXISTS "cr_read_all" ON checklist_runs;
CREATE POLICY "cr_read_all" ON checklist_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cr_write_auth" ON checklist_runs;
CREATE POLICY "cr_write_auth" ON checklist_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- checklist_tasks
DROP POLICY IF EXISTS "ctask_read_all" ON checklist_tasks;
CREATE POLICY "ctask_read_all" ON checklist_tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ctask_write_auth" ON checklist_tasks;
CREATE POLICY "ctask_write_auth" ON checklist_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- checklist_task_history
DROP POLICY IF EXISTS "cth_read_all" ON checklist_task_history;
CREATE POLICY "cth_read_all" ON checklist_task_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cth_insert_auth" ON checklist_task_history;
CREATE POLICY "cth_insert_auth" ON checklist_task_history FOR INSERT TO authenticated WITH CHECK (true);

-- reports
DROP POLICY IF EXISTS "reports_read_all" ON reports;
CREATE POLICY "reports_read_all" ON reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reports_write_auth" ON reports;
CREATE POLICY "reports_write_auth" ON reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- report_sections
DROP POLICY IF EXISTS "rs_read_all" ON report_sections;
CREATE POLICY "rs_read_all" ON report_sections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rs_write_auth" ON report_sections;
CREATE POLICY "rs_write_auth" ON report_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- errors
DROP POLICY IF EXISTS "errors_read_all" ON errors;
CREATE POLICY "errors_read_all" ON errors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "errors_write_auth" ON errors;
CREATE POLICY "errors_write_auth" ON errors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- problems
DROP POLICY IF EXISTS "problems_read_all" ON problems;
CREATE POLICY "problems_read_all" ON problems FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "problems_write_auth" ON problems;
CREATE POLICY "problems_write_auth" ON problems FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- problem_error_links
DROP POLICY IF EXISTS "pel_read_all" ON problem_error_links;
CREATE POLICY "pel_read_all" ON problem_error_links FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pel_write_auth" ON problem_error_links;
CREATE POLICY "pel_write_auth" ON problem_error_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- problem_updates
DROP POLICY IF EXISTS "pu_read_all" ON problem_updates;
CREATE POLICY "pu_read_all" ON problem_updates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pu_insert_auth" ON problem_updates;
CREATE POLICY "pu_insert_auth" ON problem_updates FOR INSERT TO authenticated WITH CHECK (true);

-- solutions
DROP POLICY IF EXISTS "sol_read_all" ON solutions;
CREATE POLICY "sol_read_all" ON solutions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sol_write_auth" ON solutions;
CREATE POLICY "sol_write_auth" ON solutions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- approval_requests
DROP POLICY IF EXISTS "ar_read_all" ON approval_requests;
CREATE POLICY "ar_read_all" ON approval_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ar_write_auth" ON approval_requests;
CREATE POLICY "ar_write_auth" ON approval_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- approval_decisions
DROP POLICY IF EXISTS "ad_read_all" ON approval_decisions;
CREATE POLICY "ad_read_all" ON approval_decisions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ad_insert_auth" ON approval_decisions;
CREATE POLICY "ad_insert_auth" ON approval_decisions FOR INSERT TO authenticated WITH CHECK (true);

-- schedule_assignments
DROP POLICY IF EXISTS "sa_read_all" ON schedule_assignments;
CREATE POLICY "sa_read_all" ON schedule_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sa_write_auth" ON schedule_assignments;
CREATE POLICY "sa_write_auth" ON schedule_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- readiness_confirmations
DROP POLICY IF EXISTS "rc_read_all" ON readiness_confirmations;
CREATE POLICY "rc_read_all" ON readiness_confirmations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rc_write_auth" ON readiness_confirmations;
CREATE POLICY "rc_write_auth" ON readiness_confirmations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- schedule_change_logs
DROP POLICY IF EXISTS "scl_read_all" ON schedule_change_logs;
CREATE POLICY "scl_read_all" ON schedule_change_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "scl_insert_auth" ON schedule_change_logs;
CREATE POLICY "scl_insert_auth" ON schedule_change_logs FOR INSERT TO authenticated WITH CHECK (true);

-- media_assets
DROP POLICY IF EXISTS "ma_read_all" ON media_assets;
CREATE POLICY "ma_read_all" ON media_assets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ma_write_auth" ON media_assets;
CREATE POLICY "ma_write_auth" ON media_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- media_history
DROP POLICY IF EXISTS "mh_read_all" ON media_history;
CREATE POLICY "mh_read_all" ON media_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "mh_insert_auth" ON media_history;
CREATE POLICY "mh_insert_auth" ON media_history FOR INSERT TO authenticated WITH CHECK (true);

-- notifications: only own
DROP POLICY IF EXISTS "notif_read_own" ON notifications;
CREATE POLICY "notif_read_own" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notif_insert_auth" ON notifications;
CREATE POLICY "notif_insert_auth" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- audit_logs: sysadmin read; any authenticated insert (server-side logging)
DROP POLICY IF EXISTS "audit_read_admin" ON audit_logs;
CREATE POLICY "audit_read_admin" ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.key = 'sysadmin'));
DROP POLICY IF EXISTS "audit_insert_auth" ON audit_logs;
CREATE POLICY "audit_insert_auth" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
