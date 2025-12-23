import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ToggleFollowRequest, FollowResponse } from '@/types/community'

// POST /api/community/follow - Toggle follow
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ToggleFollowRequest = await request.json()

    if (!body.user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Can't follow yourself
    if (body.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Check if target user exists
    const { data: targetProfile, error: profileError } = await supabase
      .from('user_profiles_extended')
      .select('user_id, follower_count')
      .eq('user_id', body.user_id)
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', body.user_id)
      .single()

    let following: boolean
    let newFollowerCount: number

    if (existingFollow) {
      // Unfollow
      const { error: deleteError } = await supabase
        .from('user_follows')
        .delete()
        .eq('id', existingFollow.id)

      if (deleteError) {
        console.error('Error removing follow:', deleteError)
        return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 })
      }

      following = false
      newFollowerCount = Math.max(0, targetProfile.follower_count - 1)
    } else {
      // Follow
      const { error: insertError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: body.user_id,
        })

      if (insertError) {
        console.error('Error adding follow:', insertError)
        return NextResponse.json({ error: 'Failed to follow' }, { status: 500 })
      }

      following = true
      newFollowerCount = targetProfile.follower_count + 1
    }

    const response: FollowResponse = {
      following,
      follower_count: newFollowerCount,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/community/follow:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
