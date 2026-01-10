import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/organizations/[id] - Get organization details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user is a member
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    // Get organization details
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({
      organization,
      user_role: membership.role,
    })
  } catch (error) {
    console.error('Error in organization GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/organizations/[id] - Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user is admin/owner
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const allowedFields = ['name', 'description', 'logo_url', 'billing_type', 'max_seats', 'settings']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Only owner can change billing_type
    if (updates.billing_type && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can change billing type' }, { status: 403 })
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: id,
      user_id: user.id,
      action: 'organization_updated',
      details: { fields: Object.keys(updates) },
    })

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Error in organization PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/organizations/[id] - Delete organization (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user is owner
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active' || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can delete organization' }, { status: 403 })
    }

    // Delete organization (cascades to members, invites, etc.)
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting organization:', error)
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in organization DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
