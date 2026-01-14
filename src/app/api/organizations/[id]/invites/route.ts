import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

// Generate random code (similar to the SQL function)
function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars
  let result = ''
  const randomValues = randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

// GET /api/organizations/[id]/invites - List organization invites
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user is admin/owner
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get invites
    const { data: invites, error } = await supabase
      .from('organization_invites')
      .select(`
        *,
        profiles!organization_invites_created_by_fkey (
          full_name,
          email
        )
      `)
      .eq('organization_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invites:', error)
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
    }

    // Mark expired invites
    const now = new Date()
    const formattedInvites = invites?.map(invite => ({
      ...invite,
      is_expired: invite.expires_at ? new Date(invite.expires_at) < now : false,
      created_by_name: (invite.profiles as { full_name?: string })?.full_name || 'Unknown',
    })) || []

    return NextResponse.json({ invites: formattedInvites })
  } catch (error) {
    console.error('Error in invites GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/organizations/[id]/invites - Create an invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user is admin/owner
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      email = null,
      role = 'member',
      max_uses = null,
      expires_in_days = null, // null = never expires
    } = body

    // Only owner can create admin invites
    if (role === 'admin' && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can create admin invites' }, { status: 403 })
    }

    // Generate unique invite code and token
    let inviteCode = generateInviteCode()
    let attempts = 0

    // Ensure code is unique
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('organization_invites')
        .select('id')
        .eq('invite_code', inviteCode)
        .single()

      if (!existing) break
      inviteCode = generateInviteCode()
      attempts++
    }

    const inviteToken = randomBytes(32).toString('hex')

    // Calculate expiration
    let expiresAt = null
    if (expires_in_days) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expires_in_days)
    }

    // Create invite
    const { data: invite, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: id,
        invite_code: inviteCode,
        invite_token: inviteToken,
        email: email?.toLowerCase() || null,
        role,
        max_uses,
        expires_at: expiresAt?.toISOString() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invite:', error)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Get the base URL for the invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.revpilot.io'
    const inviteUrl = `${baseUrl}/join/${invite.invite_code}`

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: id,
      user_id: user.id,
      action: 'invite_created',
      details: { invite_id: invite.id, role, email: email || 'open' },
    })

    return NextResponse.json({
      invite,
      invite_url: inviteUrl,
    }, { status: 201 })
  } catch (error) {
    console.error('Error in invites POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
