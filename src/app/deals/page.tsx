'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  Briefcase,
  Users,
  MessageSquare,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Phone,
  Mail,
  Video,
  ArrowRight,
  Target,
  Zap,
  Brain,
  ChevronRight,
  Star,
  Activity,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'

// Deal stages
const stages = [
  { id: 'discovery', label: 'Discovery', color: 'bg-blue-500' },
  { id: 'demo', label: 'Demo', color: 'bg-purple-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-yellow-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { id: 'closed-won', label: 'Closed Won', color: 'bg-green-500' },
  { id: 'closed-lost', label: 'Closed Lost', color: 'bg-red-500' },
]

// Mock deals data
const deals = [
  {
    id: '1',
    name: 'Acme Corp - Enterprise License',
    company: 'Acme Corporation',
    value: 125000,
    stage: 'negotiation',
    probability: 75,
    healthScore: 85,
    closeDate: '2024-03-15',
    owner: 'You',
    contacts: [
      { name: 'John Smith', role: 'VP of Sales', email: 'john@acme.com' },
      { name: 'Sarah Chen', role: 'CFO', email: 'sarah@acme.com' },
    ],
    nextAction: 'Send revised proposal',
    nextActionDate: '2024-02-20',
    lastActivity: '2 hours ago',
    signals: [
      { type: 'positive', text: 'Champion engaged in multiple calls' },
      { type: 'positive', text: 'Budget confirmed' },
      { type: 'warning', text: 'CFO hasn\'t been on recent calls' },
    ],
    team: ['You', 'Mike (SE)', 'Lisa (Manager)'],
  },
  {
    id: '2',
    name: 'TechStart - Growth Plan',
    company: 'TechStart Inc',
    value: 48000,
    stage: 'demo',
    probability: 45,
    healthScore: 62,
    closeDate: '2024-04-01',
    owner: 'You',
    contacts: [
      { name: 'Emily Brown', role: 'CEO', email: 'emily@techstart.io' },
    ],
    nextAction: 'Schedule technical deep-dive',
    nextActionDate: '2024-02-22',
    lastActivity: '1 day ago',
    signals: [
      { type: 'positive', text: 'Fast response times' },
      { type: 'warning', text: 'Only one stakeholder engaged' },
      { type: 'negative', text: 'Competitor mentioned' },
    ],
    team: ['You'],
  },
  {
    id: '3',
    name: 'GlobalBank - Platform Deal',
    company: 'GlobalBank',
    value: 350000,
    stage: 'proposal',
    probability: 60,
    healthScore: 78,
    closeDate: '2024-03-30',
    owner: 'You',
    contacts: [
      { name: 'Michael Wong', role: 'CTO', email: 'mwong@globalbank.com' },
      { name: 'Lisa Park', role: 'VP Engineering', email: 'lpark@globalbank.com' },
      { name: 'David Kim', role: 'Procurement', email: 'dkim@globalbank.com' },
    ],
    nextAction: 'Legal review meeting',
    nextActionDate: '2024-02-25',
    lastActivity: '4 hours ago',
    signals: [
      { type: 'positive', text: 'Multi-threaded engagement' },
      { type: 'positive', text: 'Security review passed' },
      { type: 'warning', text: 'Long procurement cycle expected' },
    ],
    team: ['You', 'James (SE)', 'Sarah (Legal)', 'VP Sales'],
  },
]

// Activity feed
const activityFeed = [
  { type: 'call', user: 'You', action: 'completed a call with', target: 'John Smith (Acme)', time: '2 hours ago' },
  { type: 'email', user: 'Mike', action: 'sent proposal to', target: 'GlobalBank team', time: '4 hours ago' },
  { type: 'note', user: 'Lisa', action: 'added note to', target: 'TechStart deal', time: '1 day ago' },
  { type: 'meeting', user: 'You', action: 'scheduled meeting with', target: 'Emily Brown', time: '1 day ago' },
]

const getHealthColor = (score: number) => {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

const getHealthBg = (score: number) => {
  if (score >= 80) return 'from-green-500 to-emerald-500'
  if (score >= 60) return 'from-yellow-500 to-orange-500'
  return 'from-red-500 to-rose-500'
}

export default function DealsPage() {
  const { user } = useAuth()
  const [selectedDeal, setSelectedDeal] = useState(deals[0])
  const [showDealRoom, setShowDealRoom] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'team' | 'ai'>('overview')

  const totalPipeline = deals.reduce((sum, deal) => sum + deal.value, 0)
  const weightedPipeline = deals.reduce((sum, deal) => sum + (deal.value * deal.probability) / 100, 0)

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Deal Rooms</h1>
            <p className="text-gray-400">Collaborate on deals with your team</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] text-[#0a0a0f] font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-5 h-5" />
            New Deal
          </button>
        </div>

        {/* Pipeline Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-5 h-5 text-[#5eead4]" />
              <span className="text-gray-400 text-sm">Active Deals</span>
            </div>
            <p className="text-3xl font-bold text-white">{deals.length}</p>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Total Pipeline</span>
            </div>
            <p className="text-3xl font-bold text-white">${(totalPipeline / 1000).toFixed(0)}k</p>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Weighted Pipeline</span>
            </div>
            <p className="text-3xl font-bold text-white">${(weightedPipeline / 1000).toFixed(0)}k</p>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Avg Health Score</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {Math.round(deals.reduce((sum, d) => sum + d.healthScore, 0) / deals.length)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deals List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#5eead4]"
              />
            </div>

            {deals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => setSelectedDeal(deal)}
                className={`w-full text-left p-4 rounded-xl transition-all ${
                  selectedDeal.id === deal.id
                    ? 'glass-card border-[rgba(94,234,212,0.3)]'
                    : 'bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-white">{deal.name}</h4>
                    <p className="text-sm text-gray-400">{deal.company}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getHealthBg(deal.healthScore)} flex items-center justify-center text-white font-bold text-sm`}>
                    {deal.healthScore}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-400 font-semibold">${(deal.value / 1000).toFixed(0)}k</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    stages.find((s) => s.id === deal.stage)?.color
                  } bg-opacity-20`}>
                    {stages.find((s) => s.id === deal.stage)?.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Deal Details */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              {/* Deal Header */}
              <div className="flex items-start justify-between mb-6 pb-6 border-b border-[rgba(255,255,255,0.1)]">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedDeal.name}</h2>
                  <p className="text-gray-400">{selectedDeal.company}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowDealRoom(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] text-[#0a0a0f] font-semibold hover:opacity-90 transition-opacity"
                  >
                    Open Deal Room
                  </button>
                  <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-gray-400 transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                {['overview', 'activity', 'team', 'ai'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`px-4 py-2 rounded-xl transition-all capitalize ${
                      activeTab === tab
                        ? 'bg-[rgba(94,234,212,0.2)] text-[#5eead4] border border-[rgba(94,234,212,0.3)]'
                        : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                    }`}
                  >
                    {tab === 'ai' ? 'AI Insights' : tab}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Deal Value</p>
                      <p className="text-2xl font-bold text-green-400">
                        ${(selectedDeal.value / 1000).toFixed(0)}k
                      </p>
                    </div>
                    <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Probability</p>
                      <p className="text-2xl font-bold text-white">{selectedDeal.probability}%</p>
                    </div>
                    <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Health Score</p>
                      <p className={`text-2xl font-bold ${getHealthColor(selectedDeal.healthScore)}`}>
                        {selectedDeal.healthScore}
                      </p>
                    </div>
                    <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Close Date</p>
                      <p className="text-2xl font-bold text-white">
                        {new Date(selectedDeal.closeDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Signals */}
                  <div>
                    <h4 className="font-semibold text-white mb-3">Deal Signals</h4>
                    <div className="space-y-2">
                      {selectedDeal.signals.map((signal, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-3 p-3 rounded-xl ${
                            signal.type === 'positive'
                              ? 'bg-green-500/10 border border-green-500/20'
                              : signal.type === 'warning'
                                ? 'bg-yellow-500/10 border border-yellow-500/20'
                                : 'bg-red-500/10 border border-red-500/20'
                          }`}
                        >
                          {signal.type === 'positive' ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : signal.type === 'warning' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-400" />
                          )}
                          <span className="text-gray-300">{signal.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contacts */}
                  <div>
                    <h4 className="font-semibold text-white mb-3">Key Contacts</h4>
                    <div className="space-y-2">
                      {selectedDeal.contacts.map((contact, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.02)]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                              {contact.name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-white">{contact.name}</p>
                              <p className="text-sm text-gray-400">{contact.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-gray-400 transition-colors">
                              <Mail className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-gray-400 transition-colors">
                              <Phone className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-gray-400 transition-colors">
                              <Video className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Action */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-[rgba(94,234,212,0.1)] to-[rgba(0,217,166,0.05)] border border-[rgba(94,234,212,0.2)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5eead4]/20 flex items-center justify-center">
                          <Target className="w-5 h-5 text-[#5eead4]" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Next Action</p>
                          <p className="font-semibold text-white">{selectedDeal.nextAction}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Due</p>
                        <p className="font-semibold text-[#5eead4]">
                          {new Date(selectedDeal.nextActionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {activityFeed.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.02)]"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === 'call'
                            ? 'bg-green-500/20 text-green-400'
                            : activity.type === 'email'
                              ? 'bg-blue-500/20 text-blue-400'
                              : activity.type === 'meeting'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {activity.type === 'call' && <Phone className="w-5 h-5" />}
                        {activity.type === 'email' && <Mail className="w-5 h-5" />}
                        {activity.type === 'meeting' && <Calendar className="w-5 h-5" />}
                        {activity.type === 'note' && <FileText className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-300">
                          <span className="text-white font-medium">{activity.user}</span>{' '}
                          {activity.action}{' '}
                          <span className="text-[#5eead4]">{activity.target}</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'team' && (
                <div className="space-y-4">
                  <p className="text-gray-400 mb-4">Team members working on this deal</p>
                  {selectedDeal.team.map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.02)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center text-[#0a0a0f] font-semibold">
                          {member[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{member}</p>
                          <p className="text-sm text-gray-400">
                            {index === 0 ? 'Deal Owner' : 'Team Member'}
                          </p>
                        </div>
                      </div>
                      <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-gray-400 transition-colors">
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button className="w-full py-3 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Team Member
                  </button>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-6">
                  {/* AI Health Analysis */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Brain className="w-6 h-6 text-purple-400" />
                      <h4 className="font-semibold text-white">AI Deal Analysis</h4>
                    </div>
                    <p className="text-gray-300 mb-4">
                      Based on engagement patterns and historical data, this deal has a{' '}
                      <span className="text-[#5eead4] font-semibold">{selectedDeal.probability}%</span>{' '}
                      chance of closing. Key risk: CFO engagement has dropped by 40% in the last 2 weeks.
                    </p>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-yellow-400">
                        Recommendation: Schedule a call specifically with the CFO to address budget concerns.
                      </span>
                    </div>
                  </div>

                  {/* Win/Loss Prediction */}
                  <div>
                    <h4 className="font-semibold text-white mb-3">Win Probability Factors</h4>
                    <div className="space-y-3">
                      {[
                        { factor: 'Champion Engagement', score: 92, positive: true },
                        { factor: 'Multi-threading', score: 78, positive: true },
                        { factor: 'Budget Alignment', score: 85, positive: true },
                        { factor: 'Timeline Fit', score: 45, positive: false },
                        { factor: 'Executive Sponsorship', score: 55, positive: false },
                      ].map((item) => (
                        <div key={item.factor} className="flex items-center gap-4">
                          <span className="text-sm text-gray-400 w-40">{item.factor}</span>
                          <div className="flex-1 h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.positive ? 'bg-green-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${item.score}%` }}
                            />
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              item.positive ? 'text-green-400' : 'text-yellow-400'
                            }`}
                          >
                            {item.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Actions */}
                  <div>
                    <h4 className="font-semibold text-white mb-3">AI Suggested Actions</h4>
                    <div className="space-y-2">
                      {[
                        'Schedule executive briefing with CFO',
                        'Send ROI case study from similar company',
                        'Propose pilot program to reduce risk',
                        'Introduce customer reference call',
                      ].map((action, index) => (
                        <button
                          key={index}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-colors group"
                        >
                          <span className="text-gray-300">{action}</span>
                          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#5eead4] transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deal Room Modal */}
      <Modal
        isOpen={showDealRoom}
        onClose={() => setShowDealRoom(false)}
        title={`Deal Room: ${selectedDeal.name}`}
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            This is your collaborative workspace for {selectedDeal.company}. Share notes, documents,
            and coordinate with your team.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors text-center">
              <FileText className="w-8 h-8 text-[#5eead4] mx-auto mb-2" />
              <p className="text-white font-medium">Documents</p>
              <p className="text-sm text-gray-400">5 files</p>
            </button>
            <button className="p-4 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors text-center">
              <MessageSquare className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-white font-medium">Team Chat</p>
              <p className="text-sm text-gray-400">12 messages</p>
            </button>
            <button className="p-4 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors text-center">
              <Phone className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-white font-medium">Call History</p>
              <p className="text-sm text-gray-400">8 calls</p>
            </button>
            <button className="p-4 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors text-center">
              <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-white font-medium">Meetings</p>
              <p className="text-sm text-gray-400">3 scheduled</p>
            </button>
          </div>

          <div className="pt-4 border-t border-[rgba(255,255,255,0.1)]">
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] text-[#0a0a0f] font-semibold hover:opacity-90 transition-opacity">
              Enter Full Deal Room
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
