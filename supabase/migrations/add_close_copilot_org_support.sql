-- Close CRM Co-Pilot - Organization Support
-- Adds organization_id column to close_keywords for team-wide keywords

-- Add organization_id column
ALTER TABLE close_keywords
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for organization lookups
CREATE INDEX IF NOT EXISTS idx_close_keywords_org ON close_keywords(organization_id);

-- Update unique constraint to allow same keyword in different orgs
-- First drop the old constraint if it exists
ALTER TABLE close_keywords DROP CONSTRAINT IF EXISTS unique_keyword_per_user;

-- Add new constraint: unique keyword per user per organization (null org = personal)
ALTER TABLE close_keywords
ADD CONSTRAINT unique_keyword_per_user_org UNIQUE (user_id, organization_id, keyword);

-- Policy: Org members can view org-level keywords
CREATE POLICY "Org members can view org keywords"
  ON close_keywords FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = close_keywords.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- Policy: Org admins can insert org-level keywords
CREATE POLICY "Org admins can insert org keywords"
  ON close_keywords FOR INSERT
  WITH CHECK (
    organization_id IS NULL AND auth.uid() = user_id
    OR
    (
      organization_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = close_keywords.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
      )
    )
  );

-- Policy: Org admins can update org-level keywords
CREATE POLICY "Org admins can update org keywords"
  ON close_keywords FOR UPDATE
  USING (
    (organization_id IS NULL AND auth.uid() = user_id)
    OR
    (
      organization_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = close_keywords.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
      )
    )
  );

-- Policy: Org admins can delete org-level keywords
CREATE POLICY "Org admins can delete org keywords"
  ON close_keywords FOR DELETE
  USING (
    (organization_id IS NULL AND auth.uid() = user_id)
    OR
    (
      organization_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = close_keywords.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
      )
    )
  );
