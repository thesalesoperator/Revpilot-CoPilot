'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  RotateCcw,
  Loader2,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { CHALLENGES, PERSONAS, getUnlockedChallenges } from '@/lib/practice/challenges'
import type { Challenge, PracticeSession, UserPracticeStats, XPBreakdown } from '@/types/practice'
import type { CallAnalysis } from '@/types/database'

// Vapi Web SDK types
declare global {
  interface Window {
    Vapi?: new (apiKey: string) => VapiInstance
  }
}

interface VapiInstance {
  start: (config: VapiAssistantConfig) => Promise<void>
  stop: () => void
  send: (message: { type: string; message?: string }) => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
  off: (event: string, callback: (...args: unknown[]) => void) => void
  isMuted: () => boolean
  setMuted: (muted: boolean) => void
}

interface VapiAssistantConfig {
  name: string
  voice: { provider: string; voiceId: string }
  model: { provider: string; model: string; messages: { role: string; content: string }[]; temperature: number }
  firstMessage: string
  endCallMessage?: string
  endCallPhrases?: string[]
  transcriber?: { provider: string; model: string }
  recordingEnabled?: boolean
  serverUrl?: string
  serverUrlSecret?: string
  metadata?: Record<string, string>
}

interface CallState {
  status: 'idle' | 'connecting' | 'active' | 'ended' | 'analyzing'
  duration: number
  isMuted: boolean
  transcript: Array<{ role: 'user' | 'assistant'; text: string }>
}

interface CallResults {
  score: number
  objectivesCompleted: string[]
  bonusCompleted: string[]
  xpEarned: number
  xpBreakdown: XPBreakdown
  analysis: CallAnalysis | null
  feedback: string
}

const DIFFICULTY_CONFIG = {
  easy: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', label: 'Easy' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'Medium' },
  hard: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', label: 'Hard' },
  expert: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Expert' },
}

const PERSONA_ICONS: Record<string, typeof Users> = {
  'c-suite': Award,
  'technical': Target,
  'finance': TrendingUp,
  'champions': Users,
  'blockers': Zap,
}

