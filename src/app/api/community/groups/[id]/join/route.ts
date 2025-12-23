import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { JoinLeaveGroupResponse } from '@/types/community'

// POST /api/community/groups/[id]/join - Join a group
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

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('community_groups')
      .select('id, is_private')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // For private groups, we could add an invite system later
    // For now, just prevent joining private groups
    if (group.is_private) {
      return NextResponse.json({ error: 'This is a private group' }, { status: 403 })
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (existingMembership) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 })
    }

    // Join the group
    const { error: joinError } = await supabase
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member',
      })

    if (joinError) {
      console.error('Error joining group:', joinError)
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 })
    }

    const response: JoinLeaveGroupResponse = {
      success: true,
      is_member: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/community/groups/[id]/join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
