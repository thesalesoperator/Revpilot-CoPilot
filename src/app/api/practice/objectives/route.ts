import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, OPENAI_MODELS, TOKEN_LIMITS } from '@/lib/openai'

// Real-time objective checking during active calls
// Uses a fast model to evaluate transcript against objectives

interface ObjectiveCheckRequest {
  transcript: string
  objectives: string[]
  challenge_context: string
}

// POST /api/practice/objectives - Check objectives in real-time
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: ObjectiveCheckRequest = await request.json()
    const { transcript, objectives, challenge_context } = body

    if (!transcript || !objectives || objectives.length === 0) {
      return NextResponse.json({ completed: [] })
    }

    // Use GPT-4o-mini for fast, cheap evaluation
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: OPENAI_MODELS.FAST,
      temperature: 0,
      max_tokens: TOKEN_LIMITS.OBJECTIVE_CHECK,
      messages: [
        {
          role: 'system',
          content: `You are evaluating a live sales call transcript to determine which objectives have been completed.

CHALLENGE CONTEXT:
${challenge_context}

OBJECTIVES TO CHECK:
${objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

EVALUATION RULES:
- Be STRICT. An objective is only complete if the salesperson CLEARLY achieved it.
- Look for explicit evidence in the transcript.
- "Establish value" = they articulated specific value relevant to the prospect's situation
- "Address objection" = they responded substantively to a concern, not just deflected
- "Get commitment" = prospect explicitly agreed to something (meeting, next step, etc.)
- "Create urgency" = they made a compelling time-based argument
- "Build rapport" = genuine connection beyond pleasantries

Return ONLY a JSON array of objective NUMBERS (1-indexed) that are COMPLETED.
Example: [1, 3] means objectives 1 and 3 are complete.
If none are complete, return: []`,
        },
        {
          role: 'user',
          content: `TRANSCRIPT SO FAR:
${transcript}

Which objectives (by number) are COMPLETED? Return only the JSON array.`,
        },
      ],
    })

    const content = response.choices[0]?.message?.content?.trim() || '[]'

    // Parse the response - handle both array format and text
    let completedIndices: number[] = []
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        completedIndices = parsed.filter((n): n is number => typeof n === 'number')
      }
    } catch {
      // If JSON parse fails, try to extract numbers from the text
      const matches = content.match(/\d+/g)
      if (matches) {
        completedIndices = matches.map(Number).filter(n => n > 0 && n <= objectives.length)
      }
    }

    // Convert indices to actual objective strings
    const completedObjectives = completedIndices
      .filter(i => i > 0 && i <= objectives.length)
      .map(i => objectives[i - 1])

    return NextResponse.json({
      completed: completedObjectives,
      indices: completedIndices,
    })
  } catch (error) {
    console.error('Error checking objectives:', error)
    return NextResponse.json({ completed: [], error: 'Failed to check objectives' })
  }
}
