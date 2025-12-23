'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserPlus,
  MessageCircle,
  Heart,
  Share2,
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  Send,
  Trophy,
  TrendingUp,
  ChevronDown,
  Search,
  Bell,
  Plus,
  X,
  Check,
  MessageSquare,
  Loader2,
  RefreshCw,
  UserMinus,
  Clock,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import type { CommunityPost, PostComment, FeedFilter, Friend, FriendRequest } from '@/types/community'

// Trending tags (static for now)
const TRENDING_TAGS = ['#coldcalling', '#discovery', '#closing', '#objections', '#enterprise', '#smb', '#nepq', '#challenger']

export default function CommunityPage() {
  // Posts State
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [comments, setComments] = useState<Record<string, PostComment[]>>({})
  const [activeTab, setActiveTab] = useState<'feed' | 'friends'>('feed')
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [newComment, setNewComment] = useState<Record<string, string>>({})

  // Friends State
  const [friends, setFriends] = useState<Friend[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [friendSearchQuery, setFriendSearchQuery] = useState('')
  const [friendSearchResults, setFriendSearchResults] = useState<Array<{
    id: string
    full_name: string | null
    email: string
    title: string
    avatar_url: string | null
    follower_count: number
    is_following: boolean
  }>>([])
  const [isSearchingFriends, setIsSearchingFriends] = useState(false)

  // Loading states
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)

  const { user } = useAuth()
  const { showToast } = useToast()

  // Fetch posts
  const fetchPosts = useCallback(async (filter: FeedFilter, cursor?: string) => {
    try {
      if (!cursor) {
        setIsLoadingPosts(true)
      } else {
        setIsLoadingMore(true)
      }

      const params = new URLSearchParams({ filter })
      if (cursor) {
        params.append('cursor', cursor)
      }

      const response = await fetch(`/api/community/posts?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch posts')
      }

      if (cursor) {
        setPosts(prev => [...prev, ...data.posts])
      } else {
        setPosts(data.posts)
      }
      setHasMorePosts(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch (error) {
      console.error('Error fetching posts:', error)
      showToast('error', 'Failed to load posts')
    } finally {
      setIsLoadingPosts(false)
      setIsLoadingMore(false)
    }
  }, [showToast])

  // Fetch friends and requests
  const fetchFriendsData = useCallback(async () => {
    setIsLoadingFriends(true)
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        fetch('/api/community/friends'),
        fetch('/api/community/friends/requests'),
      ])

      const friendsData = await friendsRes.json()
      const requestsData = await requestsRes.json()

      if (friendsRes.ok) {
        setFriends(friendsData.friends || [])
      }
      if (requestsRes.ok) {
        setIncomingRequests(requestsData.incoming || [])
        setOutgoingRequests(requestsData.outgoing || [])
      }
    } catch (error) {
      console.error('Error fetching friends:', error)
    } finally {
      setIsLoadingFriends(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchPosts(feedFilter)
  }, [feedFilter, fetchPosts])

  // Load friends when tab changes to friends
  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriendsData()
    }
  }, [activeTab, fetchFriendsData])

  // Search for users to add as friends
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setFriendSearchResults([])
      return
    }

    setIsSearchingFriends(true)
    try {
      const response = await fetch(`/api/community/users/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok) {
        // Filter out existing friends and pending requests
        const friendIds = new Set(friends.map(f => f.user_id))
        const outgoingIds = new Set(outgoingRequests.map(r => r.to_user_id))
        const incomingIds = new Set(incomingRequests.map(r => r.from_user_id))

        const filtered = data.users.filter((u: { id: string }) =>
          !friendIds.has(u.id) && !outgoingIds.has(u.id) && !incomingIds.has(u.id)
        )
        setFriendSearchResults(filtered)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setIsSearchingFriends(false)
    }
  }

  // Send friend request
  const sendFriendRequest = async (toUserId: string) => {
    try {
      const response = await fetch('/api/community/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user_id: toUserId }),
      })

      const data = await response.json()

      if (response.ok) {
        setOutgoingRequests(prev => [...prev, data.request])
        setFriendSearchResults(prev => prev.filter(u => u.id !== toUserId))
        showToast('success', 'Friend request sent!')
      } else {
        showToast('error', data.error || 'Failed to send request')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      showToast('error', 'Failed to send request')
    }
  }

  // Accept friend request
  const acceptFriendRequest = async (requestId: string) => {
    setProcessingRequestId(requestId)
    try {
      const response = await fetch('/api/community/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action: 'accept' }),
      })

      const data = await response.json()

      if (response.ok && data.friendship) {
        setFriends(prev => [data.friendship, ...prev])
        setIncomingRequests(prev => prev.filter(r => r.id !== requestId))
        showToast('success', 'Friend request accepted!')
      } else {
        showToast('error', 'Failed to accept request')
      }
    } catch (error) {
      console.error('Error accepting request:', error)
      showToast('error', 'Failed to accept request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  // Decline friend request
  const declineFriendRequest = async (requestId: string) => {
    setProcessingRequestId(requestId)
    try {
      const response = await fetch('/api/community/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action: 'decline' }),
      })

      if (response.ok) {
        setIncomingRequests(prev => prev.filter(r => r.id !== requestId))
        showToast('success', 'Friend request declined')
      } else {
        showToast('error', 'Failed to decline request')
      }
    } catch (error) {
      console.error('Error declining request:', error)
      showToast('error', 'Failed to decline request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  // Remove friend
  const removeFriend = async (friendId: string) => {
    try {
      const response = await fetch(`/api/community/friends/${friendId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setFriends(prev => prev.filter(f => f.user_id !== friendId))
        showToast('success', 'Friend removed')
      } else {
        showToast('error', 'Failed to remove friend')
      }
    } catch (error) {
      console.error('Error removing friend:', error)
      showToast('error', 'Failed to remove friend')
    }
  }

  // Create post
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return

    setIsCreatingPost(true)
    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPostContent.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post')
      }

      setPosts(prev => [data.post, ...prev])
      setNewPostContent('')
      setIsCreatePostOpen(false)
      showToast('success', 'Post published to the community!')
    } catch (error) {
      console.error('Error creating post:', error)
      showToast('error', 'Failed to create post')
    } finally {
      setIsCreatingPost(false)
    }
  }

  // Toggle like
  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
        : p
    ))

    try {
      const response = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
      })

      if (!response.ok) {
        setPosts(prev => prev.map(p =>
          p.id === postId
            ? { ...p, is_liked: post.is_liked, like_count: post.like_count }
            : p
        ))
        showToast('error', 'Failed to update like')
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, is_liked: post.is_liked, like_count: post.like_count }
          : p
      ))
    }
  }

  // Toggle save
  const handleSave = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_saved: !p.is_saved } : p
    ))

    try {
      const response = await fetch(`/api/community/posts/${postId}/save`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, is_saved: post.is_saved } : p
        ))
        showToast('error', 'Failed to save post')
      } else {
        showToast('success', data.saved ? 'Post saved!' : 'Post unsaved')
      }
    } catch (error) {
      console.error('Error toggling save:', error)
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, is_saved: post.is_saved } : p
      ))
    }
  }

  // Toggle follow
  const handleFollow = async (authorId: string) => {
    const post = posts.find(p => p.author.id === authorId)
    if (!post) return

    setPosts(prev => prev.map(p =>
      p.author.id === authorId
        ? { ...p, is_following_author: !p.is_following_author }
        : p
    ))

    try {
      const response = await fetch('/api/community/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: authorId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPosts(prev => prev.map(p =>
          p.author.id === authorId
            ? { ...p, is_following_author: post.is_following_author }
            : p
        ))
        showToast('error', 'Failed to update follow')
      } else {
        showToast('success', data.following ? 'Following!' : 'Unfollowed')
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
      setPosts(prev => prev.map(p =>
        p.author.id === authorId
          ? { ...p, is_following_author: post.is_following_author }
          : p
      ))
    }
  }

  // Load comments for a post
  const loadComments = async (postId: string) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`)
      const data = await response.json()

      if (response.ok) {
        setComments(prev => ({ ...prev, [postId]: data.comments }))
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  // Toggle comments section
  const toggleComments = async (postId: string) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId)
    } else {
      newExpanded.add(postId)
      if (!comments[postId]) {
        await loadComments(postId)
      }
    }
    setExpandedComments(newExpanded)
  }

  // Add comment
  const handleAddComment = async (postId: string) => {
    const content = newComment[postId]?.trim()
    if (!content) return

    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      const data = await response.json()

      if (response.ok) {
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }))
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
        ))
        setNewComment(prev => ({ ...prev, [postId]: '' }))
      } else {
        showToast('error', 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      showToast('error', 'Failed to add comment')
    }
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Get avatar initials
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  // Filter posts by search
  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      post.content.toLowerCase().includes(query) ||
      post.author.full_name?.toLowerCase().includes(query) ||
      post.tags.some(tag => tag.toLowerCase().includes(query))
    )
  })

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="w-8 h-8 text-[#00ffc1]" />
              Community
            </h1>
            <p className="text-gray-400">Connect, share, and learn from top sales professionals</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
              {incomingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {incomingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Share Post
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-[rgba(255,255,255,0.05)] pb-4">
          {[
            { id: 'feed', label: 'Feed', icon: MessageSquare },
            { id: 'friends', label: 'Friends', icon: Users, count: friends.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-[#00ffc1] text-[#00102e] font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {'count' in tab && tab.count !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-[#00102e]/20' : 'bg-[rgba(255,255,255,0.1)]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Feed Tab */}
            {activeTab === 'feed' && (
              <>
                {/* Feed Filters */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(['all', 'following'] as FeedFilter[]).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setFeedFilter(filter)}
                        className={`px-4 py-2 rounded-xl text-sm transition-all ${
                          feedFilter === filter
                            ? 'bg-[rgba(0,255,193,0.1)] text-[#00ffc1] border border-[rgba(0,255,193,0.3)]'
                            : 'text-gray-400 hover:text-white bg-[rgba(255,255,255,0.02)]'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                    <button
                      onClick={() => fetchPosts(feedFilter)}
                      className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingPosts ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search posts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-field pl-10 py-2 w-64"
                    />
                  </div>
                </div>

                {/* Loading State */}
                {isLoadingPosts && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#00ffc1] animate-spin" />
                  </div>
                )}

                {/* Empty State */}
                {!isLoadingPosts && filteredPosts.length === 0 && (
                  <div className="glass-card p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
                    <p className="text-gray-400 mb-4">
                      {feedFilter === 'following'
                        ? 'Follow some users to see their posts here'
                        : 'Be the first to share something with the community!'}
                    </p>
                    <button
                      onClick={() => setIsCreatePostOpen(true)}
                      className="btn-primary"
                    >
                      Create Post
                    </button>
                  </div>
                )}

                {/* Posts */}
                {!isLoadingPosts && (
                  <div className="space-y-4">
                    {filteredPosts.map((post) => (
                      <div key={post.id} className="glass-card p-6">
                        {/* Author Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-[#00102e] font-bold">
                              {getInitials(post.author.full_name, post.author.email)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">
                                  {post.author.full_name || post.author.email.split('@')[0]}
                                </h3>
                                {!post.is_following_author && post.author.id !== user?.id && (
                                  <button
                                    onClick={() => handleFollow(post.author.id)}
                                    className="text-xs text-[#00ffc1] hover:underline"
                                  >
                                    Follow
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{post.author.title}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{formatRelativeTime(post.created_at)}</span>
                            <button className="p-1 rounded hover:bg-[rgba(255,255,255,0.05)]">
                              <MoreHorizontal className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-gray-300 mb-4 whitespace-pre-wrap">{post.content}</p>

                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-1 rounded-full bg-[rgba(0,255,193,0.1)] text-[#00ffc1]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.05)]">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleLike(post.id)}
                              className={`flex items-center gap-2 transition-colors ${
                                post.is_liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                              }`}
                            >
                              <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
                              <span>{post.like_count}</span>
                            </button>
                            <button
                              onClick={() => toggleComments(post.id)}
                              className={`flex items-center gap-2 transition-colors ${
                                expandedComments.has(post.id) ? 'text-[#00ffc1]' : 'text-gray-400 hover:text-[#00ffc1]'
                              }`}
                            >
                              <MessageCircle className="w-5 h-5" />
                              <span>{post.comment_count}</span>
                            </button>
                            <button className="flex items-center gap-2 text-gray-400 hover:text-[#00ffc1] transition-colors">
                              <Share2 className="w-5 h-5" />
                              <span>{post.share_count}</span>
                            </button>
                          </div>
                          <button
                            onClick={() => handleSave(post.id)}
                            className={`transition-colors ${
                              post.is_saved ? 'text-[#00ffc1]' : 'text-gray-400 hover:text-[#00ffc1]'
                            }`}
                          >
                            {post.is_saved ? (
                              <BookmarkCheck className="w-5 h-5" />
                            ) : (
                              <Bookmark className="w-5 h-5" />
                            )}
                          </button>
                        </div>

                        {/* Comments Section */}
                        {expandedComments.has(post.id) && (
                          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                            <div className="flex gap-3 mb-4">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-[#00102e] font-bold text-sm flex-shrink-0">
                                {user?.email?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Write a comment..."
                                  value={newComment[post.id] || ''}
                                  onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                  className="input-field flex-1 py-2 text-sm"
                                />
                                <button
                                  onClick={() => handleAddComment(post.id)}
                                  disabled={!newComment[post.id]?.trim()}
                                  className="p-2 rounded-lg bg-[#00ffc1] text-[#00102e] hover:bg-[#00d9a6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {comments[post.id]?.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {getInitials(comment.author.full_name, comment.author.email)}
                                  </div>
                                  <div className="flex-1 bg-[rgba(255,255,255,0.02)] rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-white text-sm">
                                        {comment.author.full_name || comment.author.email.split('@')[0]}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatRelativeTime(comment.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-gray-300 text-sm">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                              {comments[post.id]?.length === 0 && (
                                <p className="text-gray-500 text-sm text-center py-2">No comments yet</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Load More */}
                    {hasMorePosts && !isLoadingPosts && (
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={() => fetchPosts(feedFilter, nextCursor)}
                          disabled={isLoadingMore}
                          className="btn-secondary flex items-center gap-2"
                        >
                          {isLoadingMore ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          Load More
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="space-y-6">
                {/* Friend Requests */}
                {incomingRequests.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-[#00ffc1]" />
                      Friend Requests ({incomingRequests.length})
                    </h3>
                    <div className="space-y-3">
                      {incomingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff6b8a] to-[#ffbe57] flex items-center justify-center text-white font-bold">
                              {getInitials(request.user.full_name, request.user.email)}
                            </div>
                            <div>
                              <h4 className="font-medium text-white">
                                {request.user.full_name || request.user.email.split('@')[0]}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {request.user.title} • {formatRelativeTime(request.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => acceptFriendRequest(request.id)}
                              disabled={processingRequestId === request.id}
                              className="p-2 rounded-lg bg-[#00ffc1] text-[#00102e] hover:bg-[#00d9a6] disabled:opacity-50 transition-colors"
                            >
                              {processingRequestId === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => declineFriendRequest(request.id)}
                              disabled={processingRequestId === request.id}
                              className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-400 hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-50 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Outgoing Requests */}
                {outgoingRequests.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-400" />
                      Pending Requests ({outgoingRequests.length})
                    </h3>
                    <div className="space-y-3">
                      {outgoingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-bold text-sm">
                              {getInitials(request.user.full_name, request.user.email)}
                            </div>
                            <div>
                              <h4 className="font-medium text-white text-sm">
                                {request.user.full_name || request.user.email.split('@')[0]}
                              </h4>
                              <p className="text-xs text-gray-500">{request.user.title}</p>
                            </div>
                          </div>
                          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                            Pending
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends List */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#00ffc1]" />
                      Your Friends ({friends.length})
                    </h3>
                    <button
                      onClick={() => setIsAddFriendOpen(true)}
                      className="btn-secondary text-sm py-2 px-3 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </button>
                  </div>

                  {isLoadingFriends ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-[#00ffc1] animate-spin" />
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400 mb-4">No friends yet</p>
                      <button
                        onClick={() => setIsAddFriendOpen(true)}
                        className="btn-primary"
                      >
                        Find Friends
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {friends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl hover:border-[rgba(0,255,193,0.2)] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-[#00102e] font-bold">
                                {getInitials(friend.full_name, friend.email)}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#00102e] ${
                                friend.status === 'online' ? 'bg-green-500' :
                                friend.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-medium text-white">
                                {friend.full_name || friend.email.split('@')[0]}
                              </h4>
                              <p className="text-xs text-gray-500">{friend.title}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-[#00ffc1] transition-colors">
                              <MessageCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => removeFriend(friend.user_id)}
                              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-red-400 transition-colors"
                              title="Remove friend"
                            >
                              <UserMinus className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-3 text-sm">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setIsCreatePostOpen(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[rgba(0,255,193,0.1)] text-[#00ffc1] hover:bg-[rgba(0,255,193,0.15)] transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">New Post</span>
                </button>
                <button
                  onClick={() => setIsAddFriendOpen(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] text-gray-400 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="text-sm font-medium">Add Friend</span>
                </button>
              </div>
            </div>

            {/* Online Friends */}
            {friends.filter(f => f.status === 'online').length > 0 && (
              <div className="glass-card p-4">
                <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Online Now ({friends.filter(f => f.status === 'online').length})
                </h3>
                <div className="space-y-2">
                  {friends.filter(f => f.status === 'online').slice(0, 5).map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-[#00102e] font-bold text-xs">
                          {getInitials(friend.full_name, friend.email)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#00102e]" />
                      </div>
                      <span className="text-sm text-gray-300 truncate">
                        {friend.full_name || friend.email.split('@')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Tags */}
            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00ffc1]" />
                Trending
              </h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchQuery(tag)
                      setActiveTab('feed')
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] text-gray-400 hover:bg-[rgba(0,255,193,0.1)] hover:text-[#00ffc1] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Preview */}
            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Top Contributors
              </h3>
              <p className="text-sm text-gray-500">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <Modal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} title="Share with Community">
        <div className="space-y-4">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your insights, tips, or experiences... Use #hashtags to categorize your post."
            className="input-field min-h-[120px] resize-none"
            disabled={isCreatingPost}
          />

          <div className="text-xs text-gray-500">
            Tip: Use hashtags like #discovery, #closing, #objections to help others find your post
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsCreatePostOpen(false)}
              className="btn-secondary"
              disabled={isCreatingPost}
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePost}
              disabled={!newPostContent.trim() || isCreatingPost}
              className="btn-primary flex items-center gap-2"
            >
              {isCreatingPost ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Post
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Friend Modal */}
      <Modal isOpen={isAddFriendOpen} onClose={() => {
        setIsAddFriendOpen(false)
        setFriendSearchQuery('')
        setFriendSearchResults([])
      }} title="Add Friend">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={friendSearchQuery}
              onChange={(e) => {
                setFriendSearchQuery(e.target.value)
                searchUsers(e.target.value)
              }}
              className="input-field pl-12"
            />
          </div>

          {isSearchingFriends && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-[#00ffc1] animate-spin" />
            </div>
          )}

          {!isSearchingFriends && friendSearchQuery.length >= 2 && friendSearchResults.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
            </div>
          )}

          {friendSearchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {friendSearchResults.map((searchUser) => (
                <div
                  key={searchUser.id}
                  className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.02)] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {getInitials(searchUser.full_name, searchUser.email)}
                    </div>
                    <div>
                      <h4 className="font-medium text-white text-sm">
                        {searchUser.full_name || searchUser.email.split('@')[0]}
                      </h4>
                      <p className="text-xs text-gray-500">{searchUser.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(searchUser.id)}
                    className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {friendSearchQuery.length < 2 && (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Search for users to add as friends</p>
              <p className="text-xs mt-1">Enter at least 2 characters</p>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  )
}
