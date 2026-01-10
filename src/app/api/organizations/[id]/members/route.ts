import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/organizations/[id]/members - List organization members
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
    // Check if user is a member
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    // Get all members with profile info
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        status,
        subscription_status,
        invited_at,
        joined_at,
        profiles!organization_members_user_id_fkey (
          email,
          full_name
        ),
        user_profiles_extended (
          avatar_url,
          display_name
        )
      `)
      .eq('organization_id', id)
      .order('role', { ascending: true })
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Format the response
    const formattedMembers = members?.map(m => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      subscription_status: m.subscription_status,
      invited_at: m.invited_at,
      joined_at: m.joined_at,
      email: (m.profiles as { email?: string })?.email || '',
      full_name: (m.profiles as { full_name?: string })?.full_name || null,
      avatar_url: (m.user_profiles_extended as { avatar_url?: string })?.avatar_url || null,
      display_name: (m.user_profiles_extended as { display_name?: string })?.display_name || null,
    })) || []

    return NextResponse.json({
      members: formattedMembers,
      user_role: membership.role,
    })
  } catch (error) {
    console.error('Error in members GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/organizations/[id]/members - Add a member (for direct add, not via invite)
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
    const { email, role = 'member' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Only owner can add admins
    if (role === 'admin' && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can add admins' }, { status: 403 })
    }

    // Can't add as owner
    if (role === 'owner') {
      return NextResponse.json({ error: 'Cannot add user as owner' }, { status: 400 })
    }

    // Find user by email
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found. They must have an account first.' }, { status: 404 })
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', id)
      .eq('user_id', targetProfile.id)
      .single()

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
      }
      // Reactivate if suspended/pending
      const { data: member, error } = await supabase
        .from('organization_members')
        .update({ status: 'active', role })
        .eq('id', existingMember.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
      }

      return NextResponse.json({ member })
    }

    // Check seat limit
    const { data: org } = await supabase
      .from('organizations')
      .select('max_seats, used_seats, billing_type')
      .eq('id', id)
      .single()

    if (org && org.billing_type === 'org_pays' && org.used_seats >= org.max_seats) {
      return NextResponse.json({
        error: 'Seat limit reached. Upgrade to add more members.',
      }, { status: 400 })
    }

    // Add member
    const { data: member, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: id,
        user_id: targetProfile.id,
        role,
        status: 'active',
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding member:', error)
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: id,
      user_id: user.id,
      action: 'member_added',
      details: { added_user_id: targetProfile.id, email, role },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Error in members POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
