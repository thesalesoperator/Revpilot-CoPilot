import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/community/clips/[id]/like - Toggle like on clip
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: clipId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if clip exists and is accessible
    const { data: clip, error: clipError } = await supabase
      .from('call_clips')
      .select('id, user_id, is_shared, like_count')
      .eq('id', clipId)
      .single()

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    // Must be owner or clip must be shared
    if (clip.user_id !== user.id && !clip.is_shared) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('clip_likes')
      .select('id')
      .eq('clip_id', clipId)
      .eq('user_id', user.id)
      .single()

    let liked: boolean
    let newLikeCount: number

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('clip_likes')
        .delete()
        .eq('clip_id', clipId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error unliking clip:', deleteError)
        return NextResponse.json({ error: 'Failed to unlike' }, { status: 500 })
      }
      liked = false
      newLikeCount = Math.max(0, clip.like_count - 1)
    } else {
      // Like
      const { error: insertError } = await supabase
        .from('clip_likes')
        .insert({
          clip_id: clipId,
          user_id: user.id
        })

      if (insertError) {
        console.error('Error liking clip:', insertError)
        return NextResponse.json({ error: 'Failed to like' }, { status: 500 })
      }
      liked = true
      newLikeCount = clip.like_count + 1
    }

    return NextResponse.json({ liked, like_count: newLikeCount })
  } catch (error) {
    console.error('Error in clip like POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
