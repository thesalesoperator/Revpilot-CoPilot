'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  Target,
  MessageSquare,
  Handshake,
  Brain,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Phone,
  Star,
  Lock,
  ChevronRight,
  Award,
  Sparkles,
  CheckCircle,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Skill Trees
const skillTrees = [
  {
    id: 'discovery',
    name: 'Discovery Master',
    description: 'Master the art of uncovering customer needs',
    icon: MessageSquare,
    color: 'from-blue-500 to-cyan-500',
    currentLevel: 4,
    maxLevel: 10,
    totalXP: 1250,
    skills: [
      { level: 1, name: 'Question Basics', description: 'Learn to ask open-ended questions', unlocked: true, xp: 100 },
      { level: 2, name: 'Active Listening', description: 'Master the art of listening', unlocked: true, xp: 150 },
      { level: 3, name: 'Pain Discovery', description: 'Uncover customer pain points', unlocked: true, xp: 200 },
      { level: 4, name: 'Need Analysis', description: 'Analyze and categorize needs', unlocked: true, xp: 250 },
      { level: 5, name: 'Stakeholder Mapping', description: 'Identify all decision makers', unlocked: false, xp: 300 },
      { level: 6, name: 'Budget Discovery', description: 'Tactfully uncover budget', unlocked: false, xp: 350 },
      { level: 7, name: 'Timeline Mastery', description: 'Establish urgency and timeline', unlocked: false, xp: 400 },
      { level: 8, name: 'Competition Intel', description: 'Gather competitive intelligence', unlocked: false, xp: 450 },
      { level: 9, name: 'Executive Discovery', description: 'C-suite questioning techniques', unlocked: false, xp: 500 },
      { level: 10, name: 'Discovery Grandmaster', description: 'Complete mastery of discovery', unlocked: false, xp: 600 },
    ],
  },
  {
    id: 'objection',
    name: 'Objection Handler',
    description: 'Turn objections into opportunities',
    icon: Shield,
    color: 'from-red-500 to-orange-500',
    currentLevel: 3,
    maxLevel: 10,
    totalXP: 750,
    skills: [
      { level: 1, name: 'Acknowledge & Validate', description: 'Learn to acknowledge concerns', unlocked: true, xp: 100 },
      { level: 2, name: 'Price Objections', description: 'Handle pricing concerns', unlocked: true, xp: 150 },
      { level: 3, name: 'Timing Objections', description: 'Address "not now" responses', unlocked: true, xp: 200 },
      { level: 4, name: 'Authority Objections', description: 'Navigate decision maker issues', unlocked: false, xp: 250 },
      { level: 5, name: 'Competition Defense', description: 'Counter competitive threats', unlocked: false, xp: 300 },
      { level: 6, name: 'Status Quo Breaking', description: 'Overcome "we\'re fine" mindset', unlocked: false, xp: 350 },
      { level: 7, name: 'Risk Mitigation', description: 'Address fear and uncertainty', unlocked: false, xp: 400 },
      { level: 8, name: 'Technical Objections', description: 'Handle technical concerns', unlocked: false, xp: 450 },
      { level: 9, name: 'Executive Objections', description: 'C-suite objection handling', unlocked: false, xp: 500 },
      { level: 10, name: 'Objection Eliminator', description: 'Turn any objection into a win', unlocked: false, xp: 600 },
    ],
  },
  {
    id: 'closing',
    name: 'Closing Expert',
    description: 'Seal deals with confidence',
    icon: Handshake,
    color: 'from-green-500 to-emerald-500',
    currentLevel: 2,
    maxLevel: 10,
    totalXP: 450,
    skills: [
      { level: 1, name: 'Trial Closes', description: 'Test buying temperature', unlocked: true, xp: 100 },
      { level: 2, name: 'Assumptive Close', description: 'Close with confidence', unlocked: true, xp: 150 },
      { level: 3, name: 'Summary Close', description: 'Recap value before asking', unlocked: false, xp: 200 },
      { level: 4, name: 'Urgency Creation', description: 'Create legitimate urgency', unlocked: false, xp: 250 },
      { level: 5, name: 'Option Close', description: 'Present strategic choices', unlocked: false, xp: 300 },
      { level: 6, name: 'Negotiation Basics', description: 'Negotiate win-win deals', unlocked: false, xp: 350 },
      { level: 7, name: 'Multi-Thread Close', description: 'Close multiple stakeholders', unlocked: false, xp: 400 },
      { level: 8, name: 'Enterprise Close', description: 'Complex deal closing', unlocked: false, xp: 450 },
      { level: 9, name: 'Executive Close', description: 'Close with C-suite', unlocked: false, xp: 500 },
      { level: 10, name: 'Closing Legend', description: 'Close any deal, any time', unlocked: false, xp: 600 },
    ],
  },
  {
    id: 'presentation',
    name: 'Presentation Pro',
    description: 'Deliver compelling demos and pitches',
    icon: TrendingUp,
    color: 'from-purple-500 to-pink-500',
    currentLevel: 5,
    maxLevel: 10,
    totalXP: 1500,
    skills: [
      { level: 1, name: 'Story Structure', description: 'Build compelling narratives', unlocked: true, xp: 100 },
      { level: 2, name: 'Value Articulation', description: 'Communicate clear value', unlocked: true, xp: 150 },
      { level: 3, name: 'Demo Basics', description: 'Deliver effective demos', unlocked: true, xp: 200 },
      { level: 4, name: 'Slide Mastery', description: 'Create impactful decks', unlocked: true, xp: 250 },
      { level: 5, name: 'Audience Reading', description: 'Adapt to audience reactions', unlocked: true, xp: 300 },
      { level: 6, name: 'ROI Storytelling', description: 'Quantify and present value', unlocked: false, xp: 350 },
      { level: 7, name: 'Virtual Presence', description: 'Excel in virtual settings', unlocked: false, xp: 400 },
      { level: 8, name: 'Board Presentations', description: 'Present to boards', unlocked: false, xp: 450 },
      { level: 9, name: 'Keynote Speaker', description: 'Deliver keynote quality', unlocked: false, xp: 500 },
      { level: 10, name: 'Presentation Legend', description: 'Captivate any audience', unlocked: false, xp: 600 },
    ],
  },
  {
    id: 'relationship',
    name: 'Relationship Builder',
    description: 'Build lasting customer relationships',
    icon: Users,
    color: 'from-yellow-500 to-amber-500',
    currentLevel: 6,
    maxLevel: 10,
    totalXP: 2100,
    skills: [
      { level: 1, name: 'Rapport Building', description: 'Create initial connections', unlocked: true, xp: 100 },
      { level: 2, name: 'Trust Foundation', description: 'Establish trust quickly', unlocked: true, xp: 150 },
      { level: 3, name: 'Follow-up Master', description: 'Stay top of mind', unlocked: true, xp: 200 },
      { level: 4, name: 'Champion Development', description: 'Build internal champions', unlocked: true, xp: 250 },
      { level: 5, name: 'Multi-Threading', description: 'Build multiple relationships', unlocked: true, xp: 300 },
      { level: 6, name: 'Executive Relationships', description: 'Connect with C-suite', unlocked: true, xp: 350 },
      { level: 7, name: 'Account Expansion', description: 'Grow within accounts', unlocked: false, xp: 400 },
      { level: 8, name: 'Referral Engine', description: 'Generate referrals', unlocked: false, xp: 450 },
      { level: 9, name: 'Strategic Partner', description: 'Become a trusted advisor', unlocked: false, xp: 500 },
      { level: 10, name: 'Relationship Legend', description: 'Customers become advocates', unlocked: false, xp: 600 },
    ],
  },
  {
    id: 'prospecting',
    name: 'Prospecting Pro',
    description: 'Find and engage ideal prospects',
    icon: Target,
    color: 'from-cyan-500 to-blue-500',
    currentLevel: 3,
    maxLevel: 10,
    totalXP: 750,
    skills: [
      { level: 1, name: 'ICP Definition', description: 'Define ideal customer profile', unlocked: true, xp: 100 },
      { level: 2, name: 'Research Skills', description: 'Research prospects effectively', unlocked: true, xp: 150 },
      { level: 3, name: 'Cold Email Craft', description: 'Write compelling emails', unlocked: true, xp: 200 },
      { level: 4, name: 'Cold Calling', description: 'Effective cold call techniques', unlocked: false, xp: 250 },
      { level: 5, name: 'Social Selling', description: 'Leverage LinkedIn & social', unlocked: false, xp: 300 },
      { level: 6, name: 'Video Prospecting', description: 'Stand out with video', unlocked: false, xp: 350 },
      { level: 7, name: 'Multi-Channel', description: 'Orchestrate across channels', unlocked: false, xp: 400 },
      { level: 8, name: 'Account-Based', description: 'ABM prospecting strategies', unlocked: false, xp: 450 },
      { level: 9, name: 'Executive Outreach', description: 'Reach C-suite directly', unlocked: false, xp: 500 },
      { level: 10, name: 'Prospecting Legend', description: 'Book meetings at will', unlocked: false, xp: 600 },
    ],
  },
]

