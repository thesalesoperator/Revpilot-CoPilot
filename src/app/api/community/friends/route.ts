import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Friend, FriendsListResponse, SendFriendRequestRequest, SendFriendRequestResponse, FriendRequest } from '@/types/community'

// GET /api/community/friends - Get friends list
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get friendships with friend profile info
    const { data: friendships, error: friendsError } = await supabase
      .from('friendships')
      .select(`
        id,
        friend_id,
        created_at,
        profiles!friendships_friend_id_fkey (
          id,
          full_name,
          email
        ),
        user_profiles_extended!friendships_friend_id_fkey (
          title,
          avatar_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (friendsError) {
      console.error('Error fetching friends:', friendsError)
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 })
    }

    const friends: Friend[] = (friendships || []).map(f => {
      const profile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
      const extProfile = Array.isArray(f.user_profiles_extended) ? f.user_profiles_extended[0] : f.user_profiles_extended

      return {
        id: f.id,
        user_id: f.friend_id,
        full_name: profile?.full_name || null,
        email: profile?.email || '',
        title: extProfile?.title || 'Sales Professional',
        avatar_url: extProfile?.avatar_url || null,
        status: 'offline' as const, // TODO: Implement real-time presence
        created_at: f.created_at,
      }
    })

    const response: FriendsListResponse = {
      friends,
      total: friends.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/community/friends:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/community/friends - Send friend request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SendFriendRequestRequest = await request.json()

    if (!body.to_user_id) {
      return NextResponse.json({ error: 'to_user_id is required' }, { status: 400 })
    }

    if (body.to_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 })
    }

    // Check if already friends
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', body.to_user_id)
      .single()

    if (existingFriendship) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 })
    }

    // Check if request already exists (in either direction)
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status, from_user_id')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${body.to_user_id}),and(from_user_id.eq.${body.to_user_id},to_user_id.eq.${user.id})`)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      if (existingRequest.from_user_id === body.to_user_id) {
        return NextResponse.json({ error: 'This user already sent you a request. Check your pending requests.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Friend request already sent' }, { status: 400 })
    }

    // Create friend request
    const { data: friendRequest, error: createError } = await supabase
      .from('friend_requests')
      .insert({
        from_user_id: user.id,
        to_user_id: body.to_user_id,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating friend request:', createError)
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 })
    }

    // Get the target user's profile
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', body.to_user_id)
      .single()

    const { data: targetExtProfile } = await supabase
      .from('user_profiles_extended')
      .select('title, avatar_url')
      .eq('user_id', body.to_user_id)
      .single()

    const responseRequest: FriendRequest = {
      id: friendRequest.id,
      from_user_id: friendRequest.from_user_id,
      to_user_id: friendRequest.to_user_id,
      status: friendRequest.status,
      created_at: friendRequest.created_at,
      user: {
        id: body.to_user_id,
        full_name: targetProfile?.full_name || null,
        email: targetProfile?.email || '',
        title: targetExtProfile?.title || 'Sales Professional',
        avatar_url: targetExtProfile?.avatar_url || null,
      },
      mutual_friends_count: 0, // TODO: Calculate mutual friends
    }

    const response: SendFriendRequestResponse = { request: responseRequest }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/community/friends:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
