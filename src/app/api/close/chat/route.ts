import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { CORS_HEADERS } from '@/lib/coaching/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// System prompt for Close CRM assistant
const SYSTEM_PROMPT = `You are RevPilot Co-Pilot, an expert AI assistant for Close CRM. You help sales professionals use Close.com more effectively.

Your expertise includes:
- Close CRM features, workflows, and best practices
- Sales pipeline management and deal tracking
- Email sequences and automation
- Call logging and follow-ups
- Reporting and analytics
- Integration with other tools
- Sales methodology and techniques

Guidelines:
- Be concise and actionable in your responses
- Provide specific steps when explaining how to do something in Close
- Reference Close CRM terminology and features accurately
- If asked about something outside Close CRM, relate it back to how it impacts sales workflows
- Suggest keyboard shortcuts and power-user tips when relevant
- If you're unsure about a specific Close feature, acknowledge it

Keep responses focused and practical for busy sales professionals.`

// POST - Chat with AI
export async function POST(request: Request) {
  try {
    // Check for OpenAI API key
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 503, headers: CORS_HEADERS }
      )
    }

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
    const { message, session_id, page_context, conversation_history } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT }
    ]

    // Add page context if provided
    if (page_context) {
      messages.push({
        role: 'system',
        content: `The user is currently viewing: ${page_context}`
      })
    }

    // Add conversation history if provided
    if (conversation_history && Array.isArray(conversation_history)) {
      const recentHistory = conversation_history.slice(-10) // Keep last 10 messages
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content })
        }
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message })

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use faster, cheaper model for chat
      messages,
      max_tokens: 500,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Store chat in history (async, don't wait)
    const chatSessionId = session_id || crypto.randomUUID()

    supabase
      .from('close_chat_history')
      .insert([
        {
          user_id: user.id,
          session_id: chatSessionId,
          role: 'user',
          content: message,
          page_context
        },
        {
          user_id: user.id,
          session_id: chatSessionId,
          role: 'assistant',
          content: response,
          page_context
        }
      ])
      .then(() => {})
      .catch(err => console.error('[Close Chat] History save error:', err))

    // Track usage analytics (async)
    supabase
      .from('close_usage_analytics')
      .insert({
        user_id: user.id,
        event_type: 'chat',
        event_data: { message_length: message.length, response_length: response.length },
        page_url: page_context
      })
      .then(() => {})
      .catch(err => console.error('[Close Chat] Analytics error:', err))

    return NextResponse.json(
      {
        response,
        session_id: chatSessionId
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('[Close Chat] Error:', error)

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
