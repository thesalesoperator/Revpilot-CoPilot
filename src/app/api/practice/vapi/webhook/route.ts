import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Create service role client lazily (not at module load time)
function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for webhook')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

interface VapiWebhookPayload {
  message: {
    type: string
    call?: {
      id: string
      orgId: string
      createdAt: string
      startedAt?: string
      endedAt?: string
      cost?: number
      status: string
      phoneNumber?: {
        number: string
      }
    }
    transcript?: string
    artifact?: {
      transcript?: string
      messages?: Array<{
        role: string
        message: string
        time: number
        endTime?: number
      }>
      recordingUrl?: string
    }
    endedReason?: string
    timestamp?: string
    [key: string]: unknown
  }
}

// POST /api/practice/vapi/webhook - Handle Vapi call events
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET
    if (webhookSecret) {
      const authHeader = request.headers.get('x-vapi-secret')
      if (authHeader !== webhookSecret) {
        console.error('Invalid Vapi webhook secret')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const payload: VapiWebhookPayload = await request.json()
    const { message } = payload

    console.log('Vapi webhook received:', message.type)

    // Extract session ID from call metadata
    const metadata = (message.call as Record<string, unknown>)?.metadata as Record<string, string> | undefined
    const sessionId = metadata?.session_id

    if (!sessionId && message.type !== 'status-update') {
      console.log('No session ID in webhook, skipping')
      return NextResponse.json({ received: true })
    }

    // Get supabase admin client
    const supabaseAdmin = getSupabaseAdmin()

    switch (message.type) {
      case 'call-start':
        // Call has started
        if (sessionId) {
          await supabaseAdmin
            .from('practice_sessions')
            .update({
              status: 'active',
              vapi_call_id: message.call?.id,
              started_at: message.call?.startedAt || new Date().toISOString(),
            })
            .eq('id', sessionId)
        }
        break

      case 'speech-update':
        // Real-time transcript update (if needed)
        // This fires frequently during the call
        break

      case 'transcript':
        // Full or partial transcript
        if (sessionId && message.transcript) {
          await supabaseAdmin
            .from('practice_sessions')
            .update({
              transcript: message.transcript,
            })
            .eq('id', sessionId)
        }
        break

      case 'end-of-call-report':
        // Call has ended with full details
        if (sessionId) {
          const endedAt = message.call?.endedAt || new Date().toISOString()
          const transcript = message.artifact?.transcript || ''

          // Format transcript from messages if available
          let formattedTranscript = transcript
          if (message.artifact?.messages && message.artifact.messages.length > 0) {
            formattedTranscript = message.artifact.messages
              .map(m => `${m.role.toUpperCase()}: ${m.message}`)
              .join('\n\n')
          }

          // Get session to calculate duration
          const { data: session } = await supabaseAdmin
            .from('practice_sessions')
            .select('started_at')
            .eq('id', sessionId)
            .single()

          const durationSeconds = session?.started_at
            ? Math.round((new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 1000)
            : 0

          await supabaseAdmin
            .from('practice_sessions')
            .update({
              status: 'ended',
              ended_at: endedAt,
              duration_seconds: durationSeconds,
              transcript: formattedTranscript,
            })
            .eq('id', sessionId)
        }
        break

      case 'hang':
        // Call was hung up
        if (sessionId) {
          const { data: session } = await supabaseAdmin
            .from('practice_sessions')
            .select('started_at, status')
            .eq('id', sessionId)
            .single()

          // Only update if not already ended
          if (session && !['ended', 'analyzing', 'completed', 'failed'].includes(session.status)) {
            const endedAt = new Date().toISOString()
            const durationSeconds = session.started_at
              ? Math.round((new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 1000)
              : 0

            await supabaseAdmin
              .from('practice_sessions')
              .update({
                status: 'ended',
                ended_at: endedAt,
                duration_seconds: durationSeconds,
              })
              .eq('id', sessionId)
          }
        }
        break

      case 'function-call':
        // AI wants to call a function (e.g., end call)
        // Handle any custom functions here
        break

      case 'status-update':
        // General status update
        break

      default:
        console.log('Unhandled Vapi webhook type:', message.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Vapi webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle Vapi GET for verification
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'vapi-webhook' })
}
