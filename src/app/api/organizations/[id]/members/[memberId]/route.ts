import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/organizations/[id]/members/[memberId] - Update member role/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const supabase = await createClient()
  const { id, memberId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user is admin/owner
    const { data: userMembership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', user.id)
      .single()

    if (!userMembership || userMembership.status !== 'active' || !['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('organization_id', id)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Can't modify owner unless you are the owner modifying yourself
    if (targetMember.role === 'owner' && targetMember.user_id !== user.id) {
      return NextResponse.json({ error: 'Cannot modify owner' }, { status: 403 })
    }

    const body = await request.json()
    const { role, status } = body
    const updates: Record<string, string> = {}

    // Role changes
    if (role) {
      // Only owner can promote to admin
      if (role === 'admin' && userMembership.role !== 'owner') {
        return NextResponse.json({ error: 'Only owner can promote to admin' }, { status: 403 })
      }
      // Can't change to owner via this endpoint
      if (role === 'owner') {
        return NextResponse.json({ error: 'Use transfer ownership endpoint' }, { status: 400 })
      }
      updates.role = role
    }

    // Status changes (suspend/activate)
    if (status) {
      if (!['active', 'suspended'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = status
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: member, error } = await supabase
      .from('organization_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      console.error('Error updating member:', error)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: id,
      user_id: user.id,
      action: 'member_updated',
      details: { member_id: memberId, updates },
    })

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Error in member PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/organizations/[id]/members/[memberId] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const supabase = await createClient()
  const { id, memberId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get target member first
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('organization_id', id)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if user can remove this member
    const isRemovingSelf = targetMember.user_id === user.id

    if (isRemovingSelf) {
      // Can leave org unless you're the owner
      if (targetMember.role === 'owner') {
        return NextResponse.json({
          error: 'Owner cannot leave. Transfer ownership first.',
        }, { status: 400 })
      }
    } else {
      // Need to be admin/owner to remove others
      const { data: userMembership } = await supabase
        .from('organization_members')
        .select('role, status')
        .eq('organization_id', id)
        .eq('user_id', user.id)
        .single()

      if (!userMembership || userMembership.status !== 'active' || !['owner', 'admin'].includes(userMembership.role)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }

      // Admin can't remove other admins or owner
      if (userMembership.role === 'admin' && ['admin', 'owner'].includes(targetMember.role)) {
        return NextResponse.json({ error: 'Cannot remove admin or owner' }, { status: 403 })
      }

      // Can't remove owner
      if (targetMember.role === 'owner') {
        return NextResponse.json({ error: 'Cannot remove owner' }, { status: 403 })
      }
    }

    // Remove member
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('Error removing member:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: id,
      user_id: user.id,
      action: isRemovingSelf ? 'member_left' : 'member_removed',
      details: { removed_user_id: targetMember.user_id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in member DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
