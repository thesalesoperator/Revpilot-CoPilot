-- Organizations System Migration
-- Multi-tenant organization management with roles, invites, and billing options

-- ============================================
-- TABLE 1: Organizations
-- The main organization entity
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  description TEXT,
  logo_url TEXT,

  -- Billing configuration
  billing_type TEXT NOT NULL DEFAULT 'org_pays' CHECK (billing_type IN ('org_pays', 'user_pays')),
  -- org_pays: Organization pays for all seats
  -- user_pays: Each member pays for their own subscription

  -- Stripe integration (for future billing)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'incomplete')),
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'professional', 'enterprise')),

  -- Seat management (for org_pays billing)
  max_seats INTEGER DEFAULT 5,
  used_seats INTEGER DEFAULT 1,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 2: Organization Members
-- Links users to organizations with roles
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role in the organization
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  -- owner: Full control, can delete org, transfer ownership (only 1 per org)
  -- admin: Can manage members, settings, view all data
  -- member: Regular user, can only view their own data

  -- Member-specific billing (for user_pays orgs)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'incomplete', 'none')),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),

  -- Timestamps
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

-- ============================================
-- TABLE 3: Organization Invites
-- Shareable invite links for joining orgs
-- ============================================
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invite details
  invite_code TEXT UNIQUE NOT NULL, -- Short, shareable code
  invite_token TEXT UNIQUE NOT NULL, -- Long, secure token for direct links

  -- Optional: specific email invite
  email TEXT, -- NULL = open invite link, email = direct invite to specific user

  -- Permissions
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),

  -- Limits
  max_uses INTEGER, -- NULL = unlimited
  use_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 4: Organization Activity Log
-- Audit trail for organization actions
-- ============================================
CREATE TABLE IF NOT EXISTS organization_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Activity details
  action TEXT NOT NULL, -- e.g., 'member_added', 'member_removed', 'settings_updated'
  details JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_billing_type ON organizations(billing_type);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);

CREATE INDEX IF NOT EXISTS idx_organization_invites_org_id ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_code ON organization_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON organization_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_organization_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_organization_invites_status ON organization_invites(status);

CREATE INDEX IF NOT EXISTS idx_organization_activity_org_id ON organization_activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_activity_user_id ON organization_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_activity_created_at ON organization_activity_log(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: organizations
-- ============================================
-- Members can view their organizations
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Any authenticated user can create an organization
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only admins and owners can update organization
CREATE POLICY "Admins can update organization" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Only owner can delete organization
CREATE POLICY "Owner can delete organization" ON organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
    )
  );

-- ============================================
-- RLS POLICIES: organization_members
-- ============================================
-- Members can view members of their organizations
CREATE POLICY "Members can view org members" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Admins can add members
CREATE POLICY "Admins can add members" ON organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
    OR
    -- Allow users to add themselves when joining via invite
    (auth.uid() = user_id AND role = 'member')
  );

-- Admins can update members (but not owners unless they are the owner)
CREATE POLICY "Admins can update members" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
    AND (role != 'owner' OR user_id = auth.uid()) -- Can't demote other owners
  );

-- Admins can remove members (except owners)
CREATE POLICY "Admins can remove members" ON organization_members
  FOR DELETE USING (
    (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
      )
      AND role != 'owner' -- Can't remove owners
    )
    OR
    -- Users can remove themselves (leave org)
    (auth.uid() = user_id AND role != 'owner')
  );

-- ============================================
-- RLS POLICIES: organization_invites
-- ============================================
-- Admins can view invites for their orgs
CREATE POLICY "Admins can view invites" ON organization_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

-- Public can view active invites by token (for joining)
CREATE POLICY "Anyone can view invite by token" ON organization_invites
  FOR SELECT USING (
    status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Admins can create invites
CREATE POLICY "Admins can create invites" ON organization_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
    AND auth.uid() = created_by
  );

-- Admins can update invites (e.g., revoke)
CREATE POLICY "Admins can update invites" ON organization_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

-- Admins can delete invites
CREATE POLICY "Admins can delete invites" ON organization_invites
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

-- ============================================
-- RLS POLICIES: organization_activity_log
-- ============================================
-- Members can view activity for their orgs
CREATE POLICY "Members can view activity" ON organization_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- System/admins can insert activity (via service role typically)
CREATE POLICY "Admins can log activity" ON organization_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
    OR auth.uid() = user_id
  );

-- ============================================
-- TRIGGERS: Auto-add creator as owner
-- ============================================
CREATE OR REPLACE FUNCTION add_org_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'owner', 'active')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION add_org_creator_as_owner();

-- ============================================
-- TRIGGERS: Update seat count
-- ============================================
CREATE OR REPLACE FUNCTION update_org_seat_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE organizations
    SET used_seats = used_seats + 1, updated_at = NOW()
    WHERE id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE organizations
    SET used_seats = GREATEST(1, used_seats - 1), updated_at = NOW()
    WHERE id = OLD.organization_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE organizations
      SET used_seats = used_seats + 1, updated_at = NOW()
      WHERE id = NEW.organization_id;
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE organizations
      SET used_seats = GREATEST(1, used_seats - 1), updated_at = NOW()
      WHERE id = NEW.organization_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_org_member_change
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_org_seat_count();

-- ============================================
-- TRIGGERS: Update updated_at
-- ============================================
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_invites_updated_at
  BEFORE UPDATE ON organization_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Generate unique invite code
-- ============================================
CREATE OR REPLACE FUNCTION generate_invite_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars (0,O,1,I)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Generate unique slug from name
-- ============================================
CREATE OR REPLACE FUNCTION generate_org_slug(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- Ensure minimum length
  IF length(base_slug) < 3 THEN
    base_slug := base_slug || '-org';
  END IF;

  -- Check uniqueness and append number if needed
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Check if user is org admin
-- ============================================
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = check_user_id
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check if user is org owner
-- ============================================
CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = check_user_id
    AND role = 'owner'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get user's organizations
-- ============================================
CREATE OR REPLACE FUNCTION get_user_organizations(check_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  organization_logo TEXT,
  user_role TEXT,
  member_count INTEGER,
  billing_type TEXT,
  subscription_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    o.logo_url as organization_logo,
    om.role as user_role,
    o.used_seats as member_count,
    o.billing_type,
    o.subscription_status
  FROM organizations o
  JOIN organization_members om ON om.organization_id = o.id
  WHERE om.user_id = check_user_id
  AND om.status = 'active'
  ORDER BY om.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Add current_organization_id to profiles
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_current_org ON profiles(current_organization_id);
