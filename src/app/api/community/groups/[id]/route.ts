import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CommunityGroup, GroupDetailsResponse, GroupMembership } from '@/types/community'

// GET /api/community/groups/[id] - Get group details
export async function GET(
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

    // Get group
    const { data: group, error: groupError } = await supabase
      .from('community_groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check membership
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    // If private and not a member, deny access
    if (group.is_private && !membership) {
      return NextResponse.json({ error: 'This is a private group' }, { status: 403 })
    }

    // Get members (limited to first 20)
    const { data: membersData } = await supabase
      .from('group_memberships')
      .select(`
        id,
        group_id,
        user_id,
        role,
        joined_at,
        profiles!group_memberships_user_id_fkey (
          id,
          full_name,
          email
        ),
        user_profiles_extended!group_memberships_user_id_fkey (
          title,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })
      .limit(20)

    const members: GroupMembership[] = (membersData || []).map(m => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      const extProfile = Array.isArray(m.user_profiles_extended) ? m.user_profiles_extended[0] : m.user_profiles_extended

      return {
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        role: m.role as 'admin' | 'moderator' | 'member',
        joined_at: m.joined_at,
        user: {
          id: m.user_id,
          full_name: profile?.full_name || null,
          email: profile?.email || '',
          title: extProfile?.title || 'Sales Professional',
          avatar_url: extProfile?.avatar_url || null,
        },
      }
    })

    const groupResponse: CommunityGroup = {
      ...group,
      is_member: !!membership,
      is_admin: membership?.role === 'admin',
    }

    const response: GroupDetailsResponse = {
      group: groupResponse,
      members,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/community/groups/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
