import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/organizations/join?code=XXX - Get invite details (for preview)
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const token = searchParams.get('token')

  if (!code && !token) {
    return NextResponse.json({ error: 'Invite code or token required' }, { status: 400 })
  }

  try {
    // Find the invite
    let query = supabase
      .from('organization_invites')
      .select(`
        id,
        organization_id,
        email,
        role,
        max_uses,
        use_count,
        expires_at,
        status,
        organizations (
          id,
          name,
          slug,
          logo_url,
          description
        )
      `)

    if (code) {
      query = query.eq('invite_code', code.toUpperCase())
    } else if (token) {
      query = query.eq('invite_token', token)
    }

    const { data: invite, error } = await query.single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check if invite is valid
    if (invite.status !== 'active') {
      return NextResponse.json({
        error: invite.status === 'revoked' ? 'This invite has been revoked' : 'This invite is no longer valid',
      }, { status: 400 })
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
    }

    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return NextResponse.json({ error: 'This invite has reached its usage limit' }, { status: 400 })
    }

    // Check if this is a private invite (email-specific)
    const { data: { user } } = await supabase.auth.getUser()

    if (invite.email && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (profile?.email?.toLowerCase() !== invite.email.toLowerCase()) {
        return NextResponse.json({
          error: 'This invite is for a specific email address',
        }, { status: 403 })
      }
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        role: invite.role,
        is_private: !!invite.email,
      },
      organization: invite.organizations,
      requires_login: !user,
    })
  } catch (error) {
    console.error('Error in join GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/organizations/join - Accept an invite
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'You must be logged in to join an organization' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { code, token } = body

    if (!code && !token) {
      return NextResponse.json({ error: 'Invite code or token required' }, { status: 400 })
    }

    // Find the invite
    let query = supabase
      .from('organization_invites')
      .select('*')

    if (code) {
      query = query.eq('invite_code', code.toUpperCase())
    } else if (token) {
      query = query.eq('invite_token', token)
    }

    const { data: invite, error } = await query.single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Validate invite
    if (invite.status !== 'active') {
      return NextResponse.json({
        error: invite.status === 'revoked' ? 'This invite has been revoked' : 'This invite is no longer valid',
      }, { status: 400 })
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('organization_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
    }

    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return NextResponse.json({ error: 'This invite has reached its usage limit' }, { status: 400 })
    }

    // Check if email-specific invite
    if (invite.email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (profile?.email?.toLowerCase() !== invite.email.toLowerCase()) {
        return NextResponse.json({
          error: 'This invite is for a different email address',
        }, { status: 403 })
      }
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json({ error: 'You are already a member of this organization' }, { status: 400 })
      }

      // Reactivate suspended member
      await supabase
        .from('organization_members')
        .update({
          status: 'active',
          role: invite.role,
          joined_at: new Date().toISOString(),
        })
        .eq('id', existingMember.id)
    } else {
      // Check seat limit
      const { data: org } = await supabase
        .from('organizations')
        .select('max_seats, used_seats, billing_type')
        .eq('id', invite.organization_id)
        .single()

      if (org && org.billing_type === 'org_pays' && org.used_seats >= org.max_seats) {
        return NextResponse.json({
          error: 'This organization has reached its member limit',
        }, { status: 400 })
      }

      // Add as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invite.organization_id,
          user_id: user.id,
          role: invite.role,
          status: 'active',
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        })

      if (memberError) {
        console.error('Error adding member:', memberError)
        return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 })
      }
    }

    // Increment invite use count
    await supabase
      .from('organization_invites')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id)

    // Get organization details for response
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', invite.organization_id)
      .single()

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      action: 'member_joined_via_invite',
      details: { invite_id: invite.id, role: invite.role },
    })

    return NextResponse.json({
      success: true,
      organization,
      role: invite.role,
    })
  } catch (error) {
    console.error('Error in join POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
