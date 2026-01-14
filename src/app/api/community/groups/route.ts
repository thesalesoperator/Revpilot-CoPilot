import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateGroupRequest, CommunityGroup, GroupsListResponse, CreateGroupResponse } from '@/types/community'

// GET /api/community/groups - List all public groups (discover)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get all public groups
    let groupsQuery = supabase
      .from('community_groups')
      .select('*')
      .eq('is_private', false)
      .order('member_count', { ascending: false })
      .limit(limit)

    if (query) {
      groupsQuery = groupsQuery.ilike('name', `%${query}%`)
    }

    const { data: groupsData, error: groupsError } = await groupsQuery

    if (groupsError) {
      console.error('Error fetching groups:', groupsError)
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
    }

    // Get user's memberships
    const groupIds = (groupsData || []).map(g => g.id)
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('group_id, role')
      .eq('user_id', user.id)
      .in('group_id', groupIds)

    const membershipMap = new Map(memberships?.map(m => [m.group_id, m.role]) || [])

    const groups: CommunityGroup[] = (groupsData || []).map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      avatar_url: group.avatar_url,
      cover_url: group.cover_url,
      creator_id: group.creator_id,
      is_private: group.is_private,
      member_count: group.member_count,
      post_count: group.post_count,
      created_at: group.created_at,
      updated_at: group.updated_at,
      is_member: membershipMap.has(group.id),
      is_admin: membershipMap.get(group.id) === 'admin',
    }))

    const response: GroupsListResponse = {
      groups,
      hasMore: groups.length === limit,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/community/groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/community/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateGroupRequest = await request.json()

    if (!body.name || body.name.trim().length < 3) {
      return NextResponse.json({ error: 'Group name must be at least 3 characters' }, { status: 400 })
    }

    // Create the group
    const { data: group, error: createError } = await supabase
      .from('community_groups')
      .insert({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        creator_id: user.id,
        is_private: body.is_private || false,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating group:', createError)
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    const newGroup: CommunityGroup = {
      ...group,
      is_member: true,
      is_admin: true,
    }

    const response: CreateGroupResponse = { group: newGroup }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/community/groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
