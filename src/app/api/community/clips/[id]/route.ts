import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateClipRequest, CallClip } from '@/types/community'

// GET /api/community/clips/[id] - Get clip details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch clip with author and call info
    const { data: clip, error: clipError } = await supabase
      .from('call_clips')
      .select(`
        *,
        profiles!call_clips_user_id_fkey (
          id,
          full_name,
          email,
          title,
          avatar_url
        ),
        call_recordings (
          title
        )
      `)
      .eq('id', id)
      .single()

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    // Check access: must be owner or clip must be shared
    if (clip.user_id !== user.id && !clip.is_shared) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Increment view count if not owner
    if (clip.user_id !== user.id) {
      await supabase
        .from('call_clips')
        .update({ view_count: clip.view_count + 1 })
        .eq('id', id)
    }

    // Check if user liked/saved
    const [likeResult, saveResult] = await Promise.all([
      supabase
        .from('clip_likes')
        .select('id')
        .eq('clip_id', id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('clip_saves')
        .select('id')
        .eq('clip_id', id)
        .eq('user_id', user.id)
        .single()
    ])

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
      .eq('clip_id', id)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
    }

    const profile = Array.isArray(clip.profiles) ? clip.profiles[0] : clip.profiles
    const callRecording = Array.isArray(clip.call_recordings) ? clip.call_recordings[0] : clip.call_recordings

    const formattedClip: CallClip = {
      id: clip.id,
      user_id: clip.user_id,
      call_recording_id: clip.call_recording_id,
      title: clip.title,
      description: clip.description,
      transcript_excerpt: clip.transcript_excerpt,
      start_time: clip.start_time,
      end_time: clip.end_time,
      category: clip.category,
      tags: clip.tags || [],
      is_shared: clip.is_shared,
      shared_at: clip.shared_at,
      view_count: clip.view_count + (clip.user_id !== user.id ? 1 : 0),
      like_count: clip.like_count,
      comment_count: clip.comment_count,
      save_count: clip.save_count,
      created_at: clip.created_at,
      updated_at: clip.updated_at,
      author: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        title: profile.title || 'Sales Rep',
        avatar_url: profile.avatar_url
      } : {
        id: clip.user_id,
        full_name: null,
        email: 'Unknown',
        title: 'Sales Rep',
        avatar_url: null
      },
      call_title: callRecording?.title,
      is_liked: !!likeResult.data,
      is_saved: !!saveResult.data
    }

    const formattedComments = (comments || []).map(comment => {
      const commentProfile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
      return {
        id: comment.id,
        clip_id: comment.clip_id,
        user_id: comment.user_id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        author: commentProfile ? {
          id: commentProfile.id,
          full_name: commentProfile.full_name,
          email: commentProfile.email,
          title: commentProfile.title || 'Sales Rep',
          avatar_url: commentProfile.avatar_url
        } : {
          id: comment.user_id,
          full_name: null,
          email: 'Unknown',
          title: 'Sales Rep',
          avatar_url: null
        }
      }
    })

    return NextResponse.json({ clip: formattedClip, comments: formattedComments })
  } catch (error) {
    console.error('Error in clip GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/community/clips/[id] - Update clip
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify ownership
    const { data: existing, error: existError } = await supabase
      .from('call_clips')
      .select('id, user_id, is_shared')
      .eq('id', id)
      .single()

    if (existError || !existing) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body: UpdateClipRequest = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.category !== undefined) updateData.category = body.category
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.is_shared !== undefined) {
      updateData.is_shared = body.is_shared
      // Set shared_at when first sharing
      if (body.is_shared && !existing.is_shared) {
        updateData.shared_at = new Date().toISOString()
      }
    }

    const { data: clip, error: updateError } = await supabase
      .from('call_clips')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        profiles!call_clips_user_id_fkey (
          id,
          full_name,
          email,
          title,
          avatar_url
        ),
        call_recordings (
          title
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating clip:', updateError)
      return NextResponse.json({ error: 'Failed to update clip' }, { status: 500 })
    }

    const profile = Array.isArray(clip.profiles) ? clip.profiles[0] : clip.profiles
    const callRecording = Array.isArray(clip.call_recordings) ? clip.call_recordings[0] : clip.call_recordings

    const formattedClip: CallClip = {
      id: clip.id,
      user_id: clip.user_id,
      call_recording_id: clip.call_recording_id,
      title: clip.title,
      description: clip.description,
      transcript_excerpt: clip.transcript_excerpt,
      start_time: clip.start_time,
      end_time: clip.end_time,
      category: clip.category,
      tags: clip.tags || [],
      is_shared: clip.is_shared,
      shared_at: clip.shared_at,
      view_count: clip.view_count,
      like_count: clip.like_count,
      comment_count: clip.comment_count,
      save_count: clip.save_count,
      created_at: clip.created_at,
      updated_at: clip.updated_at,
      author: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        title: profile.title || 'Sales Rep',
        avatar_url: profile.avatar_url
      } : {
        id: clip.user_id,
        full_name: null,
        email: 'Unknown',
        title: 'Sales Rep',
        avatar_url: null
      },
      call_title: callRecording?.title,
      is_liked: false,
      is_saved: false
    }

    return NextResponse.json({ clip: formattedClip })
  } catch (error) {
    console.error('Error in clip PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/community/clips/[id] - Delete clip
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify ownership
    const { data: existing, error: existError } = await supabase
      .from('call_clips')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (existError || !existing) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('call_clips')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting clip:', deleteError)
      return NextResponse.json({ error: 'Failed to delete clip' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in clip DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
