'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  Shield,
  Search,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Plus,
  Filter,
  TrendingUp,
  Clock,
  Star,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Play,
  User,
  Award,
  Flame,
  Copy,
  Check,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'

// Objection categories
const categories = [
  { id: 'all', label: 'All Objections', count: 156 },
  { id: 'price', label: 'Price & Budget', count: 42 },
  { id: 'timing', label: 'Timing', count: 28 },
  { id: 'authority', label: 'Authority', count: 23 },
  { id: 'competition', label: 'Competition', count: 31 },
  { id: 'need', label: 'Need/Fit', count: 19 },
  { id: 'trust', label: 'Trust', count: 13 },
]

// Mock objections data
const objections = [
  {
    id: '1',
    objection: "It's too expensive",
    category: 'price',
    responses: [
      {
        id: 'r1',
        text: "I completely understand budget is a concern. Let me ask - when you say it's too expensive, are you comparing it to doing nothing, a competitor, or is it about the total investment? Because if we can show a 10x return, would the investment make sense?",
        author: 'SalesNinja',
        authorLevel: 15,
        upvotes: 234,
        downvotes: 12,
        comments: 18,
        isTopResponse: true,
        createdAt: '2024-01-15',
      },
      {
        id: 'r2',
        text: "That's fair feedback. Many of our best customers felt the same way initially. What they found was that the cost of NOT solving this problem was actually much higher. Can you walk me through what this challenge is costing you today?",
        author: 'CloserKing',
        authorLevel: 18,
        upvotes: 189,
        downvotes: 8,
        comments: 12,
        createdAt: '2024-01-20',
      },
      {
        id: 'r3',
        text: "I appreciate you being upfront about that. Let's back up - if price wasn't a factor, is this the solution you'd want to move forward with? [If yes] Great, let's talk about how we can make the investment work for your budget.",
        author: 'DealHunter',
        authorLevel: 12,
        upvotes: 145,
        downvotes: 15,
        comments: 8,
        createdAt: '2024-02-01',
      },
    ],
    totalViews: 4521,
    savedCount: 312,
    difficulty: 'common',
  },
  {
    id: '2',
    objection: "We're happy with our current solution",
    category: 'competition',
    responses: [
      {
        id: 'r4',
        text: "That's great to hear - it means you've already solved the problem at some level. I'm curious though, if you could wave a magic wand and improve one thing about your current setup, what would it be?",
        author: 'QuotaCrusher',
        authorLevel: 22,
        upvotes: 312,
        downvotes: 5,
        comments: 24,
        isTopResponse: true,
        createdAt: '2024-01-10',
      },
      {
        id: 'r5',
        text: "I respect that loyalty. Just out of curiosity, when was the last time you evaluated alternatives? The market has changed significantly, and I'd hate for you to miss out on innovations that could give you a competitive edge.",
        author: 'RevRocket',
        authorLevel: 10,
        upvotes: 178,
        downvotes: 11,
        comments: 9,
        createdAt: '2024-01-25',
      },
    ],
    totalViews: 3892,
    savedCount: 256,
    difficulty: 'hard',
  },
  {
    id: '3',
    objection: 'I need to think about it',
    category: 'timing',
    responses: [
      {
        id: 'r6',
        text: "Absolutely, this is an important decision. To help you think it through, what specific aspects are you weighing? Is it the fit, the timing, or the investment? I want to make sure you have all the info you need.",
        author: 'PitchPerfect',
        authorLevel: 14,
        upvotes: 267,
        downvotes: 9,
        comments: 19,
        isTopResponse: true,
        createdAt: '2024-01-18',
      },
      {
        id: 'r7',
        text: "I appreciate that you want to be thorough. In my experience, 'think about it' often means there's something specific that's not quite clicking. What's the one thing that, if I could address it right now, would make this a clear yes or no for you?",
        author: 'SalesNinja',
        authorLevel: 15,
        upvotes: 201,
        downvotes: 14,
        comments: 11,
        createdAt: '2024-02-05',
      },
    ],
    totalViews: 5234,
    savedCount: 423,
    difficulty: 'common',
  },
  {
    id: '4',
    objection: "I need to run this by my boss/team",
    category: 'authority',
    responses: [
      {
        id: 'r8',
        text: "That makes total sense - decisions like this shouldn't be made in a vacuum. To set you up for success in that conversation, what questions do you think they'll have? Let's make sure you have compelling answers for each one.",
        author: 'CloserKing',
        authorLevel: 18,
        upvotes: 289,
        downvotes: 7,
        comments: 22,
        isTopResponse: true,
        createdAt: '2024-01-12',
      },
    ],
    totalViews: 3156,
    savedCount: 198,
    difficulty: 'medium',
  },
  {
    id: '5',
    objection: "We don't have budget right now",
    category: 'price',
    responses: [
      {
        id: 'r9',
        text: "I hear you - budget cycles are real. Help me understand though: is this a 'we literally have no budget' situation, or more of a 'this wasn't planned for' situation? Because if it's the latter, companies often find budget for things that solve urgent problems.",
        author: 'QuotaCrusher',
        authorLevel: 22,
        upvotes: 356,
        downvotes: 8,
        comments: 28,
        isTopResponse: true,
        createdAt: '2024-01-08',
      },
    ],
    totalViews: 4123,
    savedCount: 289,
    difficulty: 'hard',
  },
]

