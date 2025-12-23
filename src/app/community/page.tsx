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
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import type { CommunityPost, PostComment, FeedFilter } from '@/types/community'

// Trending tags (static for now)
const TRENDING_TAGS = ['#coldcalling', '#discovery', '#closing', '#objections', '#enterprise', '#smb', '#nepq', '#challenger']

export default function CommunityPage() {
  // State
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [comments, setComments] = useState<Record<string, PostComment[]>>({})
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'groups'>('feed')
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [newComment, setNewComment] = useState<Record<string, string>>({})

  // Loading states
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()

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

  // Initial load
  useEffect(() => {
    fetchPosts(feedFilter)
  }, [feedFilter, fetchPosts])

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

    // Optimistic update
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
        // Revert on error
        setPosts(prev => prev.map(p =>
          p.id === postId
            ? { ...p, is_liked: post.is_liked, like_count: post.like_count }
            : p
        ))
        showToast('error', 'Failed to update like')
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      // Revert on error
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

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_saved: !p.is_saved } : p
    ))

    try {
      const response = await fetch(`/api/community/posts/${postId}/save`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        // Revert on error
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, is_saved: post.is_saved } : p
        ))
        showToast('error', 'Failed to save post')
      } else {
        showToast('success', data.saved ? 'Post saved!' : 'Post unsaved')
      }
    } catch (error) {
      console.error('Error toggling save:', error)
      // Revert on error
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, is_saved: post.is_saved } : p
      ))
    }
  }

  // Toggle follow
  const handleFollow = async (authorId: string) => {
    const post = posts.find(p => p.author.id === authorId)
    if (!post) return

    // Optimistic update
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
        // Revert on error
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
      // Revert on error
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
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
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
                            {/* Comment Input */}
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

                            {/* Comments List */}
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
              </div>
            </div>

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
                    onClick={() => setSearchQuery(tag)}
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
    </DashboardLayout>
  )
}
