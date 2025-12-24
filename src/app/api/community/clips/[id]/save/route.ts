import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/community/clips/[id]/save - Toggle save/bookmark on clip
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

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('clip_saves')
      .select('id')
      .eq('clip_id', clipId)
      .eq('user_id', user.id)
      .single()

    let saved: boolean

    if (existingSave) {
      // Unsave
      const { error: deleteError } = await supabase
        .from('clip_saves')
        .delete()
        .eq('clip_id', clipId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error unsaving clip:', deleteError)
        return NextResponse.json({ error: 'Failed to unsave' }, { status: 500 })
      }
      saved = false
    } else {
      // Save
      const { error: insertError } = await supabase
        .from('clip_saves')
        .insert({
          clip_id: clipId,
          user_id: user.id
        })

      if (insertError) {
        console.error('Error saving clip:', insertError)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
      saved = true
    }

    return NextResponse.json({ saved })
  } catch (error) {
    console.error('Error in clip save POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