export default function PracticePage() {
  const [challenges, setChallenges] = useState<Challenge[]>(CHALLENGES)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null)
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    duration: 0,
    isMuted: false,
    transcript: [],
  })
  const [userStats, setUserStats] = useState<UserPracticeStats | null>(null)
  const [xpToNextLevel, setXpToNextLevel] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [callResults, setCallResults] = useState<CallResults | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const vapiRef = useRef<VapiInstance | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const { user } = useAuth()
  const { showToast } = useToast()

  // Fetch user stats
  const fetchUserStats = useCallback(async () => {
    try {
      const response = await fetch('/api/practice/stats')
      if (response.ok) {
        const data = await response.json()
        setUserStats(data.stats)
        setXpToNextLevel(data.xp_to_next_level)

        // Update challenges with unlock status
        const unlockedChallenges = getUnlockedChallenges({
          hard_completed: data.stats.hard_completed || 0,
          expert_completed: data.stats.expert_completed || 0,
        })
        setChallenges(unlockedChallenges)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchUserStats()
  }, [fetchUserStats])

  // Timer effect
  useEffect(() => {
    if (callState.status === 'active') {
      timerRef.current = setInterval(() => {
        setCallState((prev) => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [callState.status])

  // Load Vapi SDK
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/vapi-web.min.js'
    script.async = true
    script.onload = () => {
      console.log('Vapi SDK loaded')
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

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

    try {
      // Create practice session
      const response = await fetch('/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: selectedChallenge.id,
          persona_id: selectedChallenge.personaId,
          difficulty: selectedChallenge.difficulty,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      setCurrentSession(data.session)

      // Initialize Vapi call
      const vapiApiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
      if (!vapiApiKey) {
        // Fallback to simulation mode if no API key
        console.warn('No Vapi API key, running in simulation mode')
        setTimeout(() => {
          setCallState((prev) => ({ ...prev, status: 'active' }))
          showToast('success', 'Call connected (simulation mode)')
        }, 2000)
        return
      }

      if (window.Vapi) {
        vapiRef.current = new window.Vapi(vapiApiKey)

        // Set up event listeners
        vapiRef.current.on('call-start', () => {
          setCallState((prev) => ({ ...prev, status: 'active' }))
          showToast('success', 'Call connected!')
        })

        vapiRef.current.on('call-end', () => {
          handleCallEnd()
        })

        vapiRef.current.on('speech-start', () => {
          // AI started speaking
        })

        vapiRef.current.on('speech-end', () => {
          // AI stopped speaking
        })

        vapiRef.current.on('message', (msg: unknown) => {
          const message = msg as { type: string; role?: string; transcript?: string }
          if (message.type === 'transcript' && message.transcript) {
            setCallState((prev) => ({
              ...prev,
              transcript: [
                ...prev.transcript,
                { role: message.role as 'user' | 'assistant', text: message.transcript || '' },
              ],
            }))
          }
        })

        vapiRef.current.on('error', (err: unknown) => {
          const error = err as Error
          console.error('Vapi error:', error)
          showToast('error', 'Call error: ' + (error?.message || 'Unknown error'))
          setCallState((prev) => ({ ...prev, status: 'idle' }))
        })

        // Start the call with the assistant config
        await vapiRef.current.start(data.vapi_config.assistant)
      } else {
        // Vapi SDK not loaded, use simulation
        setTimeout(() => {
          setCallState((prev) => ({ ...prev, status: 'active' }))
          showToast('success', 'Call connected (simulation mode)')
        }, 2000)
      }
    } catch (error) {
      console.error('Error starting call:', error)
      showToast('error', 'Failed to start call')
      setCallState((prev) => ({ ...prev, status: 'idle' }))
    }
  }

  const handleCallEnd = async () => {
    setCallState((prev) => ({ ...prev, status: 'ended' }))

    if (!currentSession) {
      // Simulation mode - generate mock results
      if (selectedChallenge) {
        const mockResults: CallResults = {
          score: Math.floor(Math.random() * 30) + 70,
          objectivesCompleted: selectedChallenge.objectives.filter(() => Math.random() > 0.3),
          bonusCompleted: selectedChallenge.bonusObjectives.filter(() => Math.random() > 0.7).map(b => b.id),
          xpEarned: selectedChallenge.xpReward,
          xpBreakdown: {
            base: selectedChallenge.xpReward,
            objectives: 50,
            bonus: 0,
            streak: 0,
            difficulty_multiplier: 1,
            total: selectedChallenge.xpReward + 50,
          },
          analysis: null,
          feedback: 'Great job maintaining rapport! Consider asking more follow-up questions to dig deeper into their pain points.',
        }
        setCallResults(mockResults)
        setShowResults(true)
      }
      return
    }

    // Mark session as ended
    await fetch(`/api/practice/session/${currentSession.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ended',
        transcript: callState.transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n\n'),
      }),
    })

    setCallState((prev) => ({ ...prev, status: 'analyzing' }))

    // Analyze the session
    try {
      const analyzeResponse = await fetch('/api/practice/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSession.id }),
      })

      if (analyzeResponse.ok) {
        const analysisData = await analyzeResponse.json()

        setCallResults({
          score: analysisData.overall_score || 0,
          objectivesCompleted: analysisData.objectives_completed || [],
          bonusCompleted: analysisData.bonus_objectives_completed || [],
          xpEarned: analysisData.xp_breakdown?.total || 0,
          xpBreakdown: analysisData.xp_breakdown,
          analysis: analysisData.analysis,
          feedback: analysisData.analysis?.summary || 'Call analyzed successfully.',
        })

        // Update user stats
        if (analysisData.user_stats) {
          setUserStats(analysisData.user_stats)
        }
      } else {
        throw new Error('Analysis failed')
      }
    } catch (error) {
      console.error('Error analyzing call:', error)
      // Fallback results
      setCallResults({
        score: 70,
        objectivesCompleted: [],
        bonusCompleted: [],
        xpEarned: selectedChallenge?.xpReward || 0,
        xpBreakdown: {
          base: selectedChallenge?.xpReward || 0,
          objectives: 0,
          bonus: 0,
          streak: 0,
          difficulty_multiplier: 1,
          total: selectedChallenge?.xpReward || 0,
        },
        analysis: null,
        feedback: 'Unable to analyze call in detail. Please try again.',
      })
    }

    setShowResults(true)
  }

  const endCall = async () => {
    // Stop Vapi call if active
    if (vapiRef.current) {
      vapiRef.current.stop()
    }

    await handleCallEnd()
  }

  const toggleMute = () => {
    if (vapiRef.current) {
      const newMuted = !callState.isMuted
      vapiRef.current.setMuted(newMuted)
      setCallState((prev) => ({ ...prev, isMuted: newMuted }))
    } else {
      setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
    }
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
    setCurrentSession(null)
  }

  const filteredChallenges = difficultyFilter
    ? challenges.filter((c) => c.difficulty === difficultyFilter)
    : challenges

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Discovery':
        return Target
      case 'Closing':
        return Trophy
      case 'Objection Handling':
      case 'Objections':
        return Zap
      case 'Competitive':
      case 'Competitive Selling':
        return TrendingUp
      case 'Executive Presence':
      case 'Executive Selling':
        return Award
      case 'Advanced':
      case 'Deal Recovery':
        return RotateCcw
      default:
        return Star
    }
  }

  const getPersonaIcon = (personaId: string) => {
    const persona = PERSONAS.find(p => p.id === personaId)
    if (persona) {
      return PERSONA_ICONS[persona.category] || Users
    }
    return Users
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#00ffc1] animate-spin" />
        </div>
      </DashboardLayout>
    )
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
              <span className="text-white font-bold">{(userStats?.total_xp || 0).toLocaleString()} XP</span>
            </div>
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-white font-bold">{userStats?.current_streak || 0} day streak</span>
            </div>
            {userStats?.current_rank && (
              <div className="glass-card px-4 py-2">
                <span className="text-white font-bold">{userStats.current_rank}</span>
              </div>
            )}
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
                const PersonaIcon = getPersonaIcon(challenge.personaId)
                const isSelected = selectedChallenge?.id === challenge.id
                const bestScore = userStats?.best_scores?.[challenge.id]?.score

                return (
                  <div
                    key={challenge.id}
                    onClick={() => !challenge.isLocked && callState.status === 'idle' && setSelectedChallenge(challenge)}
                    className={`glass-card p-4 cursor-pointer transition-all relative overflow-hidden ${
                      challenge.isLocked
                        ? 'opacity-50 cursor-not-allowed'
                        : callState.status !== 'idle'
                        ? 'opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'border-[#00ffc1] ring-2 ring-[#00ffc1]/20'
                        : 'hover:border-[rgba(0,255,193,0.3)]'
                    }`}
                  >
                    {/* Best Score Badge */}
                    {bestScore && (
                      <div className="absolute top-2 right-2">
                        <div className="flex items-center gap-1 bg-[rgba(0,255,193,0.1)] px-2 py-1 rounded-full">
                          <Trophy className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs text-yellow-400">{bestScore}</span>
                        </div>
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

                  {(callState.status === 'ended' || callState.status === 'analyzing') && !showResults && (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[rgba(0,255,193,0.1)] flex items-center justify-center">
                        {callState.status === 'analyzing' ? (
                          <Loader2 className="w-8 h-8 text-[#00ffc1] animate-spin" />
                        ) : (
                          <CheckCircle className="w-8 h-8 text-[#00ffc1]" />
                        )}
                      </div>
                      <p className="text-white font-medium">
                        {callState.status === 'analyzing' ? 'Analyzing...' : 'Call Ended'}
                      </p>
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
                  {callResults.xpBreakdown && (
                    <div className="text-xs text-gray-400 mt-2 space-x-2">
                      <span>Base: {callResults.xpBreakdown.base}</span>
                      {callResults.xpBreakdown.objectives > 0 && <span>• Objectives: +{callResults.xpBreakdown.objectives}</span>}
                      {callResults.xpBreakdown.bonus > 0 && <span>• Bonus: +{callResults.xpBreakdown.bonus}</span>}
                      {callResults.xpBreakdown.streak > 0 && <span>• Streak: +{callResults.xpBreakdown.streak}</span>}
                    </div>
                  )}
                </div>

                {/* Objectives */}
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Objectives</h4>
                  <ul className="space-y-2">
                    {selectedChallenge.objectives.map((obj, i) => {
                      const completed = callResults.objectivesCompleted.includes(obj)
                      return (
                        <li
                          key={i}
                          className={`text-sm flex items-center gap-2 ${
                            completed ? 'text-green-400' : 'text-gray-500'
                          }`}
                        >
                          {completed ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {obj}
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Bonus */}
                {selectedChallenge.bonusObjectives.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Bonus Objectives</h4>
                    <ul className="space-y-2">
                      {selectedChallenge.bonusObjectives.map((bonus) => {
                        const completed = callResults.bonusCompleted.includes(bonus.id)
                        return (
                          <li
                            key={bonus.id}
                            className={`text-sm flex items-center gap-2 ${
                              completed ? 'text-yellow-400' : 'text-gray-500'
                            }`}
                          >
                            <span>{bonus.icon}</span>
                            {bonus.name}
                            {completed && (
                              <span className="text-xs">+{bonus.xpBonus} XP</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* Feedback */}
                <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-4">
                  <h4 className="text-sm font-medium text-white mb-2">AI Feedback</h4>
                  <p className="text-sm text-gray-400">{callResults.feedback}</p>
                </div>

                {/* Detailed Analysis */}
                {callResults.analysis && (
                  <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-4">
                    <h4 className="text-sm font-medium text-white mb-3">Performance Breakdown</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(callResults.analysis).map(([key, value]) => {
                        if (key === 'talk_listen_ratio' || key === 'key_improvements' || key === 'strengths' || key === 'summary') return null
                        const typedValue = value as { score?: number }
                        if (!typedValue?.score) return null
                        return (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className={`font-medium ${typedValue.score >= 80 ? 'text-green-400' : typedValue.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {typedValue.score}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

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
