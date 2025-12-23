'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Trophy,
  Target,
  Zap,
  Clock,
  Star,
  Lock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Volume2,
  Flame,
  Award,
  Users,
  Briefcase,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

// Types
interface Challenge {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  category: string
  persona: string
  objectives: string[]
  bonusObjectives: BonusObjective[]
  timeLimit: number | null // seconds, null = no limit
  xpReward: number
  unlockRequirement?: string
  isLocked?: boolean
}

interface BonusObjective {
  id: string
  name: string
  description: string
  icon: string
  xpBonus: number
}

interface CallState {
  status: 'idle' | 'connecting' | 'active' | 'ended'
  duration: number
  isMuted: boolean
  transcript: string[]
}

// Challenge Data
const CHALLENGES: Challenge[] = [
  // Easy Challenges
  {
    id: 'discovery-101',
    name: 'Discovery 101',
    description: 'A friendly prospect wants to learn about your product. Extract their key pain points.',
    difficulty: 'easy',
    category: 'Discovery',
    persona: 'Friendly Startup Founder',
    objectives: [
      'Identify at least 2 pain points',
      'Ask 5+ open-ended questions',
      'Get them to share their current solution',
    ],
    bonusObjectives: [
      { id: 'smooth-talker', name: 'Smooth Talker', description: 'Say "absolutely" 5 times', icon: '🎯', xpBonus: 50 },
      { id: 'listener', name: 'Active Listener', description: 'Let them talk 60%+ of the time', icon: '👂', xpBonus: 75 },
    ],
    timeLimit: null,
    xpReward: 100,
  },
  {
    id: 'first-close',
    name: 'First Close',
    description: 'An interested prospect is ready to buy. Guide them to a successful close.',
    difficulty: 'easy',
    category: 'Closing',
    persona: 'Eager Small Business Owner',
    objectives: [
      'Present pricing confidently',
      'Handle at least 1 soft objection',
      'Get verbal commitment',
    ],
    bonusObjectives: [
      { id: 'speed-demon', name: 'Speed Demon', description: 'Close in under 5 minutes', icon: '⚡', xpBonus: 100 },
    ],
    timeLimit: 600,
    xpReward: 150,
  },
  // Medium Challenges
  {
    id: 'price-objection',
    name: 'The Price Fighter',
    description: 'Handle a prospect who thinks your solution is too expensive.',
    difficulty: 'medium',
    category: 'Objection Handling',
    persona: 'Budget-Conscious CFO',
    objectives: [
      'Acknowledge their concern without discounting',
      'Reframe value vs. cost',
      'Get them to see ROI potential',
    ],
    bonusObjectives: [
      { id: 'no-discount', name: 'Full Price Hero', description: 'Close without offering any discount', icon: '💰', xpBonus: 150 },
      { id: 'roi-master', name: 'ROI Master', description: 'Calculate specific ROI numbers', icon: '📊', xpBonus: 100 },
    ],
    timeLimit: 480,
    xpReward: 250,
  },
  {
    id: 'competitor-battle',
    name: 'Competitor Showdown',
    description: 'A prospect is comparing you to a major competitor. Win them over.',
    difficulty: 'medium',
    category: 'Competitive Selling',
    persona: 'Analytical Tech Manager',
    objectives: [
      'Understand what they like about the competitor',
      'Differentiate without trash-talking',
      'Highlight unique value propositions',
    ],
    bonusObjectives: [
      { id: 'classy', name: 'Stay Classy', description: 'Never say anything negative about competitor', icon: '🎩', xpBonus: 100 },
      { id: 'flip', name: 'The Flip', description: 'Turn their competitor preference into your advantage', icon: '🔄', xpBonus: 125 },
    ],
    timeLimit: 420,
    xpReward: 300,
  },
  // Hard Challenges
  {
    id: 'hostile-exec',
    name: 'The Hostile Executive',
    description: 'A busy VP who took this call reluctantly. You have 5 minutes to earn more time.',
    difficulty: 'hard',
    category: 'Executive Selling',
    persona: 'Impatient VP of Sales',
    objectives: [
      'Earn an extension past 5 minutes',
      'Get them engaged and asking questions',
      'Secure a follow-up meeting',
    ],
    bonusObjectives: [
      { id: 'time-keeper', name: 'Time Keeper', description: 'Get 15+ minute extension', icon: '⏱️', xpBonus: 200 },
      { id: 'referral', name: 'Referral King', description: 'Get introduced to another stakeholder', icon: '👥', xpBonus: 175 },
    ],
    timeLimit: 300,
    xpReward: 400,
  },
  {
    id: 'objection-gauntlet',
    name: 'Objection Gauntlet',
    description: 'Handle 5 different objections in one call without losing the deal.',
    difficulty: 'hard',
    category: 'Objection Handling',
    persona: 'Skeptical Enterprise Buyer',
    objectives: [
      'Handle price objection',
      'Handle timing objection',
      'Handle competitor objection',
      'Handle authority objection',
      'Handle need objection',
    ],
    bonusObjectives: [
      { id: 'unshakeable', name: 'Unshakeable', description: 'Never sound defensive', icon: '🛡️', xpBonus: 150 },
      { id: 'closer', name: 'Against All Odds', description: 'Close the deal anyway', icon: '🏆', xpBonus: 300 },
    ],
    timeLimit: 600,
    xpReward: 500,
  },
  // Expert Challenges
  {
    id: 'ceo-pitch',
    name: 'The CEO Pitch',
    description: 'You have one shot to pitch the CEO. Make it count.',
    difficulty: 'expert',
    category: 'Executive Selling',
    persona: 'Fortune 500 CEO',
    objectives: [
      'Lead with business impact, not features',
      'Answer tough strategic questions',
      'Get commitment for board presentation',
    ],
    bonusObjectives: [
      { id: 'strategic', name: 'Strategic Mind', description: 'Tie solution to their public company goals', icon: '🎯', xpBonus: 250 },
      { id: 'champion', name: 'Executive Champion', description: 'CEO offers to champion internally', icon: '👑', xpBonus: 300 },
    ],
    timeLimit: 420,
    xpReward: 750,
    unlockRequirement: 'Complete 5 Hard challenges',
    isLocked: true,
  },
  {
    id: 'rescue-mission',
    name: 'Deal Rescue',
    description: 'A deal went cold 3 months ago. Revive it and close.',
    difficulty: 'expert',
    category: 'Deal Recovery',
    persona: 'Ghosting Prospect',
    objectives: [
      'Re-establish rapport without being pushy',
      'Understand what changed',
      'Create new urgency',
      'Get back to active pipeline',
    ],
    bonusObjectives: [
      { id: 'patience', name: 'Patient Hunter', description: 'Never mention they ghosted you', icon: '🎭', xpBonus: 200 },
      { id: 'same-call', name: 'One Call Close', description: 'Close on this very call', icon: '🔥', xpBonus: 400 },
    ],
    timeLimit: 600,
    xpReward: 800,
    unlockRequirement: 'Complete 3 Hard challenges',
    isLocked: true,
  },
]

