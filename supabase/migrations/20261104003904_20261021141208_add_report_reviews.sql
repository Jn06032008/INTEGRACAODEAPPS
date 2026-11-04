/*
# Add report reviews

## New table
- report_reviews: comments and decisions (comment, approved, needs_changes) on reports.

## Security
- RLS enabled; authenticated users can read, insert and delete.
*/

CREATE TABLE IF NOT EXISTS report_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  comment text NOT NULL,
  decision text DEFAULT 'comment' CHECK (decision IN ('comment', 'approved', 'needs_changes')),
  author uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE report_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rr_read_auth" ON report_reviews;
CREATE POLICY "rr_read_auth" ON report_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rr_insert_auth" ON report_reviews;
CREATE POLICY "rr_insert_auth" ON report_reviews FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "rr_delete_auth" ON report_reviews;
CREATE POLICY "rr_delete_auth" ON report_reviews FOR DELETE TO authenticated USING (true);
