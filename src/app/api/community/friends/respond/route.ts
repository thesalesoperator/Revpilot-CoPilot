import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RespondFriendRequestRequest, RespondFriendRequestResponse, Friend } from '@/types/community'

// POST /api/community/friends/respond - Accept or decline a friend request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RespondFriendRequestRequest = await request.json()

    if (!body.request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    if (!body.action || !['accept', 'decline'].includes(body.action)) {
      return NextResponse.json({ error: 'action must be "accept" or "decline"' }, { status: 400 })
    }

    // Get the friend request
    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', body.request_id)
      .eq('to_user_id', user.id) // Only the recipient can respond
      .eq('status', 'pending')
      .single()

    if (requestError || !friendRequest) {
      return NextResponse.json({ error: 'Friend request not found or already processed' }, { status: 404 })
    }

    const newStatus = body.action === 'accept' ? 'accepted' : 'declined'

    // Update the request status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: newStatus })
      .eq('id', body.request_id)

    if (updateError) {
      console.error('Error updating friend request:', updateError)
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
    }

    let friendship: Friend | undefined

    if (body.action === 'accept') {
      // Get the new friend's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', friendRequest.from_user_id)
        .single()

      const { data: extProfile } = await supabase
        .from('user_profiles_extended')
        .select('title, avatar_url')
        .eq('user_id', friendRequest.from_user_id)
        .single()

      // Get the friendship record (created by trigger)
      const { data: friendshipData } = await supabase
        .from('friendships')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('friend_id', friendRequest.from_user_id)
        .single()

      friendship = {
        id: friendshipData?.id || '',
        user_id: friendRequest.from_user_id,
        full_name: profile?.full_name || null,
        email: profile?.email || '',
        title: extProfile?.title || 'Sales Professional',
        avatar_url: extProfile?.avatar_url || null,
        status: 'offline' as const,
        created_at: friendshipData?.created_at || new Date().toISOString(),
      }
    }

    const response: RespondFriendRequestResponse = {
      success: true,
      friendship,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/community/friends/respond:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
