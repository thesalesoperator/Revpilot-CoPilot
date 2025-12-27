'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserPlus,
  MessageCircle,
  Heart,
  Share2,
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
  UsersRound,
  LogOut,
  Crown,
  Globe,
  Lock,
  Play,
  Film,
  Eye,
  Quote,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CommunityPost,
  PostComment,
  FeedFilter,
  Friend,
  FriendRequest,
  CommunityGroup,
  CallClip,
  ClipComment,
  ClipCategory
} from '@/types/community'

// Trending tags (static for now)
const TRENDING_TAGS = ['#coldcalling', '#discovery', '#closing', '#objections', '#enterprise', '#smb', '#nepq', '#challenger']

// Clip categories
const CLIP_CATEGORIES: { value: ClipCategory; label: string }[] = [
  { value: 'objection_handling', label: 'Objection Handling' },
  { value: 'closing', label: 'Closing' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'rapport', label: 'Rapport Building' },
  { value: 'value_prop', label: 'Value Proposition' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'other', label: 'Other' },
]

export default function CommunityPage() {
  // Posts State
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [comments, setComments] = useState<Record<string, PostComment[]>>({})
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'groups' | 'clips'>('feed')
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

  // Groups State
  const [myGroups, setMyGroups] = useState<CommunityGroup[]>([])
  const [discoverGroups, setDiscoverGroups] = useState<CommunityGroup[]>([])
  const [groupsView, setGroupsView] = useState<'my' | 'discover'>('my')
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newGroupPrivate, setNewGroupPrivate] = useState(false)
  const [groupSearchQuery, setGroupSearchQuery] = useState('')

  // Clips State
  const [clips, setClips] = useState<CallClip[]>([])
  const [myClips, setMyClips] = useState<CallClip[]>([])
  const [clipsView, setClipsView] = useState<'community' | 'my'>('community')
  const [clipCategoryFilter, setClipCategoryFilter] = useState<ClipCategory | 'all'>('all')
  const [isCreateClipOpen, setIsCreateClipOpen] = useState(false)
  const [newClipTitle, setNewClipTitle] = useState('')
  const [newClipDescription, setNewClipDescription] = useState('')
  const [newClipExcerpt, setNewClipExcerpt] = useState('')
  const [newClipCategory, setNewClipCategory] = useState<ClipCategory | ''>('')
  const [newClipShared, setNewClipShared] = useState(true)
  const [clipComments, setClipComments] = useState<Record<string, ClipComment[]>>({})
  const [expandedClipComments, setExpandedClipComments] = useState<Set<string>>(new Set())
  const [newClipComment, setNewClipComment] = useState<Record<string, string>>({})
  const [selectedClip, setSelectedClip] = useState<CallClip | null>(null)

  // Loading states
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [processingGroupId, setProcessingGroupId] = useState<string | null>(null)
  const [isLoadingClips, setIsLoadingClips] = useState(false)
  const [isCreatingClip, setIsCreatingClip] = useState(false)

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

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    setIsLoadingGroups(true)
    try {
      const [myRes, discoverRes] = await Promise.all([
        fetch('/api/community/groups/my'),
        fetch('/api/community/groups'),
      ])

      const myData = await myRes.json()
      const discoverData = await discoverRes.json()

      if (myRes.ok) {
        setMyGroups(myData.groups || [])
      }
      if (discoverRes.ok) {
        // Filter out groups user is already a member of
        const myGroupIds = new Set((myData.groups || []).map((g: CommunityGroup) => g.id))
        setDiscoverGroups((discoverData.groups || []).filter((g: CommunityGroup) => !myGroupIds.has(g.id)))
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setIsLoadingGroups(false)
    }
  }, [])

  // Fetch clips
  const fetchClips = useCallback(async () => {
    setIsLoadingClips(true)
    try {
      const params = new URLSearchParams()
      if (clipCategoryFilter !== 'all') {
        params.append('category', clipCategoryFilter)
      }

      const [communityRes, myRes] = await Promise.all([
        fetch(`/api/community/clips?${params}`),
        fetch('/api/community/clips/my'),
      ])

      const communityData = await communityRes.json()
      const myData = await myRes.json()

      if (communityRes.ok) {
        setClips(communityData.clips || [])
      }
      if (myRes.ok) {
        setMyClips(myData.clips || [])
      }
    } catch (error) {
      console.error('Error fetching clips:', error)
    } finally {
      setIsLoadingClips(false)
    }
  }, [clipCategoryFilter])

  // Initial load
  useEffect(() => {
    fetchPosts(feedFilter)
  }, [feedFilter, fetchPosts])

  // Load friends when tab changes
  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriendsData()
    }
  }, [activeTab, fetchFriendsData])

  // Load groups when tab changes
  useEffect(() => {
    if (activeTab === 'groups') {
      fetchGroups()
    }
  }, [activeTab, fetchGroups])

  // Load clips when tab changes or filter changes
  useEffect(() => {
    if (activeTab === 'clips') {
      fetchClips()
    }
  }, [activeTab, fetchClips])

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

  // Create group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return

    setIsCreatingGroup(true)
    try {
      const response = await fetch('/api/community/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || undefined,
          is_private: newGroupPrivate,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMyGroups(prev => [data.group, ...prev])
        setNewGroupName('')
        setNewGroupDescription('')
        setNewGroupPrivate(false)
        setIsCreateGroupOpen(false)
        showToast('success', 'Group created!')
      } else {
        showToast('error', data.error || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      showToast('error', 'Failed to create group')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  // Join group
  const joinGroup = async (groupId: string) => {
    setProcessingGroupId(groupId)
    try {
      const response = await fetch(`/api/community/groups/${groupId}/join`, {
        method: 'POST',
      })

      if (response.ok) {
        const group = discoverGroups.find(g => g.id === groupId)
        if (group) {
          setMyGroups(prev => [{ ...group, is_member: true, member_count: group.member_count + 1 }, ...prev])
          setDiscoverGroups(prev => prev.filter(g => g.id !== groupId))
        }
        showToast('success', 'Joined group!')
      } else {
        const data = await response.json()
        showToast('error', data.error || 'Failed to join group')
      }
    } catch (error) {
      console.error('Error joining group:', error)
      showToast('error', 'Failed to join group')
    } finally {
      setProcessingGroupId(null)
    }
  }

  // Leave group
  const leaveGroup = async (groupId: string) => {
    setProcessingGroupId(groupId)
    try {
      const response = await fetch(`/api/community/groups/${groupId}/leave`, {
        method: 'POST',
      })

      if (response.ok) {
        const group = myGroups.find(g => g.id === groupId)
        if (group && !group.is_private) {
          setDiscoverGroups(prev => [{ ...group, is_member: false, member_count: Math.max(0, group.member_count - 1) }, ...prev])
        }
        setMyGroups(prev => prev.filter(g => g.id !== groupId))
        showToast('success', 'Left group')
      } else {
        const data = await response.json()
        showToast('error', data.error || 'Failed to leave group')
      }
    } catch (error) {
      console.error('Error leaving group:', error)
      showToast('error', 'Failed to leave group')
    } finally {
      setProcessingGroupId(null)
    }
  }

  // Create clip
  const handleCreateClip = async () => {
    if (!newClipTitle.trim() || !newClipExcerpt.trim()) return

    setIsCreatingClip(true)
    try {
      const response = await fetch('/api/community/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newClipTitle.trim(),
          description: newClipDescription.trim() || undefined,
          transcript_excerpt: newClipExcerpt.trim(),
          category: newClipCategory || undefined,
          is_shared: newClipShared,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (newClipShared) {
          setClips(prev => [data.clip, ...prev])
        }
        setMyClips(prev => [data.clip, ...prev])
        setNewClipTitle('')
        setNewClipDescription('')
        setNewClipExcerpt('')
        setNewClipCategory('')
        setNewClipShared(true)
        setIsCreateClipOpen(false)
        showToast('success', 'Clip created!')
      } else {
        showToast('error', data.error || 'Failed to create clip')
      }
    } catch (error) {
      console.error('Error creating clip:', error)
      showToast('error', 'Failed to create clip')
    } finally {
      setIsCreatingClip(false)
    }
  }

  // Toggle clip like
  const handleClipLike = async (clipId: string) => {
    const updateClips = (clipsList: CallClip[]) =>
      clipsList.map(c =>
        c.id === clipId
          ? { ...c, is_liked: !c.is_liked, like_count: c.is_liked ? c.like_count - 1 : c.like_count + 1 }
          : c
      )

    setClips(updateClips)
    setMyClips(updateClips)

    try {
      const response = await fetch(`/api/community/clips/${clipId}/like`, { method: 'POST' })
      if (!response.ok) {
        // Revert on error
        setClips(updateClips)
        setMyClips(updateClips)
      }
    } catch (error) {
      setClips(updateClips)
      setMyClips(updateClips)
    }
  }

  // Toggle clip save
  const handleClipSave = async (clipId: string) => {
    const updateClips = (clipsList: CallClip[]) =>
      clipsList.map(c => c.id === clipId ? { ...c, is_saved: !c.is_saved } : c)

    setClips(updateClips)
    setMyClips(updateClips)

    try {
      const response = await fetch(`/api/community/clips/${clipId}/save`, { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        showToast('success', data.saved ? 'Clip saved!' : 'Clip unsaved')
      } else {
        setClips(updateClips)
        setMyClips(updateClips)
      }
    } catch (error) {
      setClips(updateClips)
      setMyClips(updateClips)
    }
  }

  // Load clip comments
  const loadClipComments = async (clipId: string) => {
    try {
      const response = await fetch(`/api/community/clips/${clipId}/comments`)
      const data = await response.json()
      if (response.ok) {
        setClipComments(prev => ({ ...prev, [clipId]: data.comments }))
      }
    } catch (error) {
      console.error('Error loading clip comments:', error)
    }
  }

  // Toggle clip comments
  const toggleClipComments = async (clipId: string) => {
    const newExpanded = new Set(expandedClipComments)
    if (newExpanded.has(clipId)) {
      newExpanded.delete(clipId)
    } else {
      newExpanded.add(clipId)
      if (!clipComments[clipId]) {
        await loadClipComments(clipId)
      }
    }
    setExpandedClipComments(newExpanded)
  }

  // Add clip comment
  const handleAddClipComment = async (clipId: string) => {
    const content = newClipComment[clipId]?.trim()
    if (!content) return

    try {
      const response = await fetch(`/api/community/clips/${clipId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await response.json()
      if (response.ok) {
        setClipComments(prev => ({ ...prev, [clipId]: [...(prev[clipId] || []), data.comment] }))
        const updateClips = (clipsList: CallClip[]) =>
          clipsList.map(c => c.id === clipId ? { ...c, comment_count: c.comment_count + 1 } : c)
        setClips(updateClips)
        setMyClips(updateClips)
        setNewClipComment(prev => ({ ...prev, [clipId]: '' }))
      }
    } catch (error) {
      showToast('error', 'Failed to add comment')
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
      const response = await fetch(`/api/community/posts/${postId}/like`, { method: 'POST' })
      if (!response.ok) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, is_liked: post.is_liked, like_count: post.like_count } : p
        ))
      }
    } catch (error) {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, is_liked: post.is_liked, like_count: post.like_count } : p
      ))
    }
  }

  // Toggle save
  const handleSave = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_saved: !p.is_saved } : p))

    try {
      const response = await fetch(`/api/community/posts/${postId}/save`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_saved: post.is_saved } : p))
      } else {
        showToast('success', data.saved ? 'Post saved!' : 'Post unsaved')
      }
    } catch (error) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_saved: post.is_saved } : p))
    }
  }

  // Toggle follow
  const handleFollow = async (authorId: string) => {
    const post = posts.find(p => p.author.id === authorId)
    if (!post) return

    setPosts(prev => prev.map(p =>
      p.author.id === authorId ? { ...p, is_following_author: !p.is_following_author } : p
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
          p.author.id === authorId ? { ...p, is_following_author: post.is_following_author } : p
        ))
      } else {
        showToast('success', data.following ? 'Following!' : 'Unfollowed')
      }
    } catch (error) {
      setPosts(prev => prev.map(p =>
        p.author.id === authorId ? { ...p, is_following_author: post.is_following_author } : p
      ))
    }
  }

  // Load comments
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

  // Toggle comments
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
        setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data.comment] }))
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
        setNewComment(prev => ({ ...prev, [postId]: '' }))
      }
    } catch (error) {
      showToast('error', 'Failed to add comment')
    }
  }

  // Helper functions
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

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return email[0].toUpperCase()
  }

  const getCategoryLabel = (category: ClipCategory | null) => {
    if (!category) return 'Uncategorized'
    return CLIP_CATEGORIES.find(c => c.value === category)?.label || category
  }

  const getCategoryColor = (category: ClipCategory | null) => {
    const colors: Record<string, string> = {
      objection_handling: 'from-gray-500 to-[#5eead4]',
      closing: 'from-[#5eead4] to-emerald-500',
      discovery: 'from-[#5eead4] to-[#5eead4]',
      rapport: 'from-[#5eead4] to-[#5eead4]',
      value_prop: 'from-[#5eead4] to-[#5eead4]',
      negotiation: 'from-indigo-500 to-violet-500',
      other: 'from-gray-500 to-slate-500',
    }
    return colors[category || 'other'] || colors.other
  }

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      post.content.toLowerCase().includes(query) ||
      post.author.full_name?.toLowerCase().includes(query) ||
      post.tags.some(tag => tag.toLowerCase().includes(query))
    )
  })

  const filteredDiscoverGroups = discoverGroups.filter(group => {
    if (!groupSearchQuery) return true
    return group.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
  })

  const displayedClips = clipsView === 'community' ? clips : myClips

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="w-8 h-8 text-[#5eead4]" />
              Community
            </h1>
            <p className="text-gray-400">Connect, share, and learn from top sales professionals</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
              {incomingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 rounded-full text-xs text-white flex items-center justify-center">
                  {incomingRequests.length}
                </span>
              )}
            </button>
            <button onClick={() => setIsCreatePostOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Share Post
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-[rgba(255,255,255,0.05)] pb-4">
          {[
            { id: 'feed', label: 'Feed', icon: MessageSquare },
            { id: 'clips', label: 'Call Clips', icon: Film, count: clips.length },
            { id: 'friends', label: 'Friends', icon: Users, count: friends.length },
            { id: 'groups', label: 'Groups', icon: UsersRound, count: myGroups.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-[#5eead4] text-[#0a0a0f] font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {'count' in tab && tab.count !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-[#0a0a0f]/20' : 'bg-[rgba(255,255,255,0.1)]'
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(['all', 'following'] as FeedFilter[]).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setFeedFilter(filter)}
                        className={`px-4 py-2 rounded-xl text-sm transition-all ${
                          feedFilter === filter
                            ? 'bg-[rgba(94,234,212,0.1)] text-[#5eead4] border border-[rgba(94,234,212,0.3)]'
                            : 'text-gray-400 hover:text-white bg-[rgba(255,255,255,0.02)]'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                    <button
                      onClick={() => fetchPosts(feedFilter)}
                      className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
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

                {isLoadingPosts && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#5eead4] animate-spin" />
                  </div>
                )}

                {!isLoadingPosts && filteredPosts.length === 0 && (
                  <div className="glass-card p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
                    <p className="text-gray-400 mb-4">
                      {feedFilter === 'following' ? 'Follow some users to see their posts here' : 'Be the first to share something!'}
                    </p>
                    <button onClick={() => setIsCreatePostOpen(true)} className="btn-primary">Create Post</button>
                  </div>
                )}

                {!isLoadingPosts && (
                  <div className="space-y-4">
                    {filteredPosts.map((post) => (
                      <div key={post.id} className="glass-card p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center text-[#0a0a0f] font-bold">
                              {getInitials(post.author.full_name, post.author.email)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">{post.author.full_name || post.author.email.split('@')[0]}</h3>
                                {!post.is_following_author && post.author.id !== user?.id && (
                                  <button onClick={() => handleFollow(post.author.id)} className="text-xs text-[#5eead4] hover:underline">Follow</button>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{post.author.title}</p>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">{formatRelativeTime(post.created_at)}</span>
                        </div>

                        <p className="text-gray-300 mb-4 whitespace-pre-wrap">{post.content}</p>

                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map((tag) => (
                              <span key={tag} className="text-xs px-2 py-1 rounded-full bg-[rgba(94,234,212,0.1)] text-[#5eead4]">#{tag}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.05)]">
                          <div className="flex items-center gap-4">
                            <button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 transition-colors ${post.is_liked ? 'text-gray-400' : 'text-gray-400 hover:text-gray-400'}`}>
                              <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
                              <span>{post.like_count}</span>
                            </button>
                            <button onClick={() => toggleComments(post.id)} className={`flex items-center gap-2 transition-colors ${expandedComments.has(post.id) ? 'text-[#5eead4]' : 'text-gray-400 hover:text-[#5eead4]'}`}>
                              <MessageCircle className="w-5 h-5" />
                              <span>{post.comment_count}</span>
                            </button>
                            <button className="flex items-center gap-2 text-gray-400 hover:text-[#5eead4] transition-colors">
                              <Share2 className="w-5 h-5" />
                              <span>{post.share_count}</span>
                            </button>
                          </div>
                          <button onClick={() => handleSave(post.id)} className={post.is_saved ? 'text-[#5eead4]' : 'text-gray-400 hover:text-[#5eead4]'}>
                            {post.is_saved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                          </button>
                        </div>

                        {expandedComments.has(post.id) && (
                          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                            <div className="flex gap-3 mb-4">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center text-[#0a0a0f] font-bold text-sm flex-shrink-0">
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
                                <button onClick={() => handleAddComment(post.id)} disabled={!newComment[post.id]?.trim()} className="p-2 rounded-lg bg-[#5eead4] text-[#0a0a0f] hover:bg-[#4fd1c5] disabled:opacity-50">
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {comments[post.id]?.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5eead4] to-[#5eead4] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {getInitials(comment.author.full_name, comment.author.email)}
                                  </div>
                                  <div className="flex-1 bg-[rgba(255,255,255,0.02)] rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-white text-sm">{comment.author.full_name || comment.author.email.split('@')[0]}</span>
                                      <span className="text-xs text-gray-500">{formatRelativeTime(comment.created_at)}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                              {comments[post.id]?.length === 0 && <p className="text-gray-500 text-sm text-center py-2">No comments yet</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {hasMorePosts && !isLoadingPosts && (
                      <div className="flex justify-center pt-4">
                        <button onClick={() => fetchPosts(feedFilter, nextCursor)} disabled={isLoadingMore} className="btn-secondary flex items-center gap-2">
                          {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                          Load More
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Clips Tab */}
            {activeTab === 'clips' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(['community', 'my'] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => setClipsView(view)}
                        className={`px-4 py-2 rounded-xl text-sm transition-all ${
                          clipsView === view
                            ? 'bg-[rgba(94,234,212,0.1)] text-[#5eead4] border border-[rgba(94,234,212,0.3)]'
                            : 'text-gray-400 hover:text-white bg-[rgba(255,255,255,0.02)]'
                        }`}
                      >
                        {view === 'community' ? 'Community Clips' : 'My Clips'}
                      </button>
                    ))}
                    <button
                      onClick={() => fetchClips()}
                      className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingClips ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <button onClick={() => setIsCreateClipOpen(true)} className="btn-primary text-sm py-2 px-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Clip
                  </button>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setClipCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      clipCategoryFilter === 'all'
                        ? 'bg-[#5eead4] text-[#0a0a0f] font-semibold'
                        : 'bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {CLIP_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setClipCategoryFilter(cat.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                        clipCategoryFilter === cat.value
                          ? 'bg-[#5eead4] text-[#0a0a0f] font-semibold'
                          : 'bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {isLoadingClips ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#5eead4] animate-spin" />
                  </div>
                ) : displayedClips.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <Film className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {clipsView === 'my' ? 'No clips yet' : 'No shared clips'}
                    </h3>
                    <p className="text-gray-400 mb-4">
                      {clipsView === 'my'
                        ? 'Create your first call clip to share your best sales moments!'
                        : 'Be the first to share a call clip with the community!'}
                    </p>
                    <button onClick={() => setIsCreateClipOpen(true)} className="btn-primary">Create Clip</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedClips.map((clip) => (
                      <div key={clip.id} className="glass-card p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center text-[#0a0a0f] font-bold">
                              {getInitials(clip.author.full_name, clip.author.email)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{clip.author.full_name || clip.author.email.split('@')[0]}</h3>
                              <p className="text-sm text-gray-500">{clip.author.title}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {clip.category && (
                              <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(clip.category)} text-white`}>
                                {getCategoryLabel(clip.category)}
                              </span>
                            )}
                            <span className="text-sm text-gray-500">{formatRelativeTime(clip.shared_at || clip.created_at)}</span>
                          </div>
                        </div>

                        <h4 className="text-lg font-semibold text-white mb-2">{clip.title}</h4>
                        {clip.description && <p className="text-gray-400 text-sm mb-3">{clip.description}</p>}

                        {/* Transcript Excerpt */}
                        <div className="bg-[rgba(0,0,0,0.3)] rounded-xl p-4 mb-4 border-l-4 border-[#5eead4]">
                          <Quote className="w-5 h-5 text-[#5eead4] mb-2" />
                          <p className="text-gray-300 italic whitespace-pre-wrap">&ldquo;{clip.transcript_excerpt}&rdquo;</p>
                          {clip.call_title && (
                            <p className="text-xs text-gray-500 mt-2">From: {clip.call_title}</p>
                          )}
                        </div>

                        {clip.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {clip.tags.map((tag) => (
                              <span key={tag} className="text-xs px-2 py-1 rounded-full bg-[rgba(94,234,212,0.1)] text-[#5eead4]">#{tag}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.05)]">
                          <div className="flex items-center gap-4">
                            <button onClick={() => handleClipLike(clip.id)} className={`flex items-center gap-2 transition-colors ${clip.is_liked ? 'text-gray-400' : 'text-gray-400 hover:text-gray-400'}`}>
                              <Heart className={`w-5 h-5 ${clip.is_liked ? 'fill-current' : ''}`} />
                              <span>{clip.like_count}</span>
                            </button>
                            <button onClick={() => toggleClipComments(clip.id)} className={`flex items-center gap-2 transition-colors ${expandedClipComments.has(clip.id) ? 'text-[#5eead4]' : 'text-gray-400 hover:text-[#5eead4]'}`}>
                              <MessageCircle className="w-5 h-5" />
                              <span>{clip.comment_count}</span>
                            </button>
                            <span className="flex items-center gap-2 text-gray-500">
                              <Eye className="w-5 h-5" />
                              <span>{clip.view_count}</span>
                            </span>
                          </div>
                          <button onClick={() => handleClipSave(clip.id)} className={clip.is_saved ? 'text-[#5eead4]' : 'text-gray-400 hover:text-[#5eead4]'}>
                            {clip.is_saved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                          </button>
                        </div>

                        {expandedClipComments.has(clip.id) && (
                          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                            <div className="flex gap-3 mb-4">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center text-[#0a0a0f] font-bold text-sm flex-shrink-0">
                                {user?.email?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Write a comment..."
                                  value={newClipComment[clip.id] || ''}
                                  onChange={(e) => setNewClipComment(prev => ({ ...prev, [clip.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddClipComment(clip.id)}
                                  className="input-field flex-1 py-2 text-sm"
                                />
                                <button onClick={() => handleAddClipComment(clip.id)} disabled={!newClipComment[clip.id]?.trim()} className="p-2 rounded-lg bg-[#5eead4] text-[#0a0a0f] hover:bg-[#4fd1c5] disabled:opacity-50">
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {clipComments[clip.id]?.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5eead4] to-[#5eead4] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {getInitials(comment.author.full_name, comment.author.email)}
                                  </div>
                                  <div className="flex-1 bg-[rgba(255,255,255,0.02)] rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-white text-sm">{comment.author.full_name || comment.author.email.split('@')[0]}</span>
                                      <span className="text-xs text-gray-500">{formatRelativeTime(comment.created_at)}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                              {clipComments[clip.id]?.length === 0 && <p className="text-gray-500 text-sm text-center py-2">No comments yet</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="space-y-6">
                {incomingRequests.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-[#5eead4]" />
                      Friend Requests ({incomingRequests.length})
                    </h3>
                    <div className="space-y-3">
                      {incomingRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[gray-400] to-[#5eead4] flex items-center justify-center text-white font-bold">
                              {getInitials(request.user.full_name, request.user.email)}
                            </div>
                            <div>
                              <h4 className="font-medium text-white">{request.user.full_name || request.user.email.split('@')[0]}</h4>
                              <p className="text-xs text-gray-500">{request.user.title} • {formatRelativeTime(request.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => acceptFriendRequest(request.id)} disabled={processingRequestId === request.id} className="p-2 rounded-lg bg-[#5eead4] text-[#0a0a0f] hover:bg-[#4fd1c5] disabled:opacity-50">
                              {processingRequestId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button onClick={() => declineFriendRequest(request.id)} disabled={processingRequestId === request.id} className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-400 hover:bg-[rgba(255,255,255,0.1)]">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {outgoingRequests.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#5eead4]" />
                      Pending Requests ({outgoingRequests.length})
                    </h3>
                    <div className="space-y-3">
                      {outgoingRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-bold text-sm">
                              {getInitials(request.user.full_name, request.user.email)}
                            </div>
                            <div>
                              <h4 className="font-medium text-white text-sm">{request.user.full_name || request.user.email.split('@')[0]}</h4>
                              <p className="text-xs text-gray-500">{request.user.title}</p>
                            </div>
                          </div>
                          <span className="text-xs text-[#5eead4] bg-[#5eead4]/10 px-2 py-1 rounded">Pending</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#5eead4]" />
                      Your Friends ({friends.length})
                    </h3>
                    <button onClick={() => setIsAddFriendOpen(true)} className="btn-secondary text-sm py-2 px-3 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </button>
                  </div>

                  {isLoadingFriends ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-[#5eead4] animate-spin" />
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400 mb-4">No friends yet</p>
                      <button onClick={() => setIsAddFriendOpen(true)} className="btn-primary">Find Friends</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl hover:border-[rgba(94,234,212,0.2)] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center text-[#0a0a0f] font-bold">
                                {getInitials(friend.full_name, friend.email)}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0f] ${friend.status === 'online' ? 'bg-[#5eead4]' : 'bg-gray-500'}`} />
                            </div>
                            <div>
                              <h4 className="font-medium text-white">{friend.full_name || friend.email.split('@')[0]}</h4>
                              <p className="text-xs text-gray-500">{friend.title}</p>
                            </div>
                          </div>
                          <button onClick={() => removeFriend(friend.user_id)} className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-gray-400">
                            <UserMinus className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(['my', 'discover'] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => setGroupsView(view)}
                        className={`px-4 py-2 rounded-xl text-sm transition-all ${
                          groupsView === view
                            ? 'bg-[rgba(94,234,212,0.1)] text-[#5eead4] border border-[rgba(94,234,212,0.3)]'
                            : 'text-gray-400 hover:text-white bg-[rgba(255,255,255,0.02)]'
                        }`}
                      >
                        {view === 'my' ? 'My Groups' : 'Discover'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setIsCreateGroupOpen(true)} className="btn-primary text-sm py-2 px-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Group
                  </button>
                </div>

                {isLoadingGroups ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#5eead4] animate-spin" />
                  </div>
                ) : groupsView === 'my' ? (
                  myGroups.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                      <UsersRound className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No groups yet</h3>
                      <p className="text-gray-400 mb-4">Join a group or create your own!</p>
                      <div className="flex gap-3 justify-center">
                        <button onClick={() => setGroupsView('discover')} className="btn-secondary">Discover Groups</button>
                        <button onClick={() => setIsCreateGroupOpen(true)} className="btn-primary">Create Group</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myGroups.map((group) => (
                        <div key={group.id} className="glass-card p-5 hover:border-[rgba(94,234,212,0.2)] transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#5eead4] flex items-center justify-center text-white font-bold text-lg">
                                {group.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-white">{group.name}</h3>
                                  {group.is_admin && <Crown className="w-4 h-4 text-[#5eead4]" />}
                                  {group.is_private ? <Lock className="w-3 h-3 text-gray-500" /> : <Globe className="w-3 h-3 text-gray-500" />}
                                </div>
                                <p className="text-sm text-gray-500">{group.member_count} members</p>
                              </div>
                            </div>
                          </div>
                          {group.description && <p className="text-gray-400 text-sm mb-4 line-clamp-2">{group.description}</p>}
                          <div className="flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.05)]">
                            <button className="text-sm text-[#5eead4] hover:underline">View Group</button>
                            {!group.is_admin && (
                              <button
                                onClick={() => leaveGroup(group.id)}
                                disabled={processingGroupId === group.id}
                                className="text-sm text-gray-400 hover:text-gray-400 flex items-center gap-1"
                              >
                                {processingGroupId === group.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                                Leave
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search groups..."
                        value={groupSearchQuery}
                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                        className="input-field pl-10 py-2 w-full"
                      />
                    </div>
                    {filteredDiscoverGroups.length === 0 ? (
                      <div className="glass-card p-12 text-center">
                        <UsersRound className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No groups to discover</h3>
                        <p className="text-gray-400 mb-4">Be the first to create a group!</p>
                        <button onClick={() => setIsCreateGroupOpen(true)} className="btn-primary">Create Group</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDiscoverGroups.map((group) => (
                          <div key={group.id} className="glass-card p-5 hover:border-[rgba(94,234,212,0.2)] transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#5eead4] flex items-center justify-center text-white font-bold text-lg">
                                  {group.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-white">{group.name}</h3>
                                  <p className="text-sm text-gray-500">{group.member_count} members</p>
                                </div>
                              </div>
                            </div>
                            {group.description && <p className="text-gray-400 text-sm mb-4 line-clamp-2">{group.description}</p>}
                            <button
                              onClick={() => joinGroup(group.id)}
                              disabled={processingGroupId === group.id}
                              className="w-full btn-primary text-sm py-2 flex items-center justify-center gap-2"
                            >
                              {processingGroupId === group.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                              Join Group
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-3 text-sm">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => setIsCreatePostOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[rgba(94,234,212,0.1)] text-[#5eead4] hover:bg-[rgba(94,234,212,0.15)] transition-colors">
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">New Post</span>
                </button>
                <button onClick={() => setIsCreateClipOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] text-gray-400 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors">
                  <Film className="w-5 h-5" />
                  <span className="text-sm font-medium">Share Call Clip</span>
                </button>
                <button onClick={() => setIsAddFriendOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] text-gray-400 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors">
                  <UserPlus className="w-5 h-5" />
                  <span className="text-sm font-medium">Add Friend</span>
                </button>
                <button onClick={() => { setActiveTab('groups'); setIsCreateGroupOpen(true) }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] text-gray-400 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors">
                  <UsersRound className="w-5 h-5" />
                  <span className="text-sm font-medium">Create Group</span>
                </button>
              </div>
            </div>

            {/* My Groups Preview */}
            {myGroups.length > 0 && (
              <div className="glass-card p-4">
                <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                  <UsersRound className="w-4 h-4 text-[#5eead4]" />
                  My Groups
                </h3>
                <div className="space-y-2">
                  {myGroups.slice(0, 3).map((group) => (
                    <div key={group.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors" onClick={() => setActiveTab('groups')}>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5eead4] to-[#5eead4] flex items-center justify-center text-white font-bold text-xs">
                        {group.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-300 truncate">{group.name}</span>
                    </div>
                  ))}
                  {myGroups.length > 3 && (
                    <button onClick={() => setActiveTab('groups')} className="text-xs text-[#5eead4] hover:underline">View all {myGroups.length} groups</button>
                  )}
                </div>
              </div>
            )}

            {/* My Clips Preview */}
            {myClips.length > 0 && (
              <div className="glass-card p-4">
                <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#5eead4]" />
                  My Clips
                </h3>
                <div className="space-y-2">
                  {myClips.slice(0, 3).map((clip) => (
                    <div key={clip.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors" onClick={() => { setActiveTab('clips'); setClipsView('my') }}>
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getCategoryColor(clip.category)} flex items-center justify-center text-white`}>
                        <Play className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-300 truncate">{clip.title}</span>
                    </div>
                  ))}
                  {myClips.length > 3 && (
                    <button onClick={() => { setActiveTab('clips'); setClipsView('my') }} className="text-xs text-[#5eead4] hover:underline">View all {myClips.length} clips</button>
                  )}
                </div>
              </div>
            )}

            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5eead4]" />
                Trending
              </h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag) => (
                  <button key={tag} onClick={() => { setSearchQuery(tag); setActiveTab('feed') }} className="text-xs px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] text-gray-400 hover:bg-[rgba(94,234,212,0.1)] hover:text-[#5eead4] transition-colors">
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#5eead4]" />
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
          <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="Share your insights, tips, or experiences..." className="input-field min-h-[120px] resize-none" disabled={isCreatingPost} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsCreatePostOpen(false)} className="btn-secondary" disabled={isCreatingPost}>Cancel</button>
            <button onClick={handleCreatePost} disabled={!newPostContent.trim() || isCreatingPost} className="btn-primary flex items-center gap-2">
              {isCreatingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Clip Modal */}
      <Modal isOpen={isCreateClipOpen} onClose={() => { setIsCreateClipOpen(false); setNewClipTitle(''); setNewClipDescription(''); setNewClipExcerpt(''); setNewClipCategory(''); setNewClipShared(true) }} title="Create Call Clip">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
            <input type="text" placeholder="e.g., Perfect objection handling response" value={newClipTitle} onChange={(e) => setNewClipTitle(e.target.value)} className="input-field" disabled={isCreatingClip} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Transcript Excerpt *</label>
            <textarea placeholder="Paste the transcript excerpt you want to share..." value={newClipExcerpt} onChange={(e) => setNewClipExcerpt(e.target.value)} className="input-field min-h-[100px] resize-none" disabled={isCreatingClip} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea placeholder="Add context about this clip..." value={newClipDescription} onChange={(e) => setNewClipDescription(e.target.value)} className="input-field min-h-[60px] resize-none" disabled={isCreatingClip} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select value={newClipCategory} onChange={(e) => setNewClipCategory(e.target.value as ClipCategory | '')} className="input-field" disabled={isCreatingClip}>
              <option value="">Select a category</option>
              {CLIP_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setNewClipShared(!newClipShared)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${newClipShared ? 'bg-[rgba(94,234,212,0.1)] text-[#5eead4] border border-[rgba(94,234,212,0.3)]' : 'bg-[rgba(255,255,255,0.02)] text-gray-400'}`}>
              {newClipShared ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {newClipShared ? 'Public' : 'Private'}
            </button>
            <span className="text-xs text-gray-500">{newClipShared ? 'Visible to the community' : 'Only visible to you'}</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsCreateClipOpen(false)} className="btn-secondary" disabled={isCreatingClip}>Cancel</button>
            <button onClick={handleCreateClip} disabled={!newClipTitle.trim() || !newClipExcerpt.trim() || isCreatingClip} className="btn-primary flex items-center gap-2">
              {isCreatingClip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
              Create Clip
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Friend Modal */}
      <Modal isOpen={isAddFriendOpen} onClose={() => { setIsAddFriendOpen(false); setFriendSearchQuery(''); setFriendSearchResults([]) }} title="Add Friend">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="text" placeholder="Search by name or email..." value={friendSearchQuery} onChange={(e) => { setFriendSearchQuery(e.target.value); searchUsers(e.target.value) }} className="input-field pl-12" />
          </div>
          {isSearchingFriends && <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 text-[#5eead4] animate-spin" /></div>}
          {!isSearchingFriends && friendSearchQuery.length >= 2 && friendSearchResults.length === 0 && (
            <div className="text-center py-6 text-gray-500"><Users className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No users found</p></div>
          )}
          {friendSearchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {friendSearchResults.map((searchUser) => (
                <div key={searchUser.id} className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.02)] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5eead4] to-[#5eead4] flex items-center justify-center text-white font-bold text-sm">{getInitials(searchUser.full_name, searchUser.email)}</div>
                    <div>
                      <h4 className="font-medium text-white text-sm">{searchUser.full_name || searchUser.email.split('@')[0]}</h4>
                      <p className="text-xs text-gray-500">{searchUser.title}</p>
                    </div>
                  </div>
                  <button onClick={() => sendFriendRequest(searchUser.id)} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"><UserPlus className="w-4 h-4" />Add</button>
                </div>
              ))}
            </div>
          )}
          {friendSearchQuery.length < 2 && <div className="text-center py-8 text-gray-500"><UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Search for users to add as friends</p></div>}
        </div>
      </Modal>

      {/* Create Group Modal */}
      <Modal isOpen={isCreateGroupOpen} onClose={() => { setIsCreateGroupOpen(false); setNewGroupName(''); setNewGroupDescription(''); setNewGroupPrivate(false) }} title="Create Group">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Group Name *</label>
            <input type="text" placeholder="e.g., Enterprise Sales Pros" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="input-field" disabled={isCreatingGroup} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea placeholder="What's this group about?" value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} className="input-field min-h-[80px] resize-none" disabled={isCreatingGroup} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setNewGroupPrivate(!newGroupPrivate)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${newGroupPrivate ? 'bg-[rgba(94,234,212,0.1)] text-[#5eead4] border border-[rgba(94,234,212,0.3)]' : 'bg-[rgba(255,255,255,0.02)] text-gray-400'}`}>
              {newGroupPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              {newGroupPrivate ? 'Private' : 'Public'}
            </button>
            <span className="text-xs text-gray-500">{newGroupPrivate ? 'Only invited members can join' : 'Anyone can discover and join'}</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsCreateGroupOpen(false)} className="btn-secondary" disabled={isCreatingGroup}>Cancel</button>
            <button onClick={handleCreateGroup} disabled={!newGroupName.trim() || isCreatingGroup} className="btn-primary flex items-center gap-2">
              {isCreatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Group
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
