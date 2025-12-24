import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChallengeById, getPersonaById } from '@/lib/practice/challenges'
import { PracticeSession } from '@/types/practice'

// GET /api/practice/history - Get user's practice session history
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '20')
  const cursor = searchParams.get('cursor')
  const challenge_id = searchParams.get('challenge_id')
  const difficulty = searchParams.get('difficulty')
  const status = searchParams.get('status') || 'completed'

  try {
    let query = supabase
      .from('practice_sessions')
      .select()
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    // Filter by status
    if (status === 'completed') {
      query = query.eq('status', 'completed')
    } else if (status === 'all') {
      // No filter
    } else {
      query = query.eq('status', status)
    }

    // Filter by challenge
    if (challenge_id) {
      query = query.eq('challenge_id', challenge_id)
    }

    // Filter by difficulty
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }

    // Cursor pagination
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching history:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    const hasMore = sessions.length > limit
    const sessionsToReturn = hasMore ? sessions.slice(0, limit) : sessions

    // Enrich with challenge and persona data
    const enrichedSessions = sessionsToReturn.map(session => ({
      ...session,
      challenge: getChallengeById(session.challenge_id),
      persona: getPersonaById(session.persona_id),
    }))

    return NextResponse.json({
      sessions: enrichedSessions as (PracticeSession & { challenge: ReturnType<typeof getChallengeById>; persona: ReturnType<typeof getPersonaById> })[],
      hasMore,
      nextCursor: hasMore ? sessionsToReturn[sessionsToReturn.length - 1].created_at : undefined,
    })
  } catch (error) {
    console.error('Error in history GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
