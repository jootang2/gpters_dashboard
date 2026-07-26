-- Adds per-response (row-level) inclusion toggle, separate from
-- dashboard_config.is_visible (which is per-field/column visibility).
--
-- admin can flip this off for a specific participant (e.g. withdrew,
-- test/junk submission) so their row is excluded from /api/dashboard-summary
-- aggregation, without deleting the row itself.
--
-- Default true so existing rows (and future public INSERTs, which never
-- set this column) are included by default.

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS include_in_dashboard boolean NOT NULL DEFAULT true;

-- No RLS policy changes needed: this is just a new column on a table that
-- already has RLS enabled (survey_responses). anon still only has the
-- existing INSERT policy (WITH CHECK (true), doesn't reference this
-- column), so anon inserts keep getting the default `true` and still can't
-- SELECT/UPDATE any row. Only service_role (bypasses RLS) can read or flip
-- this column, via app/api/admin/*.