const difficultyColors = {
  common: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Common' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Medium' },
  hard: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Hard' },
}

export default function ObjectionsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'saved'>('popular')
  const [expandedObjection, setExpandedObjection] = useState<string | null>('1')
  const [showAddModal, setShowAddModal] = useState(false)
  const [savedObjections, setSavedObjections] = useState<Set<string>>(new Set(['1', '3']))
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredObjections = objections.filter((obj) => {
    if (selectedCategory !== 'all' && obj.category !== selectedCategory) return false
    if (searchQuery && !obj.objection.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const toggleSave = (id: string) => {
    setSavedObjections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
        showToast('success', 'Removed from saved')
      } else {
        newSet.add(id)
        showToast('success', 'Saved to your library')
      }
      return newSet
    })
  }

  const copyResponse = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    showToast('success', 'Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Objection Library</h1>
            <p className="text-gray-400">Crowdsourced responses to common sales objections</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] text-[#0a0a0f] font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Add Objection
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search objections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#5eead4]"
            />
          </div>
          <div className="flex items-center gap-2">
            {['popular', 'recent', 'saved'].map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort as typeof sortBy)}
                className={`px-4 py-2 rounded-xl transition-all capitalize ${
                  sortBy === sort
                    ? 'bg-[rgba(94,234,212,0.2)] text-[#5eead4] border border-[rgba(94,234,212,0.3)]'
                    : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {sort === 'popular' && <TrendingUp className="w-4 h-4 inline mr-1" />}
                {sort === 'recent' && <Clock className="w-4 h-4 inline mr-1" />}
                {sort === 'saved' && <Bookmark className="w-4 h-4 inline mr-1" />}
                {sort}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-4">Categories</h3>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-[rgba(94,234,212,0.1)] text-[#5eead4]'
                        : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-sm opacity-60">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Top Contributors */}
            <div className="glass-card p-4 mt-6">
              <h3 className="font-semibold text-white mb-4">Top Contributors</h3>
              <div className="space-y-3">
                {[
                  { name: 'QuotaCrusher', level: 22, contributions: 45 },
                  { name: 'SalesNinja', level: 15, contributions: 38 },
                  { name: 'CloserKing', level: 18, contributions: 32 },
                ].map((contributor, index) => (
                  <div key={contributor.name} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-500 text-black'
                          : index === 1
                            ? 'bg-gray-400 text-black'
                            : 'bg-amber-700 text-white'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{contributor.name}</p>
                      <p className="text-xs text-gray-500">Lv.{contributor.level}</p>
                    </div>
                    <span className="text-sm text-[#5eead4]">{contributor.contributions}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Objections List */}
          <div className="lg:col-span-3 space-y-4">
            {filteredObjections.map((objection) => {
              const isExpanded = expandedObjection === objection.id
              const difficulty = difficultyColors[objection.difficulty as keyof typeof difficultyColors]

              return (
                <div key={objection.id} className="glass-card overflow-hidden">
                  {/* Objection Header */}
                  <button
                    onClick={() => setExpandedObjection(isExpanded ? null : objection.id)}
                    className="w-full p-6 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            &ldquo;{objection.objection}&rdquo;
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${difficulty.bg} ${difficulty.text}`}>
                            {difficulty.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>{objection.responses.length} responses</span>
                          <span>{objection.totalViews.toLocaleString()} views</span>
                          <span>{objection.savedCount} saved</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSave(objection.id)
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            savedObjections.has(objection.id)
                              ? 'bg-[#5eead4]/20 text-[#5eead4]'
                              : 'hover:bg-[rgba(255,255,255,0.1)] text-gray-400'
                          }`}
                        >
                          {savedObjections.has(objection.id) ? (
                            <BookmarkCheck className="w-5 h-5" />
                          ) : (
                            <Bookmark className="w-5 h-5" />
                          )}
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Responses */}
                  {isExpanded && (
                    <div className="border-t border-[rgba(255,255,255,0.1)]">
                      {objection.responses.map((response, index) => (
                        <div
                          key={response.id}
                          className={`p-6 ${
                            index < objection.responses.length - 1
                              ? 'border-b border-[rgba(255,255,255,0.05)]'
                              : ''
                          } ${response.isTopResponse ? 'bg-[rgba(94,234,212,0.02)]' : ''}`}
                        >
                          {response.isTopResponse && (
                            <div className="flex items-center gap-2 mb-3">
                              <Award className="w-4 h-4 text-yellow-400" />
                              <span className="text-xs font-semibold text-yellow-400">TOP RESPONSE</span>
                            </div>
                          )}
                          <p className="text-gray-300 mb-4 leading-relaxed">{response.text}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                                  {response.author[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{response.author}</p>
                                  <p className="text-xs text-gray-500">Level {response.authorLevel}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button className="flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors">
                                  <ThumbsUp className="w-4 h-4" />
                                  <span className="text-sm">{response.upvotes}</span>
                                </button>
                                <button className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors">
                                  <ThumbsDown className="w-4 h-4" />
                                  <span className="text-sm">{response.downvotes}</span>
                                </button>
                                <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                                  <MessageSquare className="w-4 h-4" />
                                  <span className="text-sm">{response.comments}</span>
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyResponse(response.text, response.id)}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                              >
                                {copiedId === response.id ? (
                                  <>
                                    <Check className="w-4 h-4 text-green-400" />
                                    <span className="text-sm text-green-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    <span className="text-sm">Copy</span>
                                  </>
                                )}
                              </button>
                              <button className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[rgba(94,234,212,0.1)] text-[#5eead4] hover:bg-[rgba(94,234,212,0.2)] transition-colors">
                                <Play className="w-4 h-4" />
                                <span className="text-sm">Practice</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add Response */}
                      <div className="p-6 bg-[rgba(255,255,255,0.02)]">
                        <button className="w-full py-3 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2">
                          <Plus className="w-5 h-5" />
                          Add Your Response
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add Objection Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Objection">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Objection</label>
            <input
              type="text"
              placeholder='e.g., "We need to see more case studies"'
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#5eead4]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
            <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#5eead4]">
              {categories.slice(1).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Your Response</label>
            <textarea
              rows={4}
              placeholder="Share your best response to this objection..."
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#5eead4] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all"
            >
              Cancel
            </button>
            <button className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] text-[#0a0a0f] font-semibold hover:opacity-90 transition-opacity">
              Submit
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
