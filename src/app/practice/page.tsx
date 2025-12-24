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
  Award,
  Users,
  Briefcase,
  TrendingUp,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import Vapi from '@vapi-ai/web'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { CHALLENGES, PERSONAS, getUnlockedChallenges } from '@/lib/practice/challenges'
import type { Challenge, PracticeSession, UserPracticeStats, XPBreakdown } from '@/types/practice'
import type { CallAnalysis } from '@/types/database'

type VapiInstance = InstanceType<typeof Vapi>

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
  easy: { label: 'Beginner' },
  medium: { label: 'Intermediate' },
  hard: { label: 'Advanced' },
  expert: { label: 'Expert' },
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
  const [showResults, setShowResults] = useState(false)
  const [callResults, setCallResults] = useState<CallResults | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const vapiRef = useRef<VapiInstance | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const { user } = useAuth()
  const { showToast } = useToast()

  const playRingTone = useCallback(() => {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
    if (!AudioContext) return null

    const audioContext = new AudioContext()

    const playRing = () => {
      const oscillator1 = audioContext.createOscillator()
      const oscillator2 = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator1.type = 'sine'
      oscillator1.frequency.setValueAtTime(440, audioContext.currentTime)
      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(480, audioContext.currentTime)

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator1.start(audioContext.currentTime)
      oscillator2.start(audioContext.currentTime)
      oscillator1.stop(audioContext.currentTime + 0.5)
      oscillator2.stop(audioContext.currentTime + 0.5)
    }

    playRing()

    const interval = setInterval(() => {
      if (audioContext.state === 'running') {
        playRing()
      }
    }, 2000)

    return { audioContext, interval }
  }, [])

  useEffect(() => {
    let ringContext: { audioContext: AudioContext; interval: NodeJS.Timeout } | null = null

    if (callState.status === 'connecting') {
      ringContext = playRingTone()
      if (ringContext) {
        ringIntervalRef.current = ringContext.interval
      }
    } else {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current)
        ringIntervalRef.current = null
      }
    }

    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current)
      }
      if (ringContext?.audioContext) {
        ringContext.audioContext.close()
      }
    }
  }, [callState.status, playRingTone])

  const fetchUserStats = useCallback(async () => {
    try {
      const response = await fetch('/api/practice/stats')
      if (response.ok) {
        const data = await response.json()
        setUserStats(data.stats)

        const unlockedChallenges = getUnlockedChallenges({
          easy_completed: data.stats.easy_completed || 0,
          medium_completed: data.stats.medium_completed || 0,
          hard_completed: data.stats.hard_completed || 0,
          expert_completed: data.stats.expert_completed || 0,
        }, user?.email)
        setChallenges(unlockedChallenges)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.email])

  useEffect(() => {
    fetchUserStats()
  }, [fetchUserStats])

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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop())
      } catch (micError) {
        console.error('Microphone permission denied:', micError)
        showToast('error', 'Microphone access is required. Please allow microphone access and try again.')
        setCallState((prev) => ({ ...prev, status: 'idle' }))
        return
      }

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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      const data = await response.json()
      setCurrentSession(data.session)

      const vapiApiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY

      if (!vapiApiKey) {
        showToast('info', 'Running in demo mode')
        setTimeout(() => {
          setCallState((prev) => ({ ...prev, status: 'active' }))
          showToast('success', 'Call connected')
        }, 2000)
        return
      }

      vapiRef.current = new Vapi(vapiApiKey)

      vapiRef.current.on('call-start', () => {
        setCallState((prev) => ({ ...prev, status: 'active' }))
        showToast('success', 'Call connected')
      })

      vapiRef.current.on('call-end', () => {
        handleCallEnd()
      })

      vapiRef.current.on('message', (msg) => {
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

      vapiRef.current.on('error', (err) => {
        console.error('Vapi error:', err)
        const errorMessage = typeof err === 'object' && err !== null
          ? (err as Record<string, unknown>).message || (err as Record<string, unknown>).error || 'Unknown error'
          : String(err)
        showToast('error', 'Call error: ' + errorMessage)
        setCallState((prev) => ({ ...prev, status: 'idle' }))
      })

      const assistantConfig = {
        ...data.vapi_config.assistant,
        metadata: data.vapi_config.metadata,
      }
      await vapiRef.current.start(assistantConfig)
    } catch (error) {
      console.error('Error starting call:', error)
      showToast('error', 'Failed to start call: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setCallState((prev) => ({ ...prev, status: 'idle' }))
    }
  }

  const handleCallEnd = async () => {
    setCallState((prev) => ({ ...prev, status: 'ended' }))

    if (!currentSession) {
      if (selectedChallenge) {
        let baseScore = 50
        if (callState.duration < 30) baseScore = 10
        else if (callState.duration < 60) baseScore = 25
        else if (callState.duration < 120) baseScore = 40
        else baseScore = Math.floor(Math.random() * 30) + 50

        const objectivesCompleted = callState.duration > 60
          ? selectedChallenge.objectives.filter(() => Math.random() > 0.5)
          : []
        const bonusCompleted = callState.duration > 120
          ? selectedChallenge.bonusObjectives.filter(() => Math.random() > 0.8).map(b => b.id)
          : []

        const objectiveXP = objectivesCompleted.length * 10
        const bonusXP = bonusCompleted.length * 25
        const totalXP = baseScore > 30 ? selectedChallenge.xpReward + objectiveXP + bonusXP : 0

        const mockResults: CallResults = {
          score: baseScore,
          objectivesCompleted,
          bonusCompleted,
          xpEarned: totalXP,
          xpBreakdown: {
            base: baseScore > 30 ? selectedChallenge.xpReward : 0,
            objectives: objectiveXP,
            bonus: bonusXP,
            streak: 0,
            difficulty_multiplier: 1,
            total: totalXP,
          },
          analysis: null,
          feedback: callState.duration < 60
            ? 'The call was too short for proper evaluation. Try extending the conversation.'
            : 'Demo mode - connect API for full analysis.',
        }
        setCallResults(mockResults)
        setShowResults(true)
      }
      return
    }

    const frontendTranscript = callState.transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n\n')
    await fetch(`/api/practice/session/${currentSession.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ended',
        transcript: frontendTranscript,
        duration_seconds: callState.duration,
      }),
    })

    setCallState((prev) => ({ ...prev, status: 'analyzing' }))

    await new Promise(resolve => setTimeout(resolve, 2000))

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

        if (analysisData.user_stats) {
          setUserStats(analysisData.user_stats)
        }
      } else {
        throw new Error('Analysis failed')
      }
    } catch (error) {
      console.error('Error analyzing call:', error)
      setCallResults({
        score: 0,
        objectivesCompleted: [],
        bonusCompleted: [],
        xpEarned: 0,
        xpBreakdown: {
          base: 0,
          objectives: 0,
          bonus: 0,
          streak: 0,
          difficulty_multiplier: 1,
          total: 0,
        },
        analysis: null,
        feedback: 'Unable to analyze call. The session may have been too short.',
      })
    }

    setShowResults(true)
  }

  const endCall = async () => {
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
      case 'Special Ops':
        return Briefcase
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
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Practice Sessions</h1>
            <p className="text-[var(--text-secondary)]">Train with AI-powered sales scenarios</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[var(--bg-surface)] rounded-lg px-4 py-2 border border-[var(--border-subtle)]">
              <span className="text-sm text-[var(--text-muted)]">Sessions: </span>
              <span className="text-[var(--text-primary)] font-medium">{userStats?.total_sessions || 0}</span>
            </div>
            {userStats?.current_streak && userStats.current_streak > 0 && (
              <div className="bg-[var(--accent-muted)] rounded-lg px-4 py-2 border border-[var(--accent)]">
                <span className="text-sm text-[var(--accent)]">{userStats.current_streak} day streak</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Challenge Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-muted)]">Level:</span>
              <button
                onClick={() => setDifficultyFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  difficultyFilter === null
                    ? 'bg-[var(--accent)] text-[var(--bg-base)] font-medium'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                All
              </button>
              {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setDifficultyFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    difficultyFilter === key
                      ? 'bg-[var(--accent)] text-[var(--bg-base)] font-medium'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>

            {/* Challenge Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredChallenges.map((challenge) => {
                const CategoryIcon = getCategoryIcon(challenge.category)
                const PersonaIcon = getPersonaIcon(challenge.personaId)
                const isSelected = selectedChallenge?.id === challenge.id
                const bestScore = userStats?.best_scores?.[challenge.id]?.score

                return (
                  <div
                    key={challenge.id}
                    onClick={() => !challenge.isLocked && callState.status === 'idle' && setSelectedChallenge(challenge)}
                    className={`bg-[var(--bg-surface)] rounded-xl p-4 border cursor-pointer transition-all relative overflow-hidden ${
                      challenge.isLocked
                        ? 'opacity-50 cursor-not-allowed border-[var(--border-subtle)]'
                        : callState.status !== 'idle'
                        ? 'opacity-50 cursor-not-allowed border-[var(--border-subtle)]'
                        : isSelected
                        ? 'border-[var(--accent)]'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                    }`}
                  >
                    {/* Best Score Badge */}
                    {bestScore && (
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center gap-1 bg-[var(--success-muted)] px-2 py-1 rounded">
                          <Trophy className="w-3 h-3 text-[var(--success)]" />
                          <span className="text-xs text-[var(--success)] font-medium">{bestScore}</span>
                        </div>
                      </div>
                    )}

                    {/* Locked Overlay */}
                    {challenge.isLocked && (
                      <div className="absolute inset-0 bg-[var(--bg-base)]/80 flex items-center justify-center z-10">
                        <div className="text-center">
                          <Lock className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
                          <p className="text-sm text-[var(--text-muted)]">{challenge.unlockRequirement}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
                        <CategoryIcon className="w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-[var(--text-primary)] truncate">{challenge.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                            {DIFFICULTY_CONFIG[challenge.difficulty].label}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">{challenge.description}</p>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
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
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Call Panel */}
          <div className="space-y-4">
            {/* Selected Challenge Details */}
            {selectedChallenge ? (
              <div className="bg-[var(--bg-surface)] rounded-xl p-6 border border-[var(--border-subtle)] space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selectedChallenge.name}</h2>
                  <span className="text-xs px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                    {DIFFICULTY_CONFIG[selectedChallenge.difficulty].label}
                  </span>
                </div>

                <p className="text-[var(--text-secondary)] text-sm">{selectedChallenge.description}</p>

                {/* Persona */}
                <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Speaking with:</p>
                  <p className="text-[var(--text-primary)] font-medium">{selectedChallenge.persona}</p>
                </div>

                {/* Objectives */}
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[var(--accent)]" />
                    Objectives
                  </h4>
                  <ul className="space-y-2">
                    {selectedChallenge.objectives.map((obj, i) => (
                      <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                        <div className="w-5 h-5 rounded bg-[var(--bg-elevated)] flex items-center justify-center text-xs text-[var(--text-muted)] mt-0.5">
                          {i + 1}
                        </div>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Call Controls */}
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  {callState.status === 'idle' && (
                    <button
                      onClick={startCall}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-base)] font-medium hover:bg-[var(--accent-light)] transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                      Start Session
                    </button>
                  )}

                  {callState.status === 'connecting' && (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--accent-muted)] flex items-center justify-center animate-pulse">
                        <Phone className="w-7 h-7 text-[var(--accent)]" />
                      </div>
                      <p className="text-[var(--text-primary)] font-medium">Connecting...</p>
                      <p className="text-sm text-[var(--text-muted)]">Preparing session</p>
                    </div>
                  )}

                  {callState.status === 'active' && (
                    <div className="space-y-4">
                      {/* Call Timer */}
                      <div className="text-center">
                        <div className="text-3xl font-mono font-semibold text-[var(--text-primary)] mb-1">
                          {formatTime(callState.duration)}
                        </div>
                        {selectedChallenge.timeLimit && (
                          <p className={`text-sm ${callState.duration > selectedChallenge.timeLimit * 0.8 ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'}`}>
                            {callState.duration > selectedChallenge.timeLimit
                              ? 'Time exceeded'
                              : `${formatTime(selectedChallenge.timeLimit - callState.duration)} remaining`}
                          </p>
                        )}
                      </div>

                      {/* Active Call Indicator */}
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-[var(--accent)] rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 16 + 8}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>

                      {/* Call Actions */}
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={toggleMute}
                          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                            callState.isMuted
                              ? 'bg-[var(--error-muted)] text-[var(--error)]'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={endCall}
                          className="w-14 h-14 rounded-full bg-[var(--error)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                        >
                          <PhoneOff className="w-6 h-6" />
                        </button>
                        <button className="w-11 h-11 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--bg-subtle)]">
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {(callState.status === 'ended' || callState.status === 'analyzing') && !showResults && (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--accent-muted)] flex items-center justify-center">
                        <Loader2 className="w-7 h-7 text-[var(--accent)] animate-spin" />
                      </div>
                      <p className="text-[var(--text-primary)] font-medium mb-1">Analyzing Session</p>
                      <p className="text-sm text-[var(--text-muted)]">Please wait...</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[var(--bg-surface)] rounded-xl p-8 border border-[var(--border-subtle)] text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
                  <Target className="w-7 h-7 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Select a Scenario</h3>
                <p className="text-[var(--text-muted)] text-sm">Choose a scenario to start practicing</p>
              </div>
            )}

            {/* Results Panel */}
            {showResults && callResults && selectedChallenge && (
              <div className="bg-[var(--bg-surface)] rounded-xl p-6 border border-[var(--border-subtle)] space-y-5">
                <div className="text-center">
                  <div className="text-4xl font-semibold text-[var(--text-primary)] mb-1">{callResults.score}</div>
                  <p className="text-[var(--text-muted)]">Overall Score</p>
                </div>

                {/* Points Earned */}
                {callResults.xpEarned > 0 && (
                  <div className="bg-[var(--accent-muted)] rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-[var(--accent)]">
                      <Star className="w-5 h-5" />
                      <span className="text-xl font-semibold">+{callResults.xpEarned} points</span>
                    </div>
                  </div>
                )}

                {/* Objectives */}
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Objectives</h4>
                  <ul className="space-y-2">
                    {selectedChallenge.objectives.map((obj, i) => {
                      const completed = callResults.objectivesCompleted.includes(obj)
                      return (
                        <li
                          key={i}
                          className={`text-sm flex items-center gap-2 ${
                            completed ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
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

                {/* Feedback */}
                <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Feedback</h4>
                  <p className="text-sm text-[var(--text-secondary)]">{callResults.feedback}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={resetCall}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setSelectedChallenge(null)
                      resetCall()
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--bg-base)] font-medium hover:bg-[var(--accent-light)] transition-colors"
                  >
                    New Scenario
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
