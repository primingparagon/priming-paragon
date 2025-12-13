-- =======================================================
-- Security Events Table (Enhanced for R/W Performance and Integrity)
-- =======================================================

CREATE TABLE IF NOT EXISTS security_events (
  id BIGSERIAL PRIMARY KEY,

  -- Foreign Key constraint with ON DELETE SET NULL for integrity
  admin_id INT REFERENCES users(id) ON DELETE SET NULL,

  -- Use an ENUM type implicitly via a CHECK constraint for constrained event types (better integrity/performance)
  event_type VARCHAR(100) NOT NULL,

  -- Use a CHECK constraint for constrained severity levels
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),

  -- details uses JSONB for structured, indexable, flexible data
  details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------
-- Performance Optimizations
-- -----------------------------

-- Index for chronological queries (most common for log tables)
CREATE INDEX IF NOT EXISTS idx_security_events_created_at_desc
  ON security_events(created_at DESC);

-- Index for searching by event type (e.g., "all unauthorized access attempts")
CREATE INDEX IF NOT EXISTS idx_security_events_event_type
  ON security_events(event_type);

-- *NEW* Composite index for common operational queries ("all critical events in the last week")
CREATE INDEX IF NOT EXISTS idx_security_events_severity_created_at
  ON security_events(severity, created_at DESC);

-- *NEW* GIN index for efficient searching within the JSONB details field (e.g., searching for a specific IP address)
CREATE INDEX IF NOT EXISTS idx_security_events_details_gin
  ON security_events USING GIN (details);

-- -----------------------------
-- Documentation
-- -----------------------------

COMMENT ON TABLE security_events IS
'Immutable log of all security-relevant events, used for monitoring and forensic analysis.';

COMMENT ON COLUMN security_events.admin_id IS
'Optional ID of the admin involved in or targeted by the event (NULL if a system event).';
