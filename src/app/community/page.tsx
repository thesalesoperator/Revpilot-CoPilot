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
  Play,
  Pause,
  Bookmark,
  BookmarkCheck,
  Send,
  Image,
  Scissors,
  Trophy,
  TrendingUp,
  Clock,
  ChevronDown,
  Search,
  Bell,
  Settings,
  Plus,
  X,
  Check,
  Star,
  Flame,
  Award,
  Target,
  MessageSquare,
  Volume2,
  VolumeX,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

// Types
interface CommunityPost {
  id: string
  author: {
    id: string
    name: string
    avatar: string
    title: string
    isFollowing: boolean
  }
  content: string
  clip?: {
    id: string
    title: string
    duration: number
    thumbnail: string
    audioUrl: string
    callScore?: number
    highlights?: string[]
  }
  likes: number
  comments: number
  shares: number
  isLiked: boolean
  isSaved: boolean
  createdAt: string
  tags: string[]
}

interface Friend {
  id: string
  name: string
  avatar: string
  title: string
  status: 'online' | 'offline' | 'busy'
  lastActive?: string
  mutualFriends?: number
}

interface FriendRequest {
  id: string
  from: Friend
  createdAt: string
}

interface Group {
  id: string
  name: string
  avatar: string
  memberCount: number
  description: string
  isJoined: boolean
  recentActivity?: string
}

// Mock Data
const MOCK_POSTS: CommunityPost[] = [
  {
    id: '1',
    author: {
      id: 'u1',
      name: 'Sarah Chen',
      avatar: 'SC',
      title: 'Enterprise AE @ TechCorp',
      isFollowing: true,
    },
    content: '🔥 Just closed a $250K deal using the NEPQ framework! Here\'s the exact moment where the prospect convinced themselves. Listen to how I used silence strategically.',
    clip: {
      id: 'c1',
      title: 'The Perfect Silence Close',
      duration: 47,
      thumbnail: '',
      audioUrl: '',
      callScore: 94,
      highlights: ['Strategic pause at 0:23', 'Prospect self-closes at 0:38'],
    },
    likes: 234,
    comments: 45,
    shares: 12,
    isLiked: false,
    isSaved: false,
    createdAt: '2h ago',
    tags: ['closing', 'nepq', 'enterprise'],
  },
  {
    id: '2',
    author: {
      id: 'u2',
      name: 'Marcus Johnson',
      avatar: 'MJ',
      title: 'SDR Team Lead @ StartupXYZ',
      isFollowing: false,
    },
    content: 'Sharing this discovery call because I think I could have done better on the pain identification. Would love feedback from the community! 🙏',
    clip: {
      id: 'c2',
      title: 'Discovery Call - Feedback Wanted',
      duration: 124,
      thumbnail: '',
      audioUrl: '',
      callScore: 72,
    },
    likes: 89,
    comments: 67,
    shares: 3,
    isLiked: true,
    isSaved: true,
    createdAt: '5h ago',
    tags: ['discovery', 'feedback', 'learning'],
  },
  {
    id: '3',
    author: {
      id: 'u3',
      name: 'Emily Rodriguez',
      avatar: 'ER',
      title: 'Sales Manager @ GrowthCo',
      isFollowing: true,
    },
    content: 'My team has been using the Challenger approach for 3 months now. Here\'s a compilation of our best objection handling moments. Training gold! 💪',
    clip: {
      id: 'c3',
      title: 'Challenger Objection Handling Compilation',
      duration: 312,
      thumbnail: '',
      audioUrl: '',
      callScore: 88,
      highlights: ['Price objection flip', 'Competitor comparison', 'Timeline urgency'],
    },
    likes: 567,
    comments: 123,
    shares: 89,
    isLiked: false,
    isSaved: false,
    createdAt: '1d ago',
    tags: ['challenger', 'objections', 'training'],
  },
]

const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Alex Thompson', avatar: 'AT', title: 'AE @ Salesforce', status: 'online' },
  { id: 'f2', name: 'Jordan Lee', avatar: 'JL', title: 'SDR @ HubSpot', status: 'online' },
  { id: 'f3', name: 'Casey Williams', avatar: 'CW', title: 'Sales Lead @ Stripe', status: 'busy' },
  { id: 'f4', name: 'Taylor Brown', avatar: 'TB', title: 'BDR @ Zoom', status: 'offline', lastActive: '2h ago' },
]

