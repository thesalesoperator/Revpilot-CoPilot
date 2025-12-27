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
import Vapi from '@vapi-ai/web'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ActiveCallOverlay from '@/components/practice/ActiveCallOverlay'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { CHALLENGES, PERSONAS, getUnlockedChallenges } from '@/lib/practice/challenges'
import type { Challenge, PracticeSession, UserPracticeStats, XPBreakdown } from '@/types/practice'
import type { CallAnalysis } from '@/types/database'

// Vapi instance type
type VapiInstance = InstanceType<typeof Vapi>

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
  liveObjectivesCompleted: string[] // Real-time objective tracking
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
    liveObjectivesCompleted: [],
  })
  const [userStats, setUserStats] = useState<UserPracticeStats | null>(null)
  const [xpToNextLevel, setXpToNextLevel] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [callResults, setCallResults] = useState<CallResults | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [callNotes, setCallNotes] = useState('')

  const vapiRef = useRef<VapiInstance | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const ringAudioRef = useRef<HTMLAudioElement | null>(null)
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastObjectiveCheckRef = useRef<number>(0)
  const objectiveCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const { user } = useAuth()
  const { showToast } = useToast()

  // Create ringing sound using Web Audio API
  const playRingTone = useCallback(() => {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
    if (!AudioContext) return null

    const audioContext = new AudioContext()

    const playRing = () => {
      // Create oscillators for a phone ring sound
      const oscillator1 = audioContext.createOscillator()
      const oscillator2 = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator1.type = 'sine'
      oscillator1.frequency.setValueAtTime(440, audioContext.currentTime) // A4
      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(480, audioContext.currentTime) // B4 (ring tone freq)

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

    // Play ring immediately
    playRing()

    // Set up interval to ring every 2 seconds
    const interval = setInterval(() => {
      if (audioContext.state === 'running') {
        playRing()
      }
    }, 2000)

    return { audioContext, interval }
  }, [])

  // Ringing effect when connecting
  useEffect(() => {
    let ringContext: { audioContext: AudioContext; interval: NodeJS.Timeout } | null = null

    if (callState.status === 'connecting') {
      ringContext = playRingTone()
      if (ringContext) {
        ringIntervalRef.current = ringContext.interval
      }
    } else {
      // Stop ringing
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

  // Fetch user stats
  const fetchUserStats = useCallback(async () => {
    try {
      const response = await fetch('/api/practice/stats')
      if (response.ok) {
        const data = await response.json()
        setUserStats(data.stats)
        setXpToNextLevel(data.xp_to_next_level)

        // Update challenges with unlock status (pass user email for VIP check)
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

  // Real-time objective checking
  const checkObjectivesRealTime = useCallback(async () => {
    if (!selectedChallenge || callState.transcript.length < 2) return

    // Debounce: only check every 8 seconds minimum
    const now = Date.now()
    if (now - lastObjectiveCheckRef.current < 8000) return
    lastObjectiveCheckRef.current = now

    const transcriptText = callState.transcript
      .map(t => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n\n')

    try {
      const response = await fetch('/api/practice/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          objectives: selectedChallenge.objectives,
          challenge_context: `Challenge: ${selectedChallenge.name}\nDescription: ${selectedChallenge.description}`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.completed && Array.isArray(data.completed)) {
          setCallState(prev => ({
            ...prev,
            liveObjectivesCompleted: data.completed,
          }))
        }
      }
    } catch (error) {
      console.error('Error checking objectives:', error)
    }
  }, [selectedChallenge, callState.transcript])

  // Run objective checking during active calls
  useEffect(() => {
    if (callState.status === 'active' && selectedChallenge) {
      // Check objectives every 10 seconds during active call
      objectiveCheckIntervalRef.current = setInterval(() => {
        checkObjectivesRealTime()
      }, 10000)

      // Also check when transcript changes significantly
      if (callState.transcript.length >= 4) {
        checkObjectivesRealTime()
      }
    } else {
      if (objectiveCheckIntervalRef.current) {
        clearInterval(objectiveCheckIntervalRef.current)
        objectiveCheckIntervalRef.current = null
      }
    }
    return () => {
      if (objectiveCheckIntervalRef.current) {
        clearInterval(objectiveCheckIntervalRef.current)
      }
    }
  }, [callState.status, callState.transcript.length, selectedChallenge, checkObjectivesRealTime])


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
      liveObjectivesCompleted: [],
    })
    lastObjectiveCheckRef.current = 0
    setCallNotes('')

    try {
      // Request microphone permission first
      console.log('Requesting microphone permission...')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Stop the stream immediately - we just need permission
        stream.getTracks().forEach(track => track.stop())
        console.log('Microphone permission granted')
      } catch (micError) {
        console.error('Microphone permission denied:', micError)
        showToast('error', 'Microphone access is required for practice calls. Please allow microphone access and try again.')
        setCallState((prev) => ({ ...prev, status: 'idle' }))
        return
      }

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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      const data = await response.json()
      setCurrentSession(data.session)

      // Initialize Vapi call
      const vapiApiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY

      if (!vapiApiKey) {
        // Fallback to simulation mode if no API key
        showToast('info', 'Running in simulation mode (no API key configured)')
        setTimeout(() => {
          setCallState((prev) => ({ ...prev, status: 'active' }))
          showToast('success', 'Call connected (simulation mode)')
        }, 2000)
        return
      }

      vapiRef.current = new Vapi(vapiApiKey)

      // Set up event listeners
      vapiRef.current.on('call-start', () => {
        setCallState((prev) => ({ ...prev, status: 'active' }))
        showToast('success', 'Call connected!')
      })

      vapiRef.current.on('call-end', () => {
        handleCallEnd()
      })

      vapiRef.current.on('speech-start', () => {
        // Speech started - could add visual indicator here
      })

      vapiRef.current.on('speech-end', () => {
        // Speech ended - could update visual indicator here
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

      // Start the call with the assistant config
      // Metadata is passed to identify the session in webhooks
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
      // Simulation mode - generate mock results based on call duration
      if (selectedChallenge) {
        // Score based on duration (penalize short calls like real analysis)
        let baseScore = 50
        if (callState.duration < 30) baseScore = 10
        else if (callState.duration < 60) baseScore = 25
        else if (callState.duration < 120) baseScore = 40
        else baseScore = Math.floor(Math.random() * 30) + 50 // 50-80 for longer calls

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
            ? 'The call was too short to evaluate properly. Try to have a longer conversation to practice your skills.'
            : 'Simulation mode - connect with Vapi for real AI analysis.',
        }
        setCallResults(mockResults)
        setShowResults(true)
      }
      return
    }

    // Mark session as ended and save transcript from frontend
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

    // Wait a moment for webhook to potentially update with better transcript
    await new Promise(resolve => setTimeout(resolve, 2000))

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
      // Fallback results - give low score since analysis failed
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
        feedback: 'Unable to analyze call. The call may have been too short or there was an error.',
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
      liveObjectivesCompleted: [],
    })
    lastObjectiveCheckRef.current = 0
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
          <Loader2 className="w-8 h-8 text-[#5eead4] animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  // Determine if we should show the full-screen call overlay
  const showCallOverlay = selectedChallenge &&
    (callState.status === 'connecting' || callState.status === 'active' ||
     ((callState.status === 'ended' || callState.status === 'analyzing') && !showResults))

  return (
    <DashboardLayout>
      {/* Full-screen call overlay */}
      {showCallOverlay && (
        <ActiveCallOverlay
          challenge={selectedChallenge}
          callStatus={callState.status as 'connecting' | 'active' | 'ended' | 'analyzing'}
          duration={callState.duration}
          isMuted={callState.isMuted}
          transcript={callState.transcript}
          liveObjectivesCompleted={callState.liveObjectivesCompleted}
          notes={callNotes}
          onNotesChange={setCallNotes}
          onToggleMute={toggleMute}
          onEndCall={endCall}
        />
      )}

      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Flame className="w-8 h-8 text-[#5eead4]" />
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
                    ? 'bg-[#5eead4] text-[#0a0a0f] font-semibold'
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
                        ? 'border-[#5eead4] ring-2 ring-[#5eead4]/20'
                        : 'hover:border-[rgba(94,234,212,0.3)]'
                    }`}
                  >
                    {/* Best Score Badge */}
                    {bestScore && (
                      <div className="absolute top-2 right-2">
                        <div className="flex items-center gap-1 bg-[rgba(94,234,212,0.1)] px-2 py-1 rounded-full">
                          <Trophy className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs text-yellow-400">{bestScore}</span>
                        </div>
                      </div>
                    )}

                    {/* Locked Overlay */}
                    {challenge.isLocked && (
                      <div className="absolute inset-0 bg-[#0a0a0f]/80 flex items-center justify-center z-10">
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
                      <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-[#5eead4]' : 'text-gray-600'}`} />
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
                    <Target className="w-4 h-4 text-[#5eead4]" />
                    Objectives
                    {callState.status === 'active' && callState.liveObjectivesCompleted.length > 0 && (
                      <span className="text-xs text-[#5eead4] ml-auto">
                        {callState.liveObjectivesCompleted.length}/{selectedChallenge.objectives.length}
                      </span>
                    )}
                  </h4>
                  <ul className="space-y-2">
                    {selectedChallenge.objectives.map((obj, i) => {
                      const isCompleted = callState.liveObjectivesCompleted.includes(obj)
                      const isActive = callState.status === 'active'
                      return (
                        <li
                          key={i}
                          className={`text-sm flex items-start gap-2 transition-all duration-300 ${
                            isCompleted ? 'text-[#5eead4]' : 'text-gray-400'
                          }`}
                        >
                          {isActive && isCompleted ? (
                            <div className="w-5 h-5 rounded-full bg-[#5eead4]/20 flex items-center justify-center mt-0.5">
                              <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-xs text-gray-500 mt-0.5">
                              {i + 1}
                            </div>
                          )}
                          <span className={isCompleted ? 'font-medium' : ''}>{obj}</span>
                        </li>
                      )
                    })}
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
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[rgba(94,234,212,0.1)] flex items-center justify-center animate-pulse">
                        <Phone className="w-8 h-8 text-[#5eead4]" />
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
                            className="w-1 bg-[#5eead4] rounded-full animate-pulse"
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
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-[rgba(94,234,212,0.1)] flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-[#5eead4] animate-spin" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white mb-2">Analyzing Your Call</p>
                        <p className="text-sm text-gray-400">Please wait while our AI coach reviews your performance...</p>
                      </div>
                      <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-4 text-left space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                          <span className="text-gray-300">Call recorded ({formatTime(callState.duration)})</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="w-4 h-4 text-[#5eead4] animate-spin" />
                          <span className="text-gray-300">Processing transcript...</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                          <span className="text-gray-500">Evaluating objectives...</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                          <span className="text-gray-500">Generating feedback...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(94,234,212,0.1)] flex items-center justify-center">
                  <Target className="w-8 h-8 text-[#5eead4]" />
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
                <div className="bg-[rgba(94,234,212,0.1)] rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#5eead4]">
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
