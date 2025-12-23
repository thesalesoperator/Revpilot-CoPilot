'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  Users,
  Star,
  MessageSquare,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Award,
  Search,
  Filter,
  ChevronRight,
  Video,
  Phone,
  Mail,
  Heart,
  Bookmark,
  CheckCircle,
  Zap,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'

// Mentor categories
const categories = [
  { id: 'all', label: 'All Mentors' },
  { id: 'closing', label: 'Closing' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'enterprise', label: 'Enterprise Sales' },
  { id: 'outbound', label: 'Outbound' },
  { id: 'leadership', label: 'Leadership' },
]

// Mock mentors
const mentors = [
  {
    id: '1',
    name: 'Sarah Chen',
    title: 'Enterprise Account Executive',
    company: 'Salesforce',
    avatar: '👩‍💼',
    expertise: ['Enterprise Sales', 'Executive Selling', 'Complex Deals'],
    rating: 4.9,
    reviews: 47,
    sessions: 156,
    yearsExperience: 12,
    bio: 'Former President\'s Club winner with $5M+ annual quota attainment. Specializing in enterprise sales cycles and C-suite engagement.',
    achievements: ['President\'s Club 5x', '$50M+ Career Revenue', 'Top 1% Performer'],
    availability: 'Available',
    hourlyRate: 150,
    responseTime: '< 24 hours',
    languages: ['English', 'Mandarin'],
    category: 'enterprise',
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    title: 'VP of Sales',
    company: 'HubSpot',
    avatar: '👨‍💼',
    expertise: ['Sales Leadership', 'Team Building', 'Revenue Operations'],
    rating: 4.8,
    reviews: 32,
    sessions: 98,
    yearsExperience: 15,
    bio: 'Built and scaled sales teams from 5 to 100+. Expert in creating high-performance sales cultures and processes.',
    achievements: ['Built $100M ARR Team', 'Published Author', 'LinkedIn Top Voice'],
    availability: 'Limited',
    hourlyRate: 200,
    responseTime: '< 48 hours',
    languages: ['English'],
    category: 'leadership',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    title: 'Senior SDR Manager',
    company: 'Outreach',
    avatar: '👩‍🎤',
    expertise: ['Outbound Prospecting', 'Cold Calling', 'Email Sequences'],
    rating: 4.9,
    reviews: 89,
    sessions: 234,
    yearsExperience: 8,
    bio: 'Master of outbound sales development. Trained 200+ SDRs who have collectively booked 10,000+ meetings.',
    achievements: ['200+ SDRs Trained', '10k+ Meetings Booked', 'Outreach Certified'],
    availability: 'Available',
    hourlyRate: 100,
    responseTime: '< 12 hours',
    languages: ['English', 'Spanish'],
    category: 'outbound',
  },
  {
    id: '4',
    name: 'David Park',
    title: 'Closing Coach',
    company: 'Independent',
    avatar: '🎯',
    expertise: ['Negotiation', 'Closing Techniques', 'Deal Strategy'],
    rating: 5.0,
    reviews: 156,
    sessions: 412,
    yearsExperience: 18,
    bio: 'Legendary closer with experience closing 500+ enterprise deals. Expert in negotiation psychology and deal strategy.',
    achievements: ['500+ Deals Closed', 'Former CRO', '$200M Lifetime Revenue'],
    availability: 'Waitlist',
    hourlyRate: 250,
    responseTime: 'By appointment',
    languages: ['English', 'Korean'],
    category: 'closing',
  },
]

// Mentorship programs
const programs = [
  {
    id: '1',
    name: '30-Day Closing Bootcamp',
    mentor: 'David Park',
    description: 'Intensive program to master closing techniques',
    duration: '30 days',
    sessions: 8,
    price: 1500,
    spots: 3,
    enrolled: 12,
    rating: 4.9,
  },
  {
    id: '2',
    name: 'Enterprise Sales Mastery',
    mentor: 'Sarah Chen',
    description: 'Learn to navigate complex enterprise deals',
    duration: '8 weeks',
    sessions: 16,
    price: 2500,
    spots: 5,
    enrolled: 8,
    rating: 4.8,
  },
  {
    id: '3',
    name: 'Outbound Excellence',
    mentor: 'Emily Rodriguez',
    description: 'Master cold outreach and booking meetings',
    duration: '4 weeks',
    sessions: 8,
    price: 800,
    spots: 10,
    enrolled: 22,
    rating: 4.9,
  },
]

// Upcoming sessions
const upcomingSessions = [
  {
    mentor: 'Sarah Chen',
    topic: 'Navigating Enterprise Procurement',
    date: '2024-02-22',
    time: '2:00 PM',
    type: 'video',
  },
  {
    mentor: 'Emily Rodriguez',
    topic: 'Cold Email Review',
    date: '2024-02-25',
    time: '10:00 AM',
    type: 'call',
  },
]

export default function MentorshipPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMentor, setSelectedMentor] = useState<typeof mentors[0] | null>(null)
  const [showMentorModal, setShowMentorModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'browse' | 'programs' | 'sessions'>('browse')

  const filteredMentors = mentors.filter((m) => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const bookSession = (mentor: typeof mentors[0]) => {
    showToast('success', `Session request sent to ${mentor.name}`)
    setShowMentorModal(false)
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Mentorship</h1>
            <p className="text-gray-400">Connect with top performers and accelerate your growth</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white transition-colors">
              <BookOpen className="w-5 h-5" />
              Become a Mentor
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {upcomingSessions.length > 0 && (
          <div className="glass-card p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Calendar className="w-6 h-6 text-[#00ffc1]" />
                <div>
                  <p className="text-white font-medium">Next Session</p>
                  <p className="text-sm text-gray-400">
                    {upcomingSessions[0].topic} with {upcomingSessions[0].mentor}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">
                  {upcomingSessions[0].date} at {upcomingSessions[0].time}
                </span>
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-semibold hover:opacity-90 transition-opacity">
                  Join Call
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'browse', label: 'Browse Mentors' },
            { id: 'programs', label: 'Programs' },
            { id: 'sessions', label: 'My Sessions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-[rgba(0,255,193,0.2)] text-[#00ffc1] border border-[rgba(0,255,193,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'browse' && (
          <>
            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search mentors..."
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
                  className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-[rgba(0,255,193,0.2)] text-[#00ffc1] border border-[rgba(0,255,193,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Mentors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMentors.map((mentor) => (
                <div key={mentor.id} className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl">
                      {mentor.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{mentor.name}</h3>
                          <p className="text-sm text-gray-400">{mentor.title}</p>
                          <p className="text-xs text-gray-500">{mentor.company}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            mentor.availability === 'Available'
                              ? 'bg-green-500/20 text-green-400'
                              : mentor.availability === 'Limited'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {mentor.availability}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-4 h-4" />
                          {mentor.rating} ({mentor.reviews})
                        </span>
                        <span className="text-gray-400">{mentor.sessions} sessions</span>
                        <span className="text-gray-400">{mentor.yearsExperience}y exp</span>
                      </div>
                    </div>
                  </div>

                  {/* Expertise */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {mentor.expertise.map((exp) => (
                      <span
                        key={exp}
                        className="px-2 py-1 rounded-full text-xs bg-[rgba(255,255,255,0.05)] text-gray-400"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>

                  {/* Bio Preview */}
                  <p className="text-sm text-gray-400 mt-4 line-clamp-2">{mentor.bio}</p>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                    <span className="text-[#00ffc1] font-semibold">${mentor.hourlyRate}/hr</span>
                    <div className="flex gap-2">
                      <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-gray-400 transition-colors">
                        <Bookmark className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMentor(mentor)
                          setShowMentorModal(true)
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-semibold hover:opacity-90 transition-opacity"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'programs' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {programs.map((program) => (
              <div key={program.id} className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                    {program.duration}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">{program.rating}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{program.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{program.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {program.enrolled} enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    {program.sessions} sessions
                  </span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-400">by {program.mentor}</span>
                  <span className="text-sm text-yellow-400">{program.spots} spots left</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.05)]">
                  <span className="text-2xl font-bold text-white">${program.price}</span>
                  <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-semibold hover:opacity-90 transition-opacity">
                    Enroll Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Upcoming Sessions</h3>
            {upcomingSessions.map((session, index) => (
              <div key={index} className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {session.type === 'video' ? (
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Video className="w-6 h-6 text-blue-400" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <Phone className="w-6 h-6 text-green-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-white">{session.topic}</h4>
                      <p className="text-sm text-gray-400">with {session.mentor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white">{session.date}</p>
                      <p className="text-sm text-gray-400">{session.time}</p>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-semibold hover:opacity-90 transition-opacity">
                      Join
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {upcomingSessions.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No upcoming sessions</p>
                <button className="mt-4 px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white transition-colors">
                  Browse Mentors
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mentor Profile Modal */}
      <Modal
        isOpen={showMentorModal}
        onClose={() => setShowMentorModal(false)}
        title=""
      >
        {selectedMentor && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl">
                {selectedMentor.avatar}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{selectedMentor.name}</h2>
                <p className="text-gray-400">{selectedMentor.title}</p>
                <p className="text-sm text-gray-500">{selectedMentor.company}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-4 h-4" />
                    {selectedMentor.rating} ({selectedMentor.reviews} reviews)
                  </span>
                  <span className="text-gray-400">{selectedMentor.sessions} sessions</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-gray-300">{selectedMentor.bio}</p>

            {/* Achievements */}
            <div>
              <h4 className="font-semibold text-white mb-2">Achievements</h4>
              <div className="flex flex-wrap gap-2">
                {selectedMentor.achievements.map((achievement) => (
                  <span
                    key={achievement}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400"
                  >
                    <Award className="w-4 h-4" />
                    {achievement}
                  </span>
                ))}
              </div>
            </div>

            {/* Expertise */}
            <div>
              <h4 className="font-semibold text-white mb-2">Expertise</h4>
              <div className="flex flex-wrap gap-2">
                {selectedMentor.expertise.map((exp) => (
                  <span
                    key={exp}
                    className="px-3 py-1 rounded-full text-sm bg-[rgba(255,255,255,0.05)] text-gray-300"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)]">
                <p className="text-sm text-gray-400">Response Time</p>
                <p className="font-medium text-white">{selectedMentor.responseTime}</p>
              </div>
              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)]">
                <p className="text-sm text-gray-400">Languages</p>
                <p className="font-medium text-white">{selectedMentor.languages.join(', ')}</p>
              </div>
            </div>

            {/* Book Session */}
            <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.1)]">
              <div>
                <p className="text-2xl font-bold text-white">${selectedMentor.hourlyRate}</p>
                <p className="text-sm text-gray-400">per hour</p>
              </div>
              <button
                onClick={() => bookSession(selectedMentor)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Book Session
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
