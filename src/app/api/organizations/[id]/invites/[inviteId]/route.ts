import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/organizations/[id]/invites/[inviteId] - Revoke/delete invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const supabase = await createClient()
  const { id, inviteId } = await params

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

    // Update invite status to revoked
    const { error } = await supabase
      .from('organization_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .eq('organization_id', id)

    if (error) {
      console.error('Error revoking invite:', error)
      return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 })
    }

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: id,
      user_id: user.id,
      action: 'invite_revoked',
      details: { invite_id: inviteId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in invite DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
