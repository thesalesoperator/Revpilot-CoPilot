import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { LikeResponse } from '@/types/community'

// POST /api/community/posts/[id]/like - Toggle like
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('id, like_count')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single()

    let liked: boolean
    let newLikeCount: number

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('id', existingLike.id)

      if (deleteError) {
        console.error('Error removing like:', deleteError)
        return NextResponse.json({ error: 'Failed to unlike' }, { status: 500 })
      }

      liked = false
      newLikeCount = Math.max(0, post.like_count - 1)
    } else {
      // Like
      const { error: insertError } = await supabase
        .from('post_likes')
        .insert({
          user_id: user.id,
          post_id: postId,
        })

      if (insertError) {
        console.error('Error adding like:', insertError)
        return NextResponse.json({ error: 'Failed to like' }, { status: 500 })
      }

      liked = true
      newLikeCount = post.like_count + 1
    }

    const response: LikeResponse = {
      liked,
      like_count: newLikeCount,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/community/posts/[id]/like:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