const DIFFICULTY_CONFIG = {
  easy: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', label: 'Easy' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'Medium' },
  hard: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', label: 'Hard' },
  expert: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Expert' },
}

const PERSONA_ICONS: Record<string, typeof Users> = {
  'Friendly Startup Founder': Briefcase,
  'Eager Small Business Owner': Users,
  'Budget-Conscious CFO': TrendingUp,
  'Analytical Tech Manager': Target,
  'Impatient VP of Sales': Zap,
  'Skeptical Enterprise Buyer': HelpCircle,
  'Fortune 500 CEO': Award,
  'Ghosting Prospect': MessageSquare,
}

export default function PracticePage() {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    duration: 0,
    isMuted: false,
    transcript: [],
  })
  const [userStats, setUserStats] = useState({
    totalXP: 0,
    completedChallenges: [] as string[],
    currentStreak: 0,
  })
  const [showResults, setShowResults] = useState(false)
  const [callResults, setCallResults] = useState<{
    score: number
    objectivesCompleted: boolean[]
    bonusCompleted: boolean[]
    xpEarned: number
    feedback: string
  } | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null)

  const { user } = useAuth()
  const { showToast } = useToast()
  const supabase = createClient()

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (callState.status === 'active') {
      interval = setInterval(() => {
        setCallState((prev) => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [callState.status])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startCall = async () => {
    if (!selectedChallenge) return

    setCallState({
      status: 'connecting',
      duration: 0,
      isMuted: false,
      transcript: [],
    })

    // TODO: Initialize Vapi call here
    // For now, simulate connection
    setTimeout(() => {
      setCallState((prev) => ({ ...prev, status: 'active' }))
      showToast('success', 'Call connected! Good luck!')
    }, 2000)
  }

  const endCall = async () => {
    setCallState((prev) => ({ ...prev, status: 'ended' }))

    // TODO: Get actual results from Vapi/AI analysis
    // For now, simulate results
    if (selectedChallenge) {
      const mockResults = {
        score: Math.floor(Math.random() * 30) + 70,
        objectivesCompleted: selectedChallenge.objectives.map(() => Math.random() > 0.3),
        bonusCompleted: selectedChallenge.bonusObjectives.map(() => Math.random() > 0.7),
        xpEarned: selectedChallenge.xpReward,
        feedback: 'Great job maintaining rapport! Consider asking more follow-up questions to dig deeper into their pain points.',
      }
      setCallResults(mockResults)
      setShowResults(true)
    }
  }

  const toggleMute = () => {
    setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
  }

  const resetCall = () => {
    setCallState({
      status: 'idle',
      duration: 0,
      isMuted: false,
      transcript: [],
    })
    setShowResults(false)
    setCallResults(null)
  }

  const filteredChallenges = difficultyFilter
    ? CHALLENGES.filter((c) => c.difficulty === difficultyFilter)
    : CHALLENGES

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Discovery':
        return Target
      case 'Closing':
        return Trophy
      case 'Objection Handling':
        return Zap
      case 'Competitive Selling':
        return TrendingUp
      case 'Executive Selling':
        return Award
      case 'Deal Recovery':
        return RotateCcw
      default:
        return Star
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Flame className="w-8 h-8 text-[#00ffc1]" />
              Sales Sparring Arena
            </h1>
            <p className="text-gray-400">Practice your skills against AI prospects. Level up. Dominate.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-bold">{userStats.totalXP.toLocaleString()} XP</span>
            </div>
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-white font-bold">{userStats.currentStreak} day streak</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Challenge Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Filter:</span>
              <button
                onClick={() => setDifficultyFilter(null)}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  difficultyFilter === null
                    ? 'bg-[#00ffc1] text-[#00102e] font-semibold'
                    : 'bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setDifficultyFilter(key)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    difficultyFilter === key
                      ? `${config.bg} ${config.color} font-semibold`
                      : 'bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>

            {/* Challenge Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredChallenges.map((challenge) => {
                const diffConfig = DIFFICULTY_CONFIG[challenge.difficulty]
                const CategoryIcon = getCategoryIcon(challenge.category)
                const PersonaIcon = PERSONA_ICONS[challenge.persona] || Users
                const isSelected = selectedChallenge?.id === challenge.id
                const isCompleted = userStats.completedChallenges.includes(challenge.id)

                return (
                  <div
                    key={challenge.id}
                    onClick={() => !challenge.isLocked && setSelectedChallenge(challenge)}
                    className={`glass-card p-4 cursor-pointer transition-all relative overflow-hidden ${
                      challenge.isLocked
                        ? 'opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'border-[#00ffc1] ring-2 ring-[#00ffc1]/20'
                        : 'hover:border-[rgba(0,255,193,0.3)]'
                    }`}
                  >
                    {/* Completed Badge */}
                    {isCompleted && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </div>
                    )}

                    {/* Locked Overlay */}
                    {challenge.isLocked && (
                      <div className="absolute inset-0 bg-[#00102e]/80 flex items-center justify-center z-10">
                        <div className="text-center">
                          <Lock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">{challenge.unlockRequirement}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${diffConfig.bg} flex items-center justify-center`}>
                        <CategoryIcon className={`w-5 h-5 ${diffConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white truncate">{challenge.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded ${diffConfig.bg} ${diffConfig.color}`}>
                            {diffConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2 mb-2">{challenge.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <PersonaIcon className="w-3 h-3" />
                            {challenge.persona}
                          </span>
                          {challenge.timeLimit && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(challenge.timeLimit)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            {challenge.xpReward} XP
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-[#00ffc1]' : 'text-gray-600'}`} />
                    </div>

                    {/* Bonus Objectives Preview */}
                    {challenge.bonusObjectives.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Bonus:</span>
                          {challenge.bonusObjectives.map((bonus) => (
                            <span
                              key={bonus.id}
                              className="text-xs bg-[rgba(255,255,255,0.05)] px-2 py-1 rounded flex items-center gap-1"
                              title={bonus.description}
                            >
                              <span>{bonus.icon}</span>
                              <span className="text-gray-400">{bonus.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Call Panel */}
          <div className="space-y-4">
            {/* Selected Challenge Details */}
            {selectedChallenge ? (
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{selectedChallenge.name}</h2>
                  <span
                    className={`text-sm px-3 py-1 rounded-lg ${DIFFICULTY_CONFIG[selectedChallenge.difficulty].bg} ${DIFFICULTY_CONFIG[selectedChallenge.difficulty].color}`}
                  >
                    {DIFFICULTY_CONFIG[selectedChallenge.difficulty].label}
                  </span>
                </div>

                <p className="text-gray-400 text-sm">{selectedChallenge.description}</p>

                {/* Persona */}
                <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">You&apos;re calling:</p>
                  <p className="text-white font-medium">{selectedChallenge.persona}</p>
                </div>

                {/* Objectives */}
                <div>
                  <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#00ffc1]" />
                    Objectives
                  </h4>
                  <ul className="space-y-2">
                    {selectedChallenge.objectives.map((obj, i) => (
                      <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-xs text-gray-500 mt-0.5">
                          {i + 1}
                        </div>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bonus Objectives */}
                {selectedChallenge.bonusObjectives.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      Bonus Objectives
                    </h4>
                    <ul className="space-y-2">
                      {selectedChallenge.bonusObjectives.map((bonus) => (
                        <li key={bonus.id} className="text-sm text-gray-400 flex items-start gap-2">
                          <span className="text-lg">{bonus.icon}</span>
                          <div>
                            <span className="text-white">{bonus.name}</span>
                            <span className="text-yellow-400 text-xs ml-2">+{bonus.xpBonus} XP</span>
                            <p className="text-xs text-gray-500">{bonus.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Call Controls */}
                <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
                  {callState.status === 'idle' && (
                    <button onClick={startCall} className="btn-primary w-full flex items-center justify-center gap-2">
                      <Phone className="w-5 h-5" />
                      Start Call
                    </button>
                  )}

                  {callState.status === 'connecting' && (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[rgba(0,255,193,0.1)] flex items-center justify-center animate-pulse">
                        <Phone className="w-8 h-8 text-[#00ffc1]" />
                      </div>
                      <p className="text-white font-medium">Connecting...</p>
                      <p className="text-sm text-gray-400">Preparing your AI prospect</p>
                    </div>
                  )}

                  {callState.status === 'active' && (
                    <div className="space-y-4">
                      {/* Call Timer */}
                      <div className="text-center">
                        <div className="text-4xl font-mono font-bold text-white mb-1">
                          {formatTime(callState.duration)}
                        </div>
                        {selectedChallenge.timeLimit && (
                          <p className={`text-sm ${callState.duration > selectedChallenge.timeLimit * 0.8 ? 'text-red-400' : 'text-gray-400'}`}>
                            {callState.duration > selectedChallenge.timeLimit
                              ? 'Time exceeded!'
                              : `${formatTime(selectedChallenge.timeLimit - callState.duration)} remaining`}
                          </p>
                        )}
                      </div>

                      {/* Active Call Animation */}
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-[#00ffc1] rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 20 + 10}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>

                      {/* Call Actions */}
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={toggleMute}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            callState.isMuted
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)]'
                          }`}
                        >
                          {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={endCall}
                          className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all"
                        >
                          <PhoneOff className="w-6 h-6" />
                        </button>
                        <button className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] text-white flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)]">
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {callState.status === 'ended' && !showResults && (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[rgba(0,255,193,0.1)] flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-[#00ffc1]" />
                      </div>
                      <p className="text-white font-medium">Call Ended</p>
                      <p className="text-sm text-gray-400">Analyzing your performance...</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(0,255,193,0.1)] flex items-center justify-center">
                  <Target className="w-8 h-8 text-[#00ffc1]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Select a Challenge</h3>
                <p className="text-gray-400 text-sm">Choose a challenge from the list to start practicing</p>
              </div>
            )}

            {/* Results Panel */}
            {showResults && callResults && selectedChallenge && (
              <div className="glass-card p-6 space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-1">{callResults.score}</div>
                  <p className="text-gray-400">Overall Score</p>
                </div>

                {/* XP Earned */}
                <div className="bg-[rgba(0,255,193,0.1)] rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#00ffc1]">
                    <Star className="w-5 h-5" />
                    <span className="text-2xl font-bold">+{callResults.xpEarned} XP</span>
                  </div>
                </div>

                {/* Objectives */}
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Objectives</h4>
                  <ul className="space-y-2">
                    {selectedChallenge.objectives.map((obj, i) => (
                      <li
                        key={i}
                        className={`text-sm flex items-center gap-2 ${
                          callResults.objectivesCompleted[i] ? 'text-green-400' : 'text-gray-500'
                        }`}
                      >
                        {callResults.objectivesCompleted[i] ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bonus */}
                {selectedChallenge.bonusObjectives.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Bonus Objectives</h4>
                    <ul className="space-y-2">
                      {selectedChallenge.bonusObjectives.map((bonus, i) => (
                        <li
                          key={bonus.id}
                          className={`text-sm flex items-center gap-2 ${
                            callResults.bonusCompleted[i] ? 'text-yellow-400' : 'text-gray-500'
                          }`}
                        >
                          <span>{bonus.icon}</span>
                          {bonus.name}
                          {callResults.bonusCompleted[i] && (
                            <span className="text-xs">+{bonus.xpBonus} XP</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Feedback */}
                <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-4">
                  <h4 className="text-sm font-medium text-white mb-2">AI Feedback</h4>
                  <p className="text-sm text-gray-400">{callResults.feedback}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={resetCall} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setSelectedChallenge(null)
                      resetCall()
                    }}
                    className="btn-primary flex-1"
                  >
                    New Challenge
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
