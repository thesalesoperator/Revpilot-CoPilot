import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SearchUsersResponse } from '@/types/community'

// GET /api/community/users/search - Search users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 })
    }

    const searchTerm = `%${query.trim().toLowerCase()}%`

    // Search in profiles (name and email)
    const { data: profiles, error: searchError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        user_profiles_extended (
          title,
          avatar_url,
          follower_count
        )
      `)
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .neq('id', user.id)
      .limit(limit)

    if (searchError) {
      console.error('Error searching users:', searchError)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    // Get who current user is following
    const userIds = profiles?.map(p => p.id) || []
    const { data: following } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', userIds)

    const followingIds = new Set(following?.map(f => f.following_id) || [])

    const users = (profiles || []).map(profile => {
      // Handle the joined data - Supabase returns array for one-to-many joins
      const extProfile = Array.isArray(profile.user_profiles_extended)
        ? profile.user_profiles_extended[0]
        : profile.user_profiles_extended

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        title: extProfile?.title || 'Sales Professional',
        avatar_url: extProfile?.avatar_url || null,
        follower_count: extProfile?.follower_count || 0,
        is_following: followingIds.has(profile.id),
      }
    })

    const response: SearchUsersResponse = { users }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/community/users/search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
