-- Create external_reviewer_sessions table for IP-based reviewer identity persistence
CREATE TABLE external_reviewer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('campaign_review', 'lp_map')),
  access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast IP lookups
CREATE INDEX idx_reviewer_sessions_ip ON external_reviewer_sessions(ip_address);

-- RLS policies for anonymous access (needed for external reviewers)
ALTER TABLE external_reviewer_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous SELECT
CREATE POLICY "Allow anonymous read" ON external_reviewer_sessions
  FOR SELECT TO anon USING (true);

-- Allow anonymous INSERT
CREATE POLICY "Allow anonymous insert" ON external_reviewer_sessions
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous UPDATE
CREATE POLICY "Allow anonymous update" ON external_reviewer_sessions
  FOR UPDATE TO anon USING (true);

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated read" ON external_reviewer_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON external_reviewer_sessions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON external_reviewer_sessions
  FOR UPDATE TO authenticated USING (true);