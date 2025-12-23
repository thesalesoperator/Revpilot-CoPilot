'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  UserCircle,
  Plus,
  Search,
  Filter,
  Star,
  Users,
  Building2,
  Briefcase,
  Target,
  Brain,
  Zap,
  Clock,
  TrendingUp,
  Share2,
  Heart,
  Download,
  Edit,
  Trash2,
  Play,
  Copy,
  ChevronRight,
  Settings,
  Sparkles,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'

// Persona categories
const categories = [
  { id: 'all', label: 'All Personas', icon: Users },
  { id: 'executive', label: 'C-Suite', icon: Building2 },
  { id: 'technical', label: 'Technical', icon: Brain },
  { id: 'finance', label: 'Finance', icon: Briefcase },
  { id: 'champion', label: 'Champions', icon: Star },
  { id: 'blocker', label: 'Blockers', icon: Target },
]

// Difficulty levels
const difficulties = [
  { id: 'easy', label: 'Easy', color: 'text-green-400 bg-green-500/20' },
  { id: 'medium', label: 'Medium', color: 'text-yellow-400 bg-yellow-500/20' },
  { id: 'hard', label: 'Hard', color: 'text-orange-400 bg-orange-500/20' },
  { id: 'expert', label: 'Expert', color: 'text-red-400 bg-red-500/20' },
]

// Mock personas
const personas = [
  {
    id: '1',
    name: 'The Skeptical CFO',
    role: 'Chief Financial Officer',
    company: 'Enterprise Company',
    category: 'finance',
    difficulty: 'hard',
    avatar: '👔',
    description: 'Highly analytical, questions every ROI claim. Needs hard data and proof before any decision.',
    personality: ['Analytical', 'Risk-averse', 'Detail-oriented', 'Budget-conscious'],
    commonObjections: [
      "What's the total cost of ownership?",
      "Show me the ROI breakdown",
      "We need to run this by procurement",
      "Can you provide customer references in our industry?",
    ],
    voice: 'Professional, measured, asks probing questions',
    usageCount: 1245,
    rating: 4.8,
    createdBy: 'RevPilot Team',
    isOfficial: true,
    likes: 342,
  },
  {
    id: '2',
    name: 'The Busy Startup Founder',
    role: 'CEO / Founder',
    company: 'Series A Startup',
    category: 'executive',
    difficulty: 'medium',
    avatar: '🚀',
    description: 'Always in a hurry, values efficiency. Wants to see quick wins and immediate value.',
    personality: ['Fast-paced', 'Decisive', 'Impatient', 'Vision-driven'],
    commonObjections: [
      "I only have 5 minutes",
      "What's the quick win?",
      "We're moving fast, can you keep up?",
      "I need this yesterday",
    ],
    voice: 'Energetic, fast-talking, interrupts frequently',
    usageCount: 982,
    rating: 4.6,
    createdBy: 'SalesNinja',
    isOfficial: false,
    likes: 256,
  },
  {
    id: '3',
    name: 'The Technical Gatekeeper',
    role: 'VP of Engineering',
    company: 'Tech Company',
    category: 'technical',
    difficulty: 'hard',
    avatar: '🔧',
    description: 'Deep technical expert who will challenge every claim. Needs to validate architecture and security.',
    personality: ['Technical', 'Skeptical', 'Detail-focused', 'Security-conscious'],
    commonObjections: [
      "How does this integrate with our stack?",
      "What's your uptime SLA?",
      "Tell me about your security certifications",
      "Can I see the API documentation?",
    ],
    voice: 'Technical jargon, asks deep questions, wants specifics',
    usageCount: 756,
    rating: 4.7,
    createdBy: 'RevPilot Team',
    isOfficial: true,
    likes: 189,
  },
  {
    id: '4',
    name: 'The Enthusiastic Champion',
    role: 'Sales Manager',
    company: 'Mid-Market Company',
    category: 'champion',
    difficulty: 'easy',
    avatar: '⭐',
    description: 'Already sold on your solution, needs help building internal consensus and justifying the purchase.',
    personality: ['Supportive', 'Eager', 'Collaborative', 'Internal advocate'],
    commonObjections: [
      "How do I sell this to my boss?",
      "What materials can you give me?",
      "Who else in my industry uses this?",
      "Can you help me build the business case?",
    ],
    voice: 'Friendly, collaborative, asks for help',
    usageCount: 1567,
    rating: 4.4,
    createdBy: 'CloserKing',
    isOfficial: false,
    likes: 423,
  },
  {
    id: '5',
    name: 'The Status Quo Defender',
    role: 'Operations Director',
    company: 'Traditional Enterprise',
    category: 'blocker',
    difficulty: 'expert',
    avatar: '🛡️',
    description: 'Resistant to change, comfortable with current processes. Will find reasons to maintain status quo.',
    personality: ['Conservative', 'Risk-averse', 'Change-resistant', 'Process-oriented'],
    commonObjections: [
      "We've always done it this way",
      "The current system works fine",
      "Change is too disruptive",
      "Our team won't adopt new tools",
    ],
    voice: 'Defensive, dismissive, constantly deflecting',
    usageCount: 432,
    rating: 4.9,
    createdBy: 'RevPilot Team',
    isOfficial: true,
    likes: 156,
  },
  {
    id: '6',
    name: 'The Competitor Loyalist',
    role: 'IT Director',
    company: 'Enterprise Company',
    category: 'blocker',
    difficulty: 'expert',
    avatar: '⚔️',
    description: 'Currently using a competitor and happy with it. Will constantly compare you unfavorably.',
    personality: ['Loyal', 'Comparative', 'Challenging', 'Feature-focused'],
    commonObjections: [
      "Competitor X does this better",
      "Why should I switch?",
      "We just renewed our contract",
      "Your competitor gave us a better deal",
    ],
    voice: 'Challenging, constantly name-dropping competitor',
    usageCount: 389,
    rating: 4.8,
    createdBy: 'QuotaCrusher',
    isOfficial: false,
    likes: 134,
  },
]

export default function PersonasPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<typeof personas[0] | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const filteredPersonas = personas.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const startPractice = (persona: typeof personas[0]) => {
    showToast('success', `Starting practice with ${persona.name}`)
    // Navigate to practice with persona
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">AI Personas</h1>
            <p className="text-gray-400">Practice with custom buyer personas</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Create Persona
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search personas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffc1]"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-[rgba(0,255,193,0.2)] text-[#00ffc1] border border-[rgba(0,255,193,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Personas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonas.map((persona) => {
            const difficulty = difficulties.find((d) => d.id === persona.difficulty)
            return (
              <div key={persona.id} className="glass-card p-6 hover:scale-[1.02] transition-transform">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl">
                      {persona.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{persona.name}</h3>
                        {persona.isOfficial && (
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{persona.role}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${difficulty?.color}`}>
                    {difficulty?.label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{persona.description}</p>

                {/* Personality Traits */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {persona.personality.slice(0, 3).map((trait) => (
                    <span
                      key={trait}
                      className="px-2 py-0.5 rounded-full text-xs bg-[rgba(255,255,255,0.05)] text-gray-400"
                    >
                      {trait}
                    </span>
                  ))}
                  {persona.personality.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[rgba(255,255,255,0.05)] text-gray-400">
                      +{persona.personality.length - 3}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-gray-400">
                      <Star className="w-4 h-4 text-yellow-400" />
                      {persona.rating}
                    </span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <Play className="w-4 h-4" />
                      {persona.usageCount}
                    </span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <Heart className="w-4 h-4" />
                      {persona.likes}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => startPractice(persona)}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Practice
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPersona(persona)
                      setShowDetailModal(true)
                    }}
                    className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Creator */}
                <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                  <span className="text-xs text-gray-500">by {persona.createdBy}</span>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] text-gray-500 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] text-gray-500 transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredPersonas.length === 0 && (
          <div className="text-center py-12">
            <UserCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No personas found</p>
          </div>
        )}
      </div>

      {/* Create Persona Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Custom Persona">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Persona Name</label>
              <input
                type="text"
                placeholder="The Skeptical CFO"
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffc1]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Role/Title</label>
              <input
                type="text"
                placeholder="Chief Financial Officer"
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffc1]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
              <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ffc1]">
                {categories.slice(1).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Difficulty</label>
              <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ffc1]">
                {difficulties.map((diff) => (
                  <option key={diff.id} value={diff.id}>
                    {diff.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
            <textarea
              rows={3}
              placeholder="Describe this persona's behavior and what makes them challenging..."
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffc1] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Personality Traits (comma separated)
            </label>
            <input
              type="text"
              placeholder="Analytical, Risk-averse, Detail-oriented"
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffc1]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Common Objections (one per line)
            </label>
            <textarea
              rows={4}
              placeholder="What's the total cost of ownership?&#10;Show me the ROI breakdown&#10;We need to run this by procurement"
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffc1] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Voice Style</label>
            <input
              type="text"
              placeholder="Professional, measured, asks probing questions"
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffc1]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all"
            >
              Cancel
            </button>
            <button className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-semibold hover:opacity-90 transition-opacity">
              Create Persona
            </button>
          </div>
        </div>
      </Modal>

      {/* Persona Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedPersona?.name || ''}
      >
        {selectedPersona && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-5xl">
                {selectedPersona.avatar}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedPersona.name}</h3>
                <p className="text-gray-400">{selectedPersona.role}</p>
                <p className="text-sm text-gray-500">{selectedPersona.company}</p>
              </div>
            </div>

            <p className="text-gray-300">{selectedPersona.description}</p>

            <div>
              <h4 className="font-semibold text-white mb-2">Personality Traits</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPersona.personality.map((trait) => (
                  <span
                    key={trait}
                    className="px-3 py-1 rounded-full text-sm bg-[rgba(255,255,255,0.05)] text-gray-300"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">Common Objections</h4>
              <ul className="space-y-2">
                {selectedPersona.commonObjections.map((objection, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-400">
                    <span className="text-[#00ffc1]">•</span>
                    &ldquo;{objection}&rdquo;
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">Voice Style</h4>
              <p className="text-gray-400">{selectedPersona.voice}</p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.1)]">
              <button
                onClick={() => {
                  startPractice(selectedPersona)
                  setShowDetailModal(false)
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Practice
              </button>
              <button className="px-6 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
