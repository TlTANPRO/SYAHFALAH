-- supabase/migrations/037_documents.sql
-- Documents / SOP / file library.

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'sop' CHECK (category IN ('sop', 'policy', 'contract', 'template', 'report', 'other')),
  file_url TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'owner_only', 'kk_and_owner', 'pic_and_up')),
  division_id UUID REFERENCES divisions(id),
  uploaded_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_division ON documents(division_id);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Owner sees all
DROP POLICY IF EXISTS "docs_owner_read" ON documents;
CREATE POLICY "docs_owner_read" ON documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
  );

-- KK sees kk_and_owner + all
DROP POLICY IF EXISTS "docs_kk_read" ON documents;
CREATE POLICY "docs_kk_read" ON documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'kepala_kantor')
    AND visibility IN ('all', 'kk_and_owner')
  );

-- PIC sees pic_and_up + all
DROP POLICY IF EXISTS "docs_pic_read" ON documents;
CREATE POLICY "docs_pic_read" ON documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'pic_divisi')
    AND visibility IN ('all', 'pic_and_up')
  );

-- Staff sees all (default)
DROP POLICY IF EXISTS "docs_staff_read" ON documents;
CREATE POLICY "docs_staff_read" ON documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'staff')
    AND visibility = 'all'
  );

-- Owner + KK can write
DROP POLICY IF EXISTS "docs_write" ON documents;
CREATE POLICY "docs_write" ON documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'kepala_kantor'))
  );

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
