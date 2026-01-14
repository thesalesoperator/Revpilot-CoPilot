/**
 * Unified Co-Pilot Suggestions Endpoint
 * GET /api/co-pilot/session/[id]/suggestions
 *
 * Retrieves coaching suggestions for a session:
 * - Returns all suggestions for a session
 * - Supports pagination and filtering
 * - Can filter by type, priority, or time range
 * - Used for both real-time updates and post-session review
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// CORS headers for Chrome extension requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    // Verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]

    // Verify user token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('co_pilot_sessions')
      .select('id, user_id, context, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - session belongs to another user' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const type = url.searchParams.get('type') // Filter by type
    const priority = url.searchParams.get('priority') // Filter by priority
    const since = url.searchParams.get('since') // Filter by timestamp (ISO string)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const order = url.searchParams.get('order') || 'desc' // 'asc' or 'desc'

    // Build query
    let query = supabase
      .from('co_pilot_suggestions')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)

    // Apply filters
    if (type) {
      // Support comma-separated types
      const types = type.split(',').map(t => t.trim())
      query = query.in('type', types)
    }

    if (priority) {
      // Support comma-separated priorities
      const priorities = priority.split(',').map(p => p.trim())
      query = query.in('priority', priorities)
    }

    if (since) {
      query = query.gte('created_at', since)
    }

    // Apply ordering
    query = query.order('created_at', { ascending: order === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: suggestions, error: queryError, count } = await query

    if (queryError) {
      console.error('[CoPilot] Suggestions query error:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch suggestions' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // Get session summary stats
    const { data: stats } = await supabase
      .from('co_pilot_suggestions')
      .select('type, priority')
      .eq('session_id', sessionId)

    const summary = {
      total: count || 0,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    }

    if (stats) {
      for (const s of stats) {
        summary.byType[s.type] = (summary.byType[s.type] || 0) + 1
        summary.byPriority[s.priority] = (summary.byPriority[s.priority] || 0) + 1
      }
    }

    return NextResponse.json({
      sessionId,
      suggestions: suggestions || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      summary,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[CoPilot] Suggestions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

/**
 * POST endpoint for creating manual suggestions or feedback
 * This can be used by admins or for user feedback on suggestions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    // Verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]

    // Verify user token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('co_pilot_sessions')
      .select('id, user_id, context')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - session belongs to another user' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    const body = await request.json()
    const { type, content, priority, metadata, feedbackOnSuggestionId, feedbackType } = body

    // Handle feedback on existing suggestion
    if (feedbackOnSuggestionId && feedbackType) {
      // Get existing suggestion to update its metadata
      const { data: existingSuggestion } = await supabase
        .from('co_pilot_suggestions')
        .select('metadata')
        .eq('id', feedbackOnSuggestionId)
        .eq('session_id', sessionId)
        .single()

      if (existingSuggestion) {
        const updatedMetadata = {
          ...(existingSuggestion.metadata || {}),
          feedback: {
            type: feedbackType, // 'helpful', 'not_helpful', 'used', 'dismissed'
            timestamp: new Date().toISOString(),
          },
        }

        await supabase
          .from('co_pilot_suggestions')
          .update({ metadata: updatedMetadata })
          .eq('id', feedbackOnSuggestionId)
      }

      return NextResponse.json({
        success: true,
        message: 'Feedback recorded',
      }, { headers: CORS_HEADERS })
    }

    // Create new manual suggestion
    if (!type || !content) {
      return NextResponse.json(
        { error: 'type and content are required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const validTypes = ['question', 'tip', 'objection', 'positive', 'alert', 'transition', 'stats']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const { data: suggestion, error: insertError } = await supabase
      .from('co_pilot_suggestions')
      .insert({
        session_id: sessionId,
        context: session.context,
        type,
        content,
        priority: priority || 'medium',
        metadata: {
          ...metadata,
          source: 'manual',
          createdBy: user.id,
        },
      })
      .select()
      .single()

    if (insertError) {
      console.error('[CoPilot] Suggestion insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create suggestion' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({
      success: true,
      suggestion,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[CoPilot] Suggestions POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
