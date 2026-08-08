-- supabase/migrations/035_attendance_logs.sql
-- Attendance tracking — daily check-in/check-out for employees.
-- Used by /attendance module.

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'leave', 'sick', 'remote')),
  notes TEXT,
  location TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(date DESC);

-- RLS
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all attendance (it's a directory)
DROP POLICY IF EXISTS "attendance_read_all" ON attendance_logs;
CREATE POLICY "attendance_read_all" ON attendance_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Staff can insert/update own attendance
DROP POLICY IF EXISTS "attendance_self_write" ON attendance_logs;
CREATE POLICY "attendance_self_write" ON attendance_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attendance_self_update" ON attendance_logs;
CREATE POLICY "attendance_self_update" ON attendance_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Owner + KK can manage all
DROP POLICY IF EXISTS "attendance_admin_all" ON attendance_logs;
CREATE POLICY "attendance_admin_all" ON attendance_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'kepala_kantor'))
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance_logs;
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
