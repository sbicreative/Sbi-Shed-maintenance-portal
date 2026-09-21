-- Apply through the controlled database migration process before enabling demo controls.
-- Reset audit history is intentionally not retained.
DROP TABLE IF EXISTS admin_audit_log;

CREATE TABLE IF NOT EXISTS demo_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demo_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Ended')),
    started_by VARCHAR(100) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_by VARCHAR(100),
    ended_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_demo_session ON demo_sessions ((status)) WHERE status = 'Active';

ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON demo_sessions FROM anon, authenticated;
