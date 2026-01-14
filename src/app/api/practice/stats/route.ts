import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateXPToNextLevel, UserPracticeStats } from '@/types/practice'

// GET /api/practice/stats - Get current user's practice stats
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get or create user stats
    let { data: stats, error } = await supabase
      .from('user_practice_stats')
      .select()
      .eq('user_id', user.id)
      .single()

    if (error || !stats) {
      // Create default stats
      const { data: newStats, error: createError } = await supabase
        .from('user_practice_stats')
        .insert({ user_id: user.id })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user stats:', createError)
        return NextResponse.json({ error: 'Failed to create stats' }, { status: 500 })
      }
      stats = newStats
    }

    // Calculate XP to next level
    const { nextLevelXP, xpNeeded } = calculateXPToNextLevel(stats.total_xp)

    // Check if daily challenges need reset
    const today = new Date().toISOString().split('T')[0]
    if (stats.daily_challenges_date !== today) {
      // Reset daily challenges
      await supabase
        .from('user_practice_stats')
        .update({
          daily_challenges_completed: [],
          daily_challenges_date: today,
        })
        .eq('user_id', user.id)

      stats.daily_challenges_completed = []
      stats.daily_challenges_date = today
    }

    return NextResponse.json({
      stats: stats as UserPracticeStats,
      next_level_xp: nextLevelXP,
      xp_to_next_level: xpNeeded,
    })
  } catch (error) {
    console.error('Error in stats GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/practice/stats - Update specific stats (for daily challenges, etc.)
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Get current stats
    const { data: stats, error: statsError } = await supabase
      .from('user_practice_stats')
      .select()
      .eq('user_id', user.id)
      .single()

    if (statsError || !stats) {
      return NextResponse.json({ error: 'Stats not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    // Handle daily challenge completion
    if (body.complete_daily_challenge) {
      const today = new Date().toISOString().split('T')[0]
      const challengeId = body.complete_daily_challenge

      // Reset if new day
      let dailyChallenges = stats.daily_challenges_completed || []
      if (stats.daily_challenges_date !== today) {
        dailyChallenges = []
      }

      // Add challenge if not already completed
      if (!dailyChallenges.includes(challengeId)) {
        dailyChallenges.push(challengeId)
      }

      updates.daily_challenges_completed = dailyChallenges
      updates.daily_challenges_date = today
    }

    if (Object.keys(updates).length > 0) {
      const { data: updatedStats, error: updateError } = await supabase
        .from('user_practice_stats')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating stats:', updateError)
        return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 })
      }

      const { nextLevelXP, xpNeeded } = calculateXPToNextLevel(updatedStats.total_xp)

      return NextResponse.json({
        stats: updatedStats as UserPracticeStats,
        next_level_xp: nextLevelXP,
        xp_to_next_level: xpNeeded,
      })
    }

    return NextResponse.json({ stats: stats as UserPracticeStats })
  } catch (error) {
    console.error('Error in stats POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