export default function SkillsPage() {
  const { user } = useAuth()
  const [selectedTree, setSelectedTree] = useState(skillTrees[0])

  const totalXP = skillTrees.reduce((sum, tree) => sum + tree.totalXP, 0)
  const overallProgress = Math.round(
    (skillTrees.reduce((sum, tree) => sum + tree.currentLevel, 0) /
      skillTrees.reduce((sum, tree) => sum + tree.maxLevel, 0)) *
      100
  )

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Skill Trees</h1>
          <p className="text-gray-400">Level up your sales abilities</p>
        </div>

        {/* Overall Progress */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Overall Mastery</h2>
              <p className="text-gray-400 text-sm">Your combined skill progression</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold gradient-text">{totalXP.toLocaleString()} XP</p>
              <p className="text-gray-400 text-sm">{overallProgress}% Complete</p>
            </div>
          </div>
          <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-4">
            <div
              className="bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] h-4 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Skill Tree Selection */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Skill Trees</h3>
            {skillTrees.map((tree) => (
              <button
                key={tree.id}
                onClick={() => setSelectedTree(tree)}
                className={`w-full p-4 rounded-xl transition-all text-left ${
                  selectedTree.id === tree.id
                    ? 'glass-card border-[rgba(94,234,212,0.3)]'
                    : 'bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tree.color} flex items-center justify-center`}
                  >
                    <tree.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">{tree.name}</h4>
                      <span className="text-sm text-gray-400">
                        Lv.{tree.currentLevel}/{tree.maxLevel}
                      </span>
                    </div>
                    <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2 mt-2">
                      <div
                        className={`bg-gradient-to-r ${tree.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${(tree.currentLevel / tree.maxLevel) * 100}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 transition-colors ${
                      selectedTree.id === tree.id ? 'text-[#5eead4]' : 'text-gray-500'
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Selected Skill Tree Details */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              {/* Tree Header */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[rgba(255,255,255,0.1)]">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedTree.color} flex items-center justify-center`}
                >
                  <selectedTree.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{selectedTree.name}</h2>
                  <p className="text-gray-400">{selectedTree.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Total XP Earned</p>
                  <p className="text-2xl font-bold text-yellow-400">{selectedTree.totalXP}</p>
                </div>
              </div>

              {/* Skills List */}
              <div className="space-y-3">
                {selectedTree.skills.map((skill, index) => {
                  const isNext = index === selectedTree.currentLevel
                  return (
                    <div
                      key={skill.level}
                      className={`relative flex items-center gap-4 p-4 rounded-xl transition-all ${
                        skill.unlocked
                          ? 'bg-[rgba(94,234,212,0.1)] border border-[rgba(94,234,212,0.2)]'
                          : isNext
                            ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] animate-pulse'
                            : 'bg-[rgba(255,255,255,0.02)] opacity-50'
                      }`}
                    >
                      {/* Connection Line */}
                      {index < selectedTree.skills.length - 1 && (
                        <div
                          className={`absolute left-[2.25rem] top-[4rem] w-0.5 h-6 ${
                            skill.unlocked ? 'bg-[#5eead4]' : 'bg-gray-700'
                          }`}
                        />
                      )}

                      {/* Level Badge */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          skill.unlocked
                            ? `bg-gradient-to-br ${selectedTree.color} text-white`
                            : isNext
                              ? 'bg-[rgba(255,255,255,0.1)] text-white border-2 border-dashed border-gray-500'
                              : 'bg-[rgba(255,255,255,0.05)] text-gray-600'
                        }`}
                      >
                        {skill.unlocked ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          skill.level
                        )}
                      </div>

                      {/* Skill Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-medium ${
                              skill.unlocked ? 'text-white' : isNext ? 'text-gray-300' : 'text-gray-500'
                            }`}
                          >
                            {skill.name}
                          </h4>
                          {skill.level === 10 && (
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <p className={`text-sm ${skill.unlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                          {skill.description}
                        </p>
                      </div>

                      {/* XP Reward */}
                      <div className="text-right">
                        <div
                          className={`flex items-center gap-1 ${
                            skill.unlocked ? 'text-yellow-400' : 'text-gray-600'
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                          <span className="font-medium">{skill.xp} XP</span>
                        </div>
                        {!skill.unlocked && (
                          <div className="flex items-center gap-1 text-gray-600 text-sm">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Unlock Next Skill */}
              {selectedTree.currentLevel < selectedTree.maxLevel && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[rgba(94,234,212,0.1)] to-[rgba(0,217,166,0.1)] border border-[rgba(94,234,212,0.2)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Next skill to unlock</p>
                      <p className="text-lg font-semibold text-white">
                        {selectedTree.skills[selectedTree.currentLevel].name}
                      </p>
                    </div>
                    <button className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] text-[#0a0a0f] font-semibold hover:opacity-90 transition-opacity">
                      Start Training
                    </button>
                  </div>
                </div>
              )}

              {selectedTree.currentLevel === selectedTree.maxLevel && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[rgba(255,215,0,0.1)] to-[rgba(255,165,0,0.1)] border border-[rgba(255,215,0,0.3)]">
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="font-semibold text-yellow-400">Mastery Achieved!</p>
                      <p className="text-sm text-gray-400">
                        You&apos;ve completed the {selectedTree.name} skill tree
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
