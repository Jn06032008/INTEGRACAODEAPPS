-- Add error_analysis_notes table for error analysis tracking
CREATE TABLE IF NOT EXISTS error_analysis_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id uuid NOT NULL REFERENCES errors(id) ON DELETE CASCADE,
  note text NOT NULL,
  previous_stage text,
  new_stage text,
  author uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE error_analysis_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ean_read_auth" ON error_analysis_notes;
CREATE POLICY "ean_read_auth" ON error_analysis_notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ean_insert_auth" ON error_analysis_notes;
CREATE POLICY "ean_insert_auth" ON error_analysis_notes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ean_update_auth" ON error_analysis_notes;
CREATE POLICY "ean_update_auth" ON error_analysis_notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ean_delete_auth" ON error_analysis_notes;
CREATE POLICY "ean_delete_auth" ON error_analysis_notes FOR DELETE TO authenticated USING (true);
