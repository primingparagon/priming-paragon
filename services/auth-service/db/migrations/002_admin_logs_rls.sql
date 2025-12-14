sql
-- ====================================================
-- Admin Logs (Immutable, Sealed, RLS-Protected, Partitioned)
-- ====================================================

-- Ensure pgcrypto extension is available for hashing operations
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------
-- Base Table (Partitioned Parent)
-- ------------------------
CREATE TABLE admin_logs (
  id BIGSERIAL PRIMARY KEY,

  -- Canonical actor (renamed to admin_id for consistency with RLS policies)
  admin_id UUID NOT NULL,

  -- Compatibility fields (optional, can be removed if not needed)
  user_id UUID,

  role TEXT NOT NULL,
  action_name TEXT NOT NULL,
  target_resource TEXT NOT NULL,

  -- Anomaly detection
  signals JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  exceeded BOOLEAN NOT NULL,

  -- Context
  metadata JSONB,
  correlation_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Tamper-evident sealing
  prev_hash TEXT,
  entry_hash TEXT NOT NULL
)
PARTITION BY RANGE (created_at);

-- ------------------------
-- Create initial partitions (Example: current and next month)
-- ------------------------

-- NOTE: You must manage these partitions over time (e.g., via a background job or periodic migration)

-- Example: Partition for December 2025 (adjust dates as necessary for your deployment time)
CREATE TABLE admin_logs_2025_12
PARTITION OF admin_logs
FOR VALUES FROM ('2025-12-01 00:00:00') TO ('2026-01-01 00:00:00');

-- Example: Partition for January 2026
CREATE TABLE admin_logs_2026_01
PARTITION OF admin_logs
FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2026-02-01 00:00:00');


-- ------------------------
-- Indexing for performance (applied to parent table, propagates to children)
-- ------------------------

-- Index for efficient querying/pagination on created_at and ID (deterministic order)
CREATE INDEX idx_admin_logs_created_at_id ON admin_logs(created_at DESC, id DESC);

-- Index for searching specific admin activity
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);

-- Index for tracing by correlation ID
CREATE INDEX idx_admin_logs_correlation_id ON admin_logs(correlation_id);
