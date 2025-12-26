import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CORS_HEADERS } from '@/lib/coaching/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// GET - Fetch user's organizations
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

    // Fetch user's organizations with their role
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organization:organizations (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) {
      console.error('[Close Organizations] Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // Transform the data to a cleaner format
    const organizations = memberships?.map(m => ({
      id: (m.organization as { id: string }).id,
      name: (m.organization as { name: string }).name,
      slug: (m.organization as { slug: string }).slug,
      logo_url: (m.organization as { logo_url: string | null }).logo_url,
      role: m.role,
      can_manage_keywords: m.role === 'owner' || m.role === 'admin'
    })) || []

    return NextResponse.json({ organizations }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('[Close Organizations] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
