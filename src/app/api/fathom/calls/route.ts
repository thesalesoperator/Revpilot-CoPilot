import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const FATHOM_API_BASE = 'https://api.fathom.ai/external/v1'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Get user's Fathom API key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fathom_api_key')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.fathom_api_key) {
      return NextResponse.json(
        { error: 'Fathom not connected. Please add your API key in Settings.' },
        { status: 400 }
      )
    }

    // Fetch calls from Fathom API
    const response = await fetch(`${FATHOM_API_BASE}/meetings`, {
      headers: {
        'X-Api-Key': profile.fathom_api_key,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid Fathom API key. Please check your key in Settings.' },
          { status: 401 }
        )
      }
      const errorText = await response.text()
      console.error('Fathom API error response:', response.status, errorText)
      throw new Error(`Fathom API error: ${response.status}`)
    }

    const data = await response.json()

    // Log the response structure for debugging
    console.log('Fathom API response keys:', Object.keys(data))
    console.log('Fathom API response type:', typeof data, Array.isArray(data))

    // Handle various response formats from Fathom API
    let calls: any[] = []
    if (Array.isArray(data)) {
      calls = data
    } else if (data.meetings && Array.isArray(data.meetings)) {
      calls = data.meetings
    } else if (data.data && Array.isArray(data.data)) {
      calls = data.data
    } else if (data.results && Array.isArray(data.results)) {
      calls = data.results
    } else if (data.items && Array.isArray(data.items)) {
      calls = data.items
    }

    console.log('Fathom calls count:', calls.length)

    // Return in a consistent format
    return NextResponse.json({ meetings: calls })

  } catch (error) {
    console.error('Fathom API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calls from Fathom' },
      { status: 500 }
    )
  }
}
