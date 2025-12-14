-- ============================================
-- Admin Audit Logs (SOC-2 / FERPA Ready)
-- Enhanced for Prime Website Operation
-- ============================================

-- START TRANSACTION;

CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGSERIAL PRIMARY KEY,

  admin_id INT NOT NULL,
  target_user_id INT NOT NULL,

  action_type VARCHAR(100) NOT NULL,
  program_of_interest VARCHAR(255),
  details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_admin_logs_admin
    FOREIGN KEY (admin_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT fk_admin_logs_target_user
    FOREIGN KEY (target_user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id
  ON admin_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user_id
  ON admin_logs(target_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at_desc
  ON admin_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type
  ON admin_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type_created_at
  ON admin_logs(action_type, created_at DESC);

COMMENT ON TABLE admin_logs IS
'Immutable audit log for all administrative actions. SOC-2, FERPA compliant.';

COMMENT ON COLUMN admin_logs.details IS
'Structured JSON metadata for forensic analysis.';

-- COMMIT; -- Commit the transaction if using manual transactions
