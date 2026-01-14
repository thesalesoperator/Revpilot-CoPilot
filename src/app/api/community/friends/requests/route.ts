import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FriendRequest, FriendRequestsResponse } from '@/types/community'

// GET /api/community/friends/requests - Get incoming and outgoing friend requests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get incoming requests (requests TO this user)
    const { data: incomingData, error: incomingError } = await supabase
      .from('friend_requests')
      .select(`
        id,
        from_user_id,
        to_user_id,
        status,
        created_at,
        profiles!friend_requests_from_user_id_fkey (
          id,
          full_name,
          email
        ),
        user_profiles_extended!friend_requests_from_user_id_fkey (
          title,
          avatar_url
        )
      `)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (incomingError) {
      console.error('Error fetching incoming requests:', incomingError)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // Get outgoing requests (requests FROM this user)
    const { data: outgoingData, error: outgoingError } = await supabase
      .from('friend_requests')
      .select(`
        id,
        from_user_id,
        to_user_id,
        status,
        created_at,
        profiles!friend_requests_to_user_id_fkey (
          id,
          full_name,
          email
        ),
        user_profiles_extended!friend_requests_to_user_id_fkey (
          title,
          avatar_url
        )
      `)
      .eq('from_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (outgoingError) {
      console.error('Error fetching outgoing requests:', outgoingError)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // Transform incoming requests
    const incoming: FriendRequest[] = (incomingData || []).map(req => {
      const profile = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles
      const extProfile = Array.isArray(req.user_profiles_extended) ? req.user_profiles_extended[0] : req.user_profiles_extended

      return {
        id: req.id,
        from_user_id: req.from_user_id,
        to_user_id: req.to_user_id,
        status: req.status as 'pending',
        created_at: req.created_at,
        user: {
          id: req.from_user_id,
          full_name: profile?.full_name || null,
          email: profile?.email || '',
          title: extProfile?.title || 'Sales Professional',
          avatar_url: extProfile?.avatar_url || null,
        },
        mutual_friends_count: 0, // TODO: Calculate mutual friends
      }
    })

    // Transform outgoing requests
    const outgoing: FriendRequest[] = (outgoingData || []).map(req => {
      const profile = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles
      const extProfile = Array.isArray(req.user_profiles_extended) ? req.user_profiles_extended[0] : req.user_profiles_extended

      return {
        id: req.id,
        from_user_id: req.from_user_id,
        to_user_id: req.to_user_id,
        status: req.status as 'pending',
        created_at: req.created_at,
        user: {
          id: req.to_user_id,
          full_name: profile?.full_name || null,
          email: profile?.email || '',
          title: extProfile?.title || 'Sales Professional',
          avatar_url: extProfile?.avatar_url || null,
        },
        mutual_friends_count: 0,
      }
    })

    const response: FriendRequestsResponse = { incoming, outgoing }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/community/friends/requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
