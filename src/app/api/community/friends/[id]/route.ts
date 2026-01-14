import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RemoveFriendResponse } from '@/types/community'

// DELETE /api/community/friends/[id] - Remove a friend
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: friendId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if friendship exists
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .single()

    if (friendshipError || !friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 })
    }

    // Delete the friendship (trigger will handle the reverse and cleanup)
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendship.id)

    if (deleteError) {
      console.error('Error removing friend:', deleteError)
      return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 })
    }

    const response: RemoveFriendResponse = { success: true }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in DELETE /api/community/friends/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
