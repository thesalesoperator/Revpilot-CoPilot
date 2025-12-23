// Community Feature Types

// Base user info for posts/comments
export interface CommunityUser {
  id: string
  email: string
  full_name: string | null
  title: string
  avatar_url: string | null
  total_xp: number
  post_count: number
  follower_count: number
  following_count: number
}

// Extended profile for editing
export interface UserProfileExtended {
  id: string
  user_id: string
  title: string
  bio: string | null
  avatar_url: string | null
  total_xp: number
  post_count: number
  follower_count: number
  following_count: number
  created_at: string
  updated_at: string
}

// Post with author info
export interface CommunityPost {
  id: string
  user_id: string
  content: string
  tags: string[]
  like_count: number
  comment_count: number
  share_count: number
  created_at: string
  updated_at: string
  // Joined data
  author: {
    id: string
    full_name: string | null
    email: string
    title: string
    avatar_url: string | null
  }
  // User-specific state
  is_liked: boolean
  is_saved: boolean
  is_following_author: boolean
}

// Comment with author info
export interface PostComment {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  // Joined data
  author: {
    id: string
    full_name: string | null
    email: string
    title: string
    avatar_url: string | null
  }
}

// Follow relationship
export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

// API Request Types
export interface CreatePostRequest {
  content: string
  tags?: string[]
}

export interface CreateCommentRequest {
  content: string
}

export interface ToggleFollowRequest {
  user_id: string
}

export interface UpdateProfileRequest {
  title?: string
  bio?: string
  avatar_url?: string
}

export interface SearchUsersRequest {
  query: string
  limit?: number
}

// API Response Types
export interface PostsResponse {
  posts: CommunityPost[]
  hasMore: boolean
  nextCursor?: string
}

export interface CommentsResponse {
  comments: PostComment[]
  hasMore: boolean
}

export interface LikeResponse {
  liked: boolean
  like_count: number
}

export interface SaveResponse {
  saved: boolean
}

export interface FollowResponse {
  following: boolean
  follower_count: number
}

export interface SearchUsersResponse {
  users: Array<{
    id: string
    full_name: string | null
    email: string
    title: string
    avatar_url: string | null
    follower_count: number
    is_following: boolean
  }>
}

// Feed filter type
export type FeedFilter = 'all' | 'following'

// ============================================
// Friends System Types
// ============================================

// Friend with profile info
export interface Friend {
  id: string
  user_id: string
  full_name: string | null
  email: string
  title: string
  avatar_url: string | null
  status: 'online' | 'offline' | 'busy'
  last_active?: string
  mutual_friends_count?: number
  created_at: string
}

// Friend request
export interface FriendRequest {
  id: string
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  // Joined data - the other user's info
  user: {
    id: string
    full_name: string | null
    email: string
    title: string
    avatar_url: string | null
  }
  mutual_friends_count: number
}

// API Request Types for Friends
export interface SendFriendRequestRequest {
  to_user_id: string
}

export interface RespondFriendRequestRequest {
  request_id: string
  action: 'accept' | 'decline'
}

export interface RemoveFriendRequest {
  friend_id: string
}

// API Response Types for Friends
export interface FriendsListResponse {
  friends: Friend[]
  total: number
}

export interface FriendRequestsResponse {
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
}

export interface SendFriendRequestResponse {
  request: FriendRequest
}

export interface RespondFriendRequestResponse {
  success: boolean
  friendship?: Friend
}

export interface RemoveFriendResponse {
  success: boolean
}

// ============================================
// Groups System Types
// ============================================

// Group
export interface CommunityGroup {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  creator_id: string
  is_private: boolean
  member_count: number
  post_count: number
  created_at: string
  updated_at: string
  // User-specific state
  is_member: boolean
  is_admin: boolean
  recent_activity?: string
}

// Group membership
export interface GroupMembership {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'moderator' | 'member'
  joined_at: string
  // Joined user data
  user?: {
    id: string
    full_name: string | null
    email: string
    title: string
    avatar_url: string | null
  }
}

// API Request Types for Groups
export interface CreateGroupRequest {
  name: string
  description?: string
  is_private?: boolean
}

export interface UpdateGroupRequest {
  name?: string
  description?: string
  avatar_url?: string
  cover_url?: string
  is_private?: boolean
}

export interface JoinGroupRequest {
  group_id: string
}

// API Response Types for Groups
export interface GroupsListResponse {
  groups: CommunityGroup[]
  hasMore: boolean
}

export interface MyGroupsResponse {
  groups: CommunityGroup[]
}

export interface GroupDetailsResponse {
  group: CommunityGroup
  members: GroupMembership[]
}

export interface CreateGroupResponse {
  group: CommunityGroup
}

export interface JoinLeaveGroupResponse {
  success: boolean
  is_member: boolean
}
