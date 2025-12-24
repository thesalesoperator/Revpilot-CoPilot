import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateClipRequest, CallClip } from '@/types/community'

// GET /api/community/clips - List shared clips (community feed)
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '20')
  const cursor = searchParams.get('cursor')

  try {
    // Build query for shared clips
    let query = supabase
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
      .eq('is_shared', true)
      .order('shared_at', { ascending: false })
      .limit(limit + 1)

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Cursor-based pagination
    if (cursor) {
      query = query.lt('shared_at', cursor)
    }

    const { data: clips, error: clipsError } = await query

    if (clipsError) {
      console.error('Error fetching clips:', clipsError)
      return NextResponse.json({ error: 'Failed to fetch clips' }, { status: 500 })
    }

    // Check if there are more clips
    const hasMore = clips.length > limit
    const clipsToReturn = hasMore ? clips.slice(0, limit) : clips

    // Get user's likes and saves for these clips
    const clipIds = clipsToReturn.map(c => c.id)

    const [likesResult, savesResult] = await Promise.all([
      supabase
        .from('clip_likes')
        .select('clip_id')
        .eq('user_id', user.id)
        .in('clip_id', clipIds),
      supabase
        .from('clip_saves')
        .select('clip_id')
        .eq('user_id', user.id)
        .in('clip_id', clipIds)
    ])

    const likedClipIds = new Set((likesResult.data || []).map(l => l.clip_id))
    const savedClipIds = new Set((savesResult.data || []).map(s => s.clip_id))

    // Format response
    const formattedClips: CallClip[] = clipsToReturn.map(clip => {
      const profile = Array.isArray(clip.profiles) ? clip.profiles[0] : clip.profiles
      const callRecording = Array.isArray(clip.call_recordings) ? clip.call_recordings[0] : clip.call_recordings

      return {
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
        is_liked: likedClipIds.has(clip.id),
        is_saved: savedClipIds.has(clip.id)
      }
    })

    return NextResponse.json({
      clips: formattedClips,
      hasMore,
      nextCursor: hasMore ? clipsToReturn[clipsToReturn.length - 1].shared_at : undefined
    })
  } catch (error) {
    console.error('Error in clips GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/community/clips - Create a new clip
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: CreateClipRequest = await request.json()

    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!body.transcript_excerpt?.trim()) {
      return NextResponse.json({ error: 'Transcript excerpt is required' }, { status: 400 })
    }

    // If call_recording_id provided, verify ownership
    if (body.call_recording_id) {
      const { data: recording, error: recError } = await supabase
        .from('call_recordings')
        .select('id, user_id')
        .eq('id', body.call_recording_id)
        .single()

      if (recError || !recording) {
        return NextResponse.json({ error: 'Call recording not found' }, { status: 404 })
      }
      if (recording.user_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized to clip this recording' }, { status: 403 })
      }
    }

    // Create the clip
    const { data: clip, error: createError } = await supabase
      .from('call_clips')
      .insert({
        user_id: user.id,
        call_recording_id: body.call_recording_id || null,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        transcript_excerpt: body.transcript_excerpt.trim(),
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        category: body.category || null,
        tags: body.tags || [],
        is_shared: body.is_shared || false,
        shared_at: body.is_shared ? new Date().toISOString() : null
      })
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

    if (createError) {
      console.error('Error creating clip:', createError)
      return NextResponse.json({ error: 'Failed to create clip' }, { status: 500 })
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
    console.error('Error in clips POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
