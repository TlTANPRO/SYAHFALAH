-- supabase/migrations/036_leave_requests.sql
-- Leave/cuti tracking — employees request leave, owner/KK approves.

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'annual' CHECK (type IN ('annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_user ON leave_requests(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_date_range ON leave_requests(start_date, end_date);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Owner + KK can see all
DROP POLICY IF EXISTS "leave_admin_read" ON leave_requests;
CREATE POLICY "leave_admin_read" ON leave_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'kepala_kantor'))
  );

-- Users can read own
DROP POLICY IF EXISTS "leave_self_read" ON leave_requests;
CREATE POLICY "leave_self_read" ON leave_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own
DROP POLICY IF EXISTS "leave_self_insert" ON leave_requests;
CREATE POLICY "leave_self_insert" ON leave_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own (to cancel)
DROP POLICY IF EXISTS "leave_self_update" ON leave_requests;
CREATE POLICY "leave_self_update" ON leave_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- Owner + KK can update any (to approve/reject)
DROP POLICY IF EXISTS "leave_admin_update" ON leave_requests;
CREATE POLICY "leave_admin_update" ON leave_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'kepala_kantor'))
  );

DROP TRIGGER IF EXISTS update_leave_updated_at ON leave_requests;
CREATE TRIGGER update_leave_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
