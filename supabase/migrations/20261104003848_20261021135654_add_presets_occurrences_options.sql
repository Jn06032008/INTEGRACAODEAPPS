/*
# Add event presets, occurrences, preset options and task names

## New tables
- event_presets: recurring event templates (name, weekday, start/end time).
- occurrences: people-related occurrences, linked optionally to events.
- preset_options: standard dropdown values for media (preacher, platform, event_name).

## Modified tables
- checklist_task_history: new task_name column.

## Security
- RLS enabled on all new tables; authenticated read/write, sysadmin delete and preset_options writes.
*/

CREATE TABLE IF NOT EXISTS event_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_type text NOT NULL DEFAULT 'culto',
  weekday smallint NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time time NOT NULL,
  end_time time,
  observations text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE event_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ep_read_auth" ON event_presets;
CREATE POLICY "ep_read_auth" ON event_presets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ep_insert_auth" ON event_presets;
CREATE POLICY "ep_insert_auth" ON event_presets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ep_update_auth" ON event_presets;
CREATE POLICY "ep_update_auth" ON event_presets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ep_delete_admin" ON event_presets;
CREATE POLICY "ep_delete_admin" ON event_presets FOR DELETE TO authenticated USING (public.is_sysadmin(auth.uid()));

CREATE TABLE IF NOT EXISTS occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text NOT NULL,
  occurrence_type text NOT NULL DEFAULT 'comportamento',
  description text,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  action_taken text,
  penalty text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "occ_read_auth" ON occurrences;
CREATE POLICY "occ_read_auth" ON occurrences FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "occ_insert_auth" ON occurrences;
CREATE POLICY "occ_insert_auth" ON occurrences FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "occ_update_auth" ON occurrences;
CREATE POLICY "occ_update_auth" ON occurrences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "occ_delete_admin" ON occurrences;
CREATE POLICY "occ_delete_admin" ON occurrences FOR DELETE TO authenticated USING (public.is_sysadmin(auth.uid()));

CREATE TABLE IF NOT EXISTS preset_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('preacher', 'platform', 'event_name')),
  value text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (category, value)
);
ALTER TABLE preset_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "po_read_auth" ON preset_options;
CREATE POLICY "po_read_auth" ON preset_options FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "po_insert_admin" ON preset_options;
CREATE POLICY "po_insert_admin" ON preset_options FOR INSERT TO authenticated WITH CHECK (public.is_sysadmin(auth.uid()));
DROP POLICY IF EXISTS "po_update_admin" ON preset_options;
CREATE POLICY "po_update_admin" ON preset_options FOR UPDATE TO authenticated USING (public.is_sysadmin(auth.uid())) WITH CHECK (public.is_sysadmin(auth.uid()));
DROP POLICY IF EXISTS "po_delete_admin" ON preset_options;
CREATE POLICY "po_delete_admin" ON preset_options FOR DELETE TO authenticated USING (public.is_sysadmin(auth.uid()));

ALTER TABLE checklist_task_history ADD COLUMN IF NOT EXISTS task_name text;

INSERT INTO preset_options (category, value) VALUES
  ('platform', 'YouTube'), ('platform', 'Instagram'), ('platform', 'Facebook'),
  ('event_name', 'Culto de Quarta-Feira'), ('event_name', 'Culto de Domingo - Manhã'),
  ('event_name', 'Culto de Domingo - Noite'), ('event_name', 'Culto de Sexta-Feira'),
  ('event_name', 'Encontro de Casais'), ('event_name', 'Vigília'),
  ('preacher', 'Bispo Pedroso'), ('preacher', 'Pastor Frederico'),
  ('preacher', 'Pastora Renata'), ('preacher', 'Presbítero Anderson')
ON CONFLICT (category, value) DO NOTHING;
