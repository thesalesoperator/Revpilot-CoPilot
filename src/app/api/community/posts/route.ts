import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreatePostRequest, CommunityPost, PostsResponse } from '@/types/community'

// GET /api/community/posts - Get feed
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')

    // Build query
    let query = supabase
      .from('community_posts')
      .select(`
        *,
        profiles!community_posts_user_id_fkey (
          id,
          full_name,
          email
        ),
        user_profiles_extended!community_posts_user_id_fkey (
          title,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    // Filter by following
    if (filter === 'following') {
      const { data: following } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = following?.map(f => f.following_id) || []
      // Include own posts in following feed
      followingIds.push(user.id)

      if (followingIds.length > 0) {
        query = query.in('user_id', followingIds)
      }
    }

    // Pagination
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: postsData, error: postsError } = await query

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    // Check if there are more posts
    const hasMore = postsData && postsData.length > limit
    const posts = hasMore ? postsData.slice(0, limit) : (postsData || [])

    // Get user's likes and saves for these posts
    const postIds = posts.map(p => p.id)

    const [likesResult, savesResult, followsResult] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('post_saves').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('user_follows').select('following_id').eq('follower_id', user.id)
    ])

    const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || [])
    const savedPostIds = new Set(savesResult.data?.map(s => s.post_id) || [])
    const followingIds = new Set(followsResult.data?.map(f => f.following_id) || [])

    // Transform posts to response format
    const transformedPosts: CommunityPost[] = posts.map(post => {
      // Handle joined data - may be array or object depending on relationship
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      const extProfile = Array.isArray(post.user_profiles_extended) ? post.user_profiles_extended[0] : post.user_profiles_extended

      return {
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        tags: post.tags || [],
        like_count: post.like_count,
        comment_count: post.comment_count,
        share_count: post.share_count,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: {
          id: post.user_id,
          full_name: profile?.full_name || null,
          email: profile?.email || '',
          title: extProfile?.title || 'Sales Professional',
          avatar_url: extProfile?.avatar_url || null,
        },
        is_liked: likedPostIds.has(post.id),
        is_saved: savedPostIds.has(post.id),
        is_following_author: followingIds.has(post.user_id),
      }
    })

    const response: PostsResponse = {
      posts: transformedPosts,
      hasMore,
      nextCursor: hasMore ? posts[posts.length - 1].created_at : undefined,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/community/posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/community/posts - Create a post
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreatePostRequest = await request.json()

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g
    const extractedTags = body.content.match(hashtagRegex)?.map(tag => tag.slice(1)) || []
    const tags = [...new Set([...(body.tags || []), ...extractedTags])]

    // Create post
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .insert({
        user_id: user.id,
        content: body.content.trim(),
        tags,
      })
      .select()
      .single()

    if (postError) {
      console.error('Error creating post:', postError)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    // Get author info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const { data: extProfile } = await supabase
      .from('user_profiles_extended')
      .select('title, avatar_url')
      .eq('user_id', user.id)
      .single()

    const newPost: CommunityPost = {
      ...post,
      author: {
        id: user.id,
        full_name: profile?.full_name || null,
        email: profile?.email || user.email || '',
        title: extProfile?.title || 'Sales Professional',
        avatar_url: extProfile?.avatar_url || null,
      },
      is_liked: false,
      is_saved: false,
      is_following_author: false,
    }

    return NextResponse.json({ post: newPost }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/community/posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