const MOCK_REQUESTS: FriendRequest[] = [
  { id: 'r1', from: { id: 'f5', name: 'Morgan Smith', avatar: 'MS', title: 'AE @ Gong', status: 'online', mutualFriends: 5 }, createdAt: '1h ago' },
  { id: 'r2', from: { id: 'f6', name: 'Riley Davis', avatar: 'RD', title: 'SDR @ Outreach', status: 'offline', mutualFriends: 12 }, createdAt: '3h ago' },
]

const MOCK_GROUPS: Group[] = [
  { id: 'g1', name: 'Enterprise Sales Pros', avatar: '🏢', memberCount: 1243, description: 'For AEs closing $100K+ deals', isJoined: true, recentActivity: '5m ago' },
  { id: 'g2', name: 'SDR Nation', avatar: '📞', memberCount: 3567, description: 'Tips, tricks, and memes for SDRs', isJoined: true, recentActivity: '12m ago' },
  { id: 'g3', name: 'NEPQ Masters', avatar: '🎯', memberCount: 892, description: 'Jeremy Miner methodology enthusiasts', isJoined: false },
  { id: 'g4', name: 'Challenger Champions', avatar: '⚔️', memberCount: 2134, description: 'Teaching customers to think differently', isJoined: false },
]

const TRENDING_TAGS = ['#coldcalling', '#discovery', '#closing', '#objections', '#enterprise', '#smb', '#nepq', '#challenger']

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_POSTS)
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS)
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(MOCK_REQUESTS)
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS)
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'groups'>('feed')
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'trending'>('all')
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [playingClipId, setPlayingClipId] = useState<string | null>(null)

  const { user } = useAuth()
  const { showToast } = useToast()
  const supabase = createClient()

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleLike = (postId: string) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ))
  }

  const handleSave = (postId: string) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, isSaved: !post.isSaved }
        : post
    ))
    showToast('success', 'Post saved to your collection')
  }

  const handleFollow = (authorId: string) => {
    setPosts(posts.map(post =>
      post.author.id === authorId
        ? { ...post, author: { ...post.author, isFollowing: !post.author.isFollowing } }
        : post
    ))
  }

  const handleAcceptRequest = (requestId: string) => {
    const request = friendRequests.find(r => r.id === requestId)
    if (request) {
      setFriends([...friends, { ...request.from, status: 'online' }])
      setFriendRequests(friendRequests.filter(r => r.id !== requestId))
      showToast('success', `You are now friends with ${request.from.name}`)
    }
  }

  const handleDeclineRequest = (requestId: string) => {
    setFriendRequests(friendRequests.filter(r => r.id !== requestId))
  }

  const handleJoinGroup = (groupId: string) => {
    setGroups(groups.map(group =>
      group.id === groupId
        ? { ...group, isJoined: !group.isJoined, memberCount: group.isJoined ? group.memberCount - 1 : group.memberCount + 1 }
        : group
    ))
  }

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return

    const newPost: CommunityPost = {
      id: `p${Date.now()}`,
      author: {
        id: user?.id || 'me',
        name: user?.user_metadata?.full_name || 'You',
        avatar: user?.email?.[0]?.toUpperCase() || 'U',
        title: 'Sales Professional',
        isFollowing: false,
      },
      content: newPostContent,
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      isSaved: false,
      createdAt: 'Just now',
      tags: [],
    }

    setPosts([newPost, ...posts])
    setNewPostContent('')
    setIsCreatePostOpen(false)
    showToast('success', 'Post published to the community!')
  }

  const getStatusColor = (status: Friend['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
    }
  }

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
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {friendRequests.length}
              </span>
            </button>
            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Share Clip
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-[rgba(255,255,255,0.05)] pb-4">
          {[
            { id: 'feed', label: 'Feed', icon: MessageSquare },
            { id: 'friends', label: 'Friends', icon: Users, count: friends.length },
            { id: 'groups', label: 'Groups', icon: Users, count: groups.filter(g => g.isJoined).length },
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
              {tab.count !== undefined && (
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
            {activeTab === 'feed' && (
              <>
                {/* Feed Filters */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {['all', 'following', 'trending'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setFeedFilter(filter as typeof feedFilter)}
                        className={`px-4 py-2 rounded-xl text-sm transition-all ${
                          feedFilter === filter
                            ? 'bg-[rgba(0,255,193,0.1)] text-[#00ffc1] border border-[rgba(0,255,193,0.3)]'
                            : 'text-gray-400 hover:text-white bg-[rgba(255,255,255,0.02)]'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
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

                {/* Posts */}
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="glass-card p-6">
                      {/* Author Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-[#00102e] font-bold">
                            {post.author.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">{post.author.name}</h3>
                              {!post.author.isFollowing && post.author.id !== user?.id && (
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
                          <span className="text-sm text-gray-500">{post.createdAt}</span>
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

                      {/* Clip Preview */}
                      {post.clip && (
                        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setPlayingClipId(playingClipId === post.clip?.id ? null : post.clip?.id || null)}
                                className="w-12 h-12 rounded-full bg-[#00ffc1] flex items-center justify-center hover:scale-105 transition-transform"
                              >
                                {playingClipId === post.clip.id ? (
                                  <Pause className="w-5 h-5 text-[#00102e]" />
                                ) : (
                                  <Play className="w-5 h-5 text-[#00102e] ml-1" />
                                )}
                              </button>
                              <div>
                                <h4 className="font-medium text-white">{post.clip.title}</h4>
                                <p className="text-sm text-gray-500">{formatDuration(post.clip.duration)}</p>
                              </div>
                            </div>
                            {post.clip.callScore && (
                              <div className={`px-3 py-1 rounded-lg ${
                                post.clip.callScore >= 80 ? 'bg-green-500/20 text-green-400' :
                                post.clip.callScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                <span className="font-bold">{post.clip.callScore}</span>
                                <span className="text-xs ml-1">score</span>
                              </div>
                            )}
                          </div>

                          {/* Audio Waveform Placeholder */}
                          <div className="h-16 bg-[rgba(255,255,255,0.02)] rounded-lg flex items-center justify-center gap-1 mb-3">
                            {[...Array(50)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-1 rounded-full transition-all ${
                                  playingClipId === post.clip?.id ? 'bg-[#00ffc1]' : 'bg-gray-600'
                                }`}
                                style={{
                                  height: `${Math.random() * 40 + 10}px`,
                                  opacity: playingClipId === post.clip?.id ? 1 : 0.5,
                                }}
                              />
                            ))}
                          </div>

                          {/* Highlights */}
                          {post.clip.highlights && post.clip.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {post.clip.highlights.map((highlight, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-1 rounded bg-[rgba(255,255,255,0.05)] text-gray-400"
                                >
                                  ⭐ {highlight}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-2 transition-colors ${
                              post.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                            }`}
                          >
                            <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                            <span>{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-2 text-gray-400 hover:text-[#00ffc1] transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span>{post.comments}</span>
                          </button>
                          <button className="flex items-center gap-2 text-gray-400 hover:text-[#00ffc1] transition-colors">
                            <Share2 className="w-5 h-5" />
                            <span>{post.shares}</span>
                          </button>
                        </div>
                        <button
                          onClick={() => handleSave(post.id)}
                          className={`transition-colors ${
                            post.isSaved ? 'text-[#00ffc1]' : 'text-gray-400 hover:text-[#00ffc1]'
                          }`}
                        >
                          {post.isSaved ? (
                            <BookmarkCheck className="w-5 h-5" />
                          ) : (
                            <Bookmark className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'friends' && (
              <div className="space-y-6">
                {/* Friend Requests */}
                {friendRequests.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-[#00ffc1]" />
                      Friend Requests ({friendRequests.length})
                    </h3>
                    <div className="space-y-3">
                      {friendRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.02)] rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6b8a] to-[#ffbe57] flex items-center justify-center text-white font-bold text-sm">
                              {request.from.avatar}
                            </div>
                            <div>
                              <h4 className="font-medium text-white">{request.from.name}</h4>
                              <p className="text-xs text-gray-500">
                                {request.from.title} • {request.from.mutualFriends} mutual friends
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptRequest(request.id)}
                              className="p-2 rounded-lg bg-[#00ffc1] text-[#00102e] hover:bg-[#00d9a6] transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(request.id)}
                              className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-400 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl hover:border-[rgba(0,255,193,0.2)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-[#00102e] font-bold">
                              {friend.avatar}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#00102e] ${getStatusColor(friend.status)}`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{friend.name}</h4>
                            <p className="text-xs text-gray-500">{friend.title}</p>
                            {friend.status === 'offline' && friend.lastActive && (
                              <p className="text-xs text-gray-600">Last active {friend.lastActive}</p>
                            )}
                          </div>
                        </div>
                        <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-[#00ffc1] transition-colors">
                          <MessageCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="space-y-6">
                {/* Your Groups */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#00ffc1]" />
                      Your Groups
                    </h3>
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="btn-secondary text-sm py-2 px-3 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create Group
                    </button>
                  </div>
                  <div className="space-y-3">
                    {groups.filter(g => g.isJoined).map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl hover:border-[rgba(0,255,193,0.2)] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[rgba(0,255,193,0.1)] flex items-center justify-center text-2xl">
                            {group.avatar}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{group.name}</h4>
                            <p className="text-xs text-gray-500">
                              {group.memberCount.toLocaleString()} members
                              {group.recentActivity && ` • Active ${group.recentActivity}`}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-500 -rotate-90" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discover Groups */}
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-[#00ffc1]" />
                    Discover Groups
                  </h3>
                  <div className="space-y-3">
                    {groups.filter(g => !g.isJoined).map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-2xl">
                            {group.avatar}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{group.name}</h4>
                            <p className="text-xs text-gray-500">{group.description}</p>
                            <p className="text-xs text-gray-600">{group.memberCount.toLocaleString()} members</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleJoinGroup(group.id)}
                          className="btn-primary text-sm py-2 px-4"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
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
                  <Scissors className="w-5 h-5" />
                  <span className="text-sm font-medium">Clip a Call</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] text-gray-400 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Share to Group</span>
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
                    className="text-xs px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] text-gray-400 hover:bg-[rgba(0,255,193,0.1)] hover:text-[#00ffc1] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Online Friends */}
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
                        {friend.avatar}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#00102e]" />
                    </div>
                    <span className="text-sm text-gray-300 truncate">{friend.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard Preview */}
            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Top Contributors
              </h3>
              <div className="space-y-2">
                {[
                  { rank: 1, name: 'Sarah C.', score: 12450, badge: '🏆' },
                  { rank: 2, name: 'Marcus J.', score: 11200, badge: '🥈' },
                  { rank: 3, name: 'Emily R.', score: 10890, badge: '🥉' },
                ].map((user) => (
                  <div
                    key={user.rank}
                    className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(255,255,255,0.02)]"
                  >
                    <span className="text-lg">{user.badge}</span>
                    <div className="flex-1">
                      <p className="text-sm text-white">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.score.toLocaleString()} XP</p>
                    </div>
                  </div>
                ))}
              </div>
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
            placeholder="Share your insights, tips, or a call clip..."
            className="input-field min-h-[120px] resize-none"
          />

          <div className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.02)] rounded-xl">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(0,255,193,0.1)] text-[#00ffc1] hover:bg-[rgba(0,255,193,0.15)] transition-colors">
              <Scissors className="w-4 h-4" />
              <span className="text-sm">Attach Clip</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-400 hover:bg-[rgba(255,255,255,0.1)] transition-colors">
              <Image className="w-4 h-4" />
              <span className="text-sm">Add Image</span>
            </button>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsCreatePostOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePost}
              disabled={!newPostContent.trim()}
              className="btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Post
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Friend Modal */}
      <Modal isOpen={isAddFriendOpen} onClose={() => setIsAddFriendOpen(false)} title="Add Friend">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input-field pl-12"
            />
          </div>

          <div className="text-center py-8 text-gray-500">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Search for users to add as friends</p>
          </div>
        </div>
      </Modal>

      {/* Create Group Modal */}
      <Modal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} title="Create Group">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Group Name</label>
            <input
              type="text"
              placeholder="e.g., Enterprise Sales Team"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              placeholder="What is this group about?"
              className="input-field min-h-[80px] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Privacy</label>
            <div className="flex gap-3">
              <button className="flex-1 p-3 rounded-xl border border-[#00ffc1] bg-[rgba(0,255,193,0.1)] text-[#00ffc1]">
                <p className="font-medium">Public</p>
                <p className="text-xs opacity-70">Anyone can join</p>
              </button>
              <button className="flex-1 p-3 rounded-xl border border-[rgba(255,255,255,0.1)] text-gray-400 hover:border-[rgba(255,255,255,0.2)]">
                <p className="font-medium">Private</p>
                <p className="text-xs opacity-70">Invite only</p>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsCreateGroupOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button className="btn-primary">
              Create Group
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
