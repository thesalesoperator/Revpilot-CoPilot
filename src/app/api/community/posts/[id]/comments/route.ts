import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateCommentRequest, PostComment, CommentsResponse } from '@/types/community'

// GET /api/community/posts/[id]/comments - Get comments
export async function GET(
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get comments with author info
    const { data: commentsData, error: commentsError } = await supabase
      .from('post_comments')
      .select(`
        *,
        profiles!post_comments_user_id_fkey (
          id,
          full_name,
          email
        ),
        user_profiles_extended!post_comments_user_id_fkey (
          title,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(limit + 1)

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    const hasMore = commentsData && commentsData.length > limit
    const comments = hasMore ? commentsData.slice(0, limit) : (commentsData || [])

    const transformedComments: PostComment[] = comments.map(comment => {
      // Handle joined data - may be array or object depending on relationship
      const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
      const extProfile = Array.isArray(comment.user_profiles_extended) ? comment.user_profiles_extended[0] : comment.user_profiles_extended

      return {
        id: comment.id,
        user_id: comment.user_id,
        post_id: comment.post_id,
        content: comment.content,
        created_at: comment.created_at,
        author: {
          id: comment.user_id,
          full_name: profile?.full_name || null,
          email: profile?.email || '',
          title: extProfile?.title || 'Sales Professional',
          avatar_url: extProfile?.avatar_url || null,
        },
      }
    })

    const response: CommentsResponse = {
      comments: transformedComments,
      hasMore,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/community/posts/[id]/comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/community/posts/[id]/comments - Add comment
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

    const body: CreateCommentRequest = await request.json()

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Check if post exists and get current comment count
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('id, comment_count')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('post_comments')
      .insert({
        user_id: user.id,
        post_id: postId,
        content: body.content.trim(),
      })
      .select()
      .single()

    if (commentError) {
      console.error('Error creating comment:', commentError)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Increment the post's comment_count
    await supabase
      .from('community_posts')
      .update({ comment_count: (post.comment_count || 0) + 1 })
      .eq('id', postId)

    // Get author info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const { data: extProfile } = await supabase
      .from('user_profiles_extended')
      .select('title, avatar_url')
      .eq('user_id', user.id)
      .single()

    const newComment: PostComment = {
      ...comment,
      author: {
        id: user.id,
        full_name: profile?.full_name || null,
        email: profile?.email || user.email || '',
        title: extProfile?.title || 'Sales Professional',
        avatar_url: extProfile?.avatar_url || null,
      },
    }

    return NextResponse.json({ comment: newComment }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/community/posts/[id]/comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
