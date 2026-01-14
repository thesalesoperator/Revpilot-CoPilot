import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CORS_HEADERS } from '@/lib/coaching/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// PUT - Update keyword
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const body = await request.json()
    const { keyword, video_title, video_url, description, highlight_color, is_active } = body

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (keyword !== undefined) updates.keyword = keyword.trim()
    if (video_title !== undefined) updates.video_title = video_title.trim()
    if (video_url !== undefined) updates.video_url = video_url.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (highlight_color !== undefined) updates.highlight_color = highlight_color
    if (is_active !== undefined) updates.is_active = is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Update keyword (only if owned by user)
    const { data, error } = await supabase
      .from('close_keywords')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Keyword not found' },
          { status: 404, headers: CORS_HEADERS }
        )
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Keyword already exists' },
          { status: 409, headers: CORS_HEADERS }
        )
      }
      console.error('[Close Keywords] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update keyword' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({ keyword: data }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('[Close Keywords] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// DELETE - Delete keyword
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Delete keyword (only if owned by user)
    const { error } = await supabase
      .from('close_keywords')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[Close Keywords] Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete keyword' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('[Close Keywords] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
