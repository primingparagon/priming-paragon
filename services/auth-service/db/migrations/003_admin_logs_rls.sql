-- =======================================================
-- Enable Row Level Security (RLS) and Define Policies
-- SOC-2 / FERPA / Supabase Production-Safe
-- =======================================================

-- 1. Enable RLS on the table
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- INSERT: Backend service only
-- -------------------------------------------------------
-- Only the trusted backend service can write new logs.
CREATE POLICY "backend_insert_admin_logs"
ON admin_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- -------------------------------------------------------
-- SELECT: Admins can view their own actions
-- -------------------------------------------------------
-- Limits general admin visibility to only the logs they generated.
CREATE POLICY "admin_reads_own_logs"
ON admin_logs
FOR SELECT
USING (auth.uid() = admin_id);

-- -------------------------------------------------------
-- SELECT: Security & Super Admins can view all logs
-- -------------------------------------------------------
-- Grants elevated users full read access for investigations.
CREATE POLICY "security_reads_all_logs"
ON admin_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'security')
  )
);

-- -------------------------------------------------------
-- IMMUTABILITY: No updates or deletes (EVER)
-- -------------------------------------------------------
-- Enforces audit log integrity.
CREATE POLICY "no_update_admin_logs"
ON admin_logs
FOR UPDATE
USING (false);

CREATE POLICY "no_delete_admin_logs"
ON admin_logs
FOR DELETE
USING (false);

-- -------------------------------------------------------
-- NOTE:
-- In a standard Supabase setup, the 'service_role' user/key ALREADY bypasses RLS
-- automatically. The policies above secure client-facing user roles effectively.
-- -------------------------------------------------------
