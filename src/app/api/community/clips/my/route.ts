import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CallClip } from '@/types/community'

// GET /api/community/clips/my - Get current user's clips
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const shared = searchParams.get('shared') // 'true', 'false', or null for all

  try {
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Filter by shared status if specified
    if (shared === 'true') {
      query = query.eq('is_shared', true)
    } else if (shared === 'false') {
      query = query.eq('is_shared', false)
    }

    const { data: clips, error: clipsError } = await query

    if (clipsError) {
      console.error('Error fetching my clips:', clipsError)
      return NextResponse.json({ error: 'Failed to fetch clips' }, { status: 500 })
    }

    // Get user's likes and saves
    const clipIds = clips.map(c => c.id)

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
    const formattedClips: CallClip[] = clips.map(clip => {
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

    return NextResponse.json({ clips: formattedClips })
  } catch (error) {
    console.error('Error in my clips GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
