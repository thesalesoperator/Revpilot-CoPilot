import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SaveResponse } from '@/types/community'

// POST /api/community/posts/[id]/save - Toggle save
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
      .select('id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('post_saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single()

    let saved: boolean

    if (existingSave) {
      // Unsave
      const { error: deleteError } = await supabase
        .from('post_saves')
        .delete()
        .eq('id', existingSave.id)

      if (deleteError) {
        console.error('Error removing save:', deleteError)
        return NextResponse.json({ error: 'Failed to unsave' }, { status: 500 })
      }

      saved = false
    } else {
      // Save
      const { error: insertError } = await supabase
        .from('post_saves')
        .insert({
          user_id: user.id,
          post_id: postId,
        })

      if (insertError) {
        console.error('Error adding save:', insertError)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }

      saved = true
    }

    const response: SaveResponse = { saved }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/community/posts/[id]/save:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
