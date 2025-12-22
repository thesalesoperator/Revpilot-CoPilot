import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/coaching/test?session_id=xxx - Insert a test suggestion
// This helps debug if the issue is with Recall.ai webhooks or our suggestion flow
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({
        error: 'session_id required',
        usage: 'GET /api/coaching/test?session_id=YOUR_SESSION_ID'
      }, { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('id, status, user_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({
        error: 'Session not found',
        sessionId,
        sessionError
      }, { status: 404, headers: corsHeaders })
    }

    // Insert a test suggestion
    const testSuggestion = {
      session_id: sessionId,
      type: 'tip',
      content: `🧪 TEST: This is a test suggestion inserted at ${new Date().toISOString()}. If you see this, the suggestion flow is working!`
    }

    const { data: inserted, error: insertError } = await supabase
      .from('coaching_suggestions')
      .insert(testSuggestion)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({
        error: 'Failed to insert suggestion',
        insertError,
        testSuggestion
      }, { status: 500, headers: corsHeaders })
    }

    // Get all suggestions for this session
    const { data: allSuggestions, error: fetchError } = await supabase
      .from('coaching_suggestions')
      .select('id, type, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      message: 'Test suggestion inserted! Check your Chrome extension - it should appear within 3 seconds.',
      inserted,
      session: {
        id: session.id,
        status: session.status,
      },
      recent_suggestions: allSuggestions,
      suggestions_count: allSuggestions?.length || 0,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ error: 'Test failed', details: String(error) }, { status: 500, headers: corsHeaders })
  }
}
