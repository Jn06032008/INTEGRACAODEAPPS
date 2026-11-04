/*
# Extend occurrences with penalty details and reviews

## Modified table
- occurrences: reported_by_name, occurrence_date, penalty_type (none, warning, suspension, penalty, dismissal), penalty_details.

## New table
- occurrence_reviews: superior decisions on occurrences (approved, rejected, closed, comment).

## Security
- RLS enabled on occurrence_reviews; authenticated users can read, insert and delete.
*/

ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS reported_by_name text;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS occurrence_date timestamptz;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS penalty_type text DEFAULT 'none';
ALTER TABLE occurrences DROP CONSTRAINT IF EXISTS occurrences_penalty_type_check;
ALTER TABLE occurrences ADD CONSTRAINT occurrences_penalty_type_check CHECK (penalty_type IN ('none', 'warning', 'suspension', 'penalty', 'dismissal'));
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS penalty_details text;

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
