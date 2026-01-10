import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Organization } from '@/types/database'

// Helper to generate slug
function generateSlug(name: string): string {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (slug.length < 3) {
    slug = slug + '-org'
  }

  return slug
}

// GET /api/organizations - List user's organizations
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all organizations the user is a member of
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        joined_at,
        organizations (
          id,
          name,
          slug,
          description,
          logo_url,
          billing_type,
          subscription_status,
          subscription_plan,
          max_seats,
          used_seats,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    const organizations = memberships?.map(m => ({
      ...m.organizations,
      user_role: m.role,
      joined_at: m.joined_at,
    })) || []

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Error in organizations GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description, billing_type = 'org_pays' } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Organization name is required (min 2 characters)' }, { status: 400 })
    }

    // Generate base slug
    let baseSlug = generateSlug(name.trim())
    let slug = baseSlug
    let counter = 0

    // Check if slug exists and generate unique one
    while (true) {
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existing) break

      counter++
      slug = `${baseSlug}-${counter}`
    }

    // Create organization
    const { data: organization, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        billing_type,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating organization:', createError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: organization.id,
      user_id: user.id,
      action: 'organization_created',
      details: { name: organization.name },
    })

    return NextResponse.json({ organization }, { status: 201 })
  } catch (error) {
    console.error('Error in organizations POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
