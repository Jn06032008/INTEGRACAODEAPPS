-- Extend occurrences table with more detailed fields for people management
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS reported_by_name text;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS occurrence_date timestamptz;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS penalty_type text DEFAULT 'none' CHECK (penalty_type IN ('none', 'warning', 'suspension', 'penalty', 'dismissal'));
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS penalty_details text;

-- Add occurrence_reviews table for superior review of occurrences
CREATE TABLE IF NOT EXISTS occurrence_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'closed', 'comment')),
  comment text,
  reviewer uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE occurrence_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "occr_read_auth" ON occurrence_reviews;
CREATE POLICY "occr_read_auth" ON occurrence_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "occr_insert_auth" ON occurrence_reviews;
CREATE POLICY "occr_insert_auth" ON occurrence_reviews FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "occr_delete_auth" ON occurrence_reviews;
CREATE POLICY "occr_delete_auth" ON occurrence_reviews FOR DELETE TO authenticated USING (true);
