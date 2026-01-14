import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { JoinLeaveGroupResponse } from '@/types/community'

// POST /api/community/groups/[id]/leave - Leave a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 400 })
    }

    // Check if user is the only admin
    if (membership.role === 'admin') {
      const { data: otherAdmins } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', groupId)
        .eq('role', 'admin')
        .neq('user_id', user.id)

      if (!otherAdmins || otherAdmins.length === 0) {
        // Check if there are other members to promote
        const { data: otherMembers } = await supabase
          .from('group_memberships')
          .select('id')
          .eq('group_id', groupId)
          .neq('user_id', user.id)
          .limit(1)

        if (otherMembers && otherMembers.length > 0) {
          return NextResponse.json({
            error: 'You are the only admin. Please promote another member to admin before leaving.'
          }, { status: 400 })
        }
        // If no other members, we could delete the group, but for now just allow leaving
      }
    }

    // Leave the group
    const { error: leaveError } = await supabase
      .from('group_memberships')
      .delete()
      .eq('id', membership.id)

    if (leaveError) {
      console.error('Error leaving group:', leaveError)
      return NextResponse.json({ error: 'Failed to leave group' }, { status: 500 })
    }

    const response: JoinLeaveGroupResponse = {
      success: true,
      is_member: false,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/community/groups/[id]/leave:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
