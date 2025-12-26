import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CORS_HEADERS } from '@/lib/coaching/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// GET - Fetch user's keywords (optionally filtered by organization)
export async function GET(request: Request) {
  try {
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

    // Check for organization_id filter
    const url = new URL(request.url)
    const organizationId = url.searchParams.get('organization_id')

    let keywords: unknown[] = []

    if (organizationId) {
      // Verify user is a member of this organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: 'Not a member of this organization' },
          { status: 403, headers: CORS_HEADERS }
        )
      }

      // Fetch org keywords + user's personal keywords
      const { data, error } = await supabase
        .from('close_keywords')
        .select('*')
        .eq('is_active', true)
        .or(`organization_id.eq.${organizationId},and(user_id.eq.${user.id},organization_id.is.null)`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Close Keywords] Fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch keywords' },
          { status: 500, headers: CORS_HEADERS }
        )
      }
      keywords = data || []
    } else {
      // No org selected - only fetch user's personal keywords (no org)
      const { data, error } = await supabase
        .from('close_keywords')
        .select('*')
        .eq('user_id', user.id)
        .is('organization_id', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Close Keywords] Fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch keywords' },
          { status: 500, headers: CORS_HEADERS }
        )
      }
      keywords = data || []
    }

    return NextResponse.json({ keywords }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('[Close Keywords] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// POST - Create new keyword
export async function POST(request: Request) {
  try {
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
    const { keyword, video_title, video_url, description, highlight_color, organization_id } = body

    if (!keyword || !video_title || !video_url) {
      return NextResponse.json(
        { error: 'Missing required fields: keyword, video_title, video_url' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // If organization_id provided, verify user is an admin/owner
    if (organization_id) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organization_id)
        .eq('status', 'active')
        .single()

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json(
          { error: 'Only organization admins can add org-level keywords' },
          { status: 403, headers: CORS_HEADERS }
        )
      }
    }

    // Insert keyword
    const { data, error } = await supabase
      .from('close_keywords')
      .insert({
        user_id: user.id,
        organization_id: organization_id || null,
        keyword: keyword.trim(),
        video_title: video_title.trim(),
        video_url: video_url.trim(),
        description: description?.trim() || null,
        highlight_color: highlight_color || '#5eead4'
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Keyword already exists' },
          { status: 409, headers: CORS_HEADERS }
        )
      }
      console.error('[Close Keywords] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create keyword' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({ keyword: data }, { status: 201, headers: CORS_HEADERS })
  } catch (error) {
    console.error('[Close Keywords] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
