# Community Feature Implementation Plan

## Overview
Transform the community page from mock data to a fully functional social platform.

## MVP Scope (Phase 1 - This Build)
Focus on core social features that work reliably:

1. **Posts System** - Create, read, like, save posts
2. **Comments** - Add comments to posts
3. **Follow System** - Follow/unfollow users (asymmetric)
4. **Enhanced Profiles** - Bio, title, avatar customization
5. **Feed** - All posts + Following filter

## Deferred (Phase 2)
- Friend requests (bidirectional relationships)
- Groups system
- Audio clip sharing
- Real-time subscriptions
- Direct messaging

---

## Database Schema

### Table 1: `user_profiles_extended`
Extends the base profiles table with social data.
```sql
- user_id (FK to auth.users)
- title (job title)
- bio
- avatar_url
- total_xp (for leaderboard)
- post_count
- follower_count
- following_count
```

### Table 2: `community_posts`
Main posts table.
```sql
- id (UUID)
- user_id (FK)
- content (text)
- tags (text[])
- like_count
- comment_count
- share_count
- created_at
- updated_at
```

### Table 3: `post_likes`
Tracks who liked what post.
```sql
- id (UUID)
- user_id (FK)
- post_id (FK)
- created_at
- UNIQUE(user_id, post_id)
```

### Table 4: `post_saves`
Tracks saved/bookmarked posts.
```sql
- id (UUID)
- user_id (FK)
- post_id (FK)
- created_at
- UNIQUE(user_id, post_id)
```

### Table 5: `post_comments`
Comments on posts.
```sql
- id (UUID)
- user_id (FK)
- post_id (FK)
- content (text)
- created_at
```

### Table 6: `user_follows`
Follow relationships (asymmetric).
```sql
- id (UUID)
- follower_id (FK - who is following)
- following_id (FK - who is being followed)
- created_at
- UNIQUE(follower_id, following_id)
```

---

## API Endpoints

### Posts
- `POST /api/community/posts` - Create a post
- `GET /api/community/posts` - Get feed (with ?filter=following)
- `POST /api/community/posts/[id]/like` - Toggle like
- `POST /api/community/posts/[id]/save` - Toggle save
- `POST /api/community/posts/[id]/comments` - Add comment
- `GET /api/community/posts/[id]/comments` - Get comments

### Users
- `POST /api/community/follow` - Follow/unfollow user
- `GET /api/community/users/search` - Search users
- `GET /api/community/profile` - Get own extended profile
- `PUT /api/community/profile` - Update profile

---

## Implementation Order

### Step 1: Database Migration
Create `supabase/migrations/add_community_tables.sql` with:
- All 6 tables
- Indexes for performance
- RLS policies for security
- Trigger functions for count updates

### Step 2: TypeScript Types
Create `src/types/community.ts` with:
- Post, Comment, UserProfile interfaces
- API request/response types

### Step 3: API Routes
Create API routes in order:
1. `/api/community/posts/route.ts` (GET/POST)
2. `/api/community/posts/[id]/like/route.ts` (POST)
3. `/api/community/posts/[id]/save/route.ts` (POST)
4. `/api/community/posts/[id]/comments/route.ts` (GET/POST)
5. `/api/community/follow/route.ts` (POST)
6. `/api/community/profile/route.ts` (GET/PUT)
7. `/api/community/users/search/route.ts` (GET)

### Step 4: Frontend Integration
Update `src/app/community/page.tsx`:
- Replace mock data with API calls
- Add loading states
- Add error handling
- Wire up all interactions

---

## Key Design Decisions

1. **Asymmetric follows** (not friends) - Simpler, like Twitter/Instagram
2. **Count caching** - Store counts in main tables, update via triggers
3. **Optimistic UI** - Update UI immediately, sync in background
4. **Server-side pagination** - Limit posts per request
5. **RLS security** - Users can only modify own data

---

## Risk Mitigation

1. **Database triggers** - Auto-update counts to prevent race conditions
2. **Unique constraints** - Prevent duplicate likes/follows
3. **Error boundaries** - Graceful failure handling
4. **Type safety** - Full TypeScript coverage
