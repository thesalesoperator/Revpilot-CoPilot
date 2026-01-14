import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CommunityGroup, MyGroupsResponse } from '@/types/community'

// GET /api/community/groups/my - List groups the user is a member of
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's memberships with group data
    const { data: memberships, error: membershipsError } = await supabase
      .from('group_memberships')
      .select(`
        group_id,
        role,
        joined_at,
        community_groups (*)
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (membershipsError) {
      console.error('Error fetching memberships:', membershipsError)
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
    }

    const groups: CommunityGroup[] = (memberships || []).map(m => {
      const group = Array.isArray(m.community_groups) ? m.community_groups[0] : m.community_groups

      return {
        id: group?.id || '',
        name: group?.name || '',
        description: group?.description || null,
        avatar_url: group?.avatar_url || null,
        cover_url: group?.cover_url || null,
        creator_id: group?.creator_id || '',
        is_private: group?.is_private || false,
        member_count: group?.member_count || 0,
        post_count: group?.post_count || 0,
        created_at: group?.created_at || '',
        updated_at: group?.updated_at || '',
        is_member: true,
        is_admin: m.role === 'admin',
      }
    }).filter(g => g.id) // Filter out any nulls

    const response: MyGroupsResponse = { groups }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/community/groups/my:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
