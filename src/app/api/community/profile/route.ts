import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateProfileRequest, UserProfileExtended } from '@/types/community'

// GET /api/community/profile - Get own profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get extended profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles_extended')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      // Profile might not exist, create it
      if (profileError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles_extended')
          .insert({ user_id: user.id })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
        }

        return NextResponse.json({ profile: newProfile })
      }

      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error in GET /api/community/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/community/profile - Update profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateProfileRequest = await request.json()

    // Build update object with only provided fields
    const updateData: Partial<UserProfileExtended> = {}

    if (body.title !== undefined) {
      updateData.title = body.title
    }
    if (body.bio !== undefined) {
      updateData.bio = body.bio
    }
    if (body.avatar_url !== undefined) {
      updateData.avatar_url = body.avatar_url
    }
    if (body.display_name !== undefined) {
      updateData.display_name = body.display_name
    }
    if (body.location !== undefined) {
      updateData.location = body.location
    }
    if (body.website !== undefined) {
      updateData.website = body.website
    }
    if (body.linkedin_url !== undefined) {
      updateData.linkedin_url = body.linkedin_url
    }
    if (body.twitter_handle !== undefined) {
      updateData.twitter_handle = body.twitter_handle
    }
    if (body.years_in_sales !== undefined) {
      updateData.years_in_sales = body.years_in_sales
    }
    if (body.is_profile_public !== undefined) {
      updateData.is_profile_public = body.is_profile_public
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('user_profiles_extended')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error in PUT /api/community/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
