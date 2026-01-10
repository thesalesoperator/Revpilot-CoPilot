import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateClipCommentRequest, ClipComment } from '@/types/community'

// GET /api/community/clips/[id]/comments - Get comments for a clip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: clipId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    // Check if clip exists and is accessible
    const { data: clip, error: clipError } = await supabase
      .from('call_clips')
      .select('id, user_id, is_shared')
      .eq('id', clipId)
      .single()

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    // Must be owner or clip must be shared
    if (clip.user_id !== user.id && !clip.is_shared) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch comments
    const { data: comments, error: commentsError } = await supabase
      .from('clip_comments')
      .select(`
        *,
        profiles!clip_comments_user_id_fkey (
          id,
          full_name,
          email,
          title,
          avatar_url
        )
      `)
      .eq('clip_id', clipId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit)

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    const formattedComments: ClipComment[] = comments.map(comment => {
      const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
      return {
        id: comment.id,
        clip_id: comment.clip_id,
        user_id: comment.user_id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        author: profile ? {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          title: profile.title || 'Sales Rep',
          avatar_url: profile.avatar_url
        } : {
          id: comment.user_id,
          full_name: null,
          email: 'Unknown',
          title: 'Sales Rep',
          avatar_url: null
        }
      }
    })

    return NextResponse.json({
      comments: formattedComments,
      hasMore: comments.length === limit
    })
  } catch (error) {
    console.error('Error in clip comments GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/community/clips/[id]/comments - Add a comment to a clip
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
      .select('id, user_id, is_shared, comment_count')
      .eq('id', clipId)
      .single()

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    // Must be owner or clip must be shared to comment
    if (clip.user_id !== user.id && !clip.is_shared) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body: CreateClipCommentRequest = await request.json()

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // Create comment
    const { data: comment, error: createError } = await supabase
      .from('clip_comments')
      .insert({
        clip_id: clipId,
        user_id: user.id,
        content: body.content.trim()
      })
      .select(`
        *,
        profiles!clip_comments_user_id_fkey (
          id,
          full_name,
          email,
          title,
          avatar_url
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating comment:', createError)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Increment the clip's comment_count
    await supabase
      .from('call_clips')
      .update({ comment_count: (clip.comment_count || 0) + 1 })
      .eq('id', clipId)

    const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles

    const formattedComment: ClipComment = {
      id: comment.id,
      clip_id: comment.clip_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        title: profile.title || 'Sales Rep',
        avatar_url: profile.avatar_url
      } : {
        id: comment.user_id,
        full_name: null,
        email: 'Unknown',
        title: 'Sales Rep',
        avatar_url: null
      }
    }

    return NextResponse.json({ comment: formattedComment })
  } catch (error) {
    console.error('Error in clip comment POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
