'use client'

import { useRef, useState } from 'react'
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Target,
  Star,
  CheckCircle,
  Volume2,
  Loader2,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  User,
  DollarSign,
  Clock,
  Users,
  AlertCircle,
} from 'lucide-react'
import type { Challenge } from '@/types/practice'

interface ActiveCallOverlayProps {
  challenge: Challenge
  callStatus: 'connecting' | 'active' | 'ended' | 'analyzing'
  duration: number
  isMuted: boolean
  transcript: Array<{ role: 'user' | 'assistant'; text: string }>
  liveObjectivesCompleted: string[]
  notes: string
  onNotesChange: (notes: string) => void
  onToggleMute: () => void
  onEndCall: () => void
}

// Script sections for RevPilot methodology
const SCRIPT_SECTIONS = [
  { id: 'opening', name: 'Opening', order: 1 },
  { id: 'problem', name: 'Problem Isolation', order: 2 },
  { id: 'background', name: 'Background', order: 3 },
  { id: 'discovery', name: 'Deep Discovery', order: 4 },
  { id: 'financial', name: 'Financial Qualifier', order: 5 },
  { id: 'urgency', name: 'Urgency Building', order: 6 },
  { id: 'close', name: 'Close', order: 7 },
]

// Extract key info from transcript
function extractKeyInfo(transcript: Array<{ role: 'user' | 'assistant'; text: string }>) {
  const fullText = transcript.map(t => t.text.toLowerCase()).join(' ')

  const painPoints: string[] = []
  const budget: string | null = null
  const timeline: string | null = null
  const decisionMakers: string[] = []

  // Simple extraction patterns
  const painPatterns = [
    /struggling with ([^.]+)/gi,
    /problem with ([^.]+)/gi,
    /challenge[s]? (?:is|are|with) ([^.]+)/gi,
    /pain point[s]? ([^.]+)/gi,
    /frustrated (?:by|with) ([^.]+)/gi,
  ]

  painPatterns.forEach(pattern => {
    const matches = fullText.match(pattern)
    if (matches) {
      matches.forEach(m => {
        const cleaned = m.replace(pattern, '$1').trim()
        if (cleaned.length > 5 && cleaned.length < 100 && !painPoints.includes(cleaned)) {
          painPoints.push(cleaned)
        }
      })
    }
  })

  return { painPoints: painPoints.slice(0, 3), budget, timeline, decisionMakers }
}

// Detect current script section based on transcript
function detectScriptSection(transcript: Array<{ role: 'user' | 'assistant'; text: string }>): number {
  if (transcript.length === 0) return 1

  const fullText = transcript.map(t => t.text.toLowerCase()).join(' ')
  const wordCount = fullText.split(' ').length

  // Simple heuristic based on conversation progression
  if (wordCount < 50) return 1 // Opening
  if (wordCount < 150) return 2 // Problem Isolation
  if (wordCount < 300) return 3 // Background
  if (wordCount < 500) return 4 // Deep Discovery
  if (wordCount < 700) return 5 // Financial
  if (wordCount < 900) return 6 // Urgency
  return 7 // Close
}

export default function ActiveCallOverlay({
  challenge,
  callStatus,
  duration,
  isMuted,
  transcript,
  liveObjectivesCompleted,
  notes,
  onNotesChange,
  onToggleMute,
  onEndCall,
}: ActiveCallOverlayProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  // Extract key info from transcript
  const keyInfo = extractKeyInfo(transcript)
  const currentSectionOrder = detectScriptSection(transcript)
  const currentSection = SCRIPT_SECTIONS.find(s => s.order === currentSectionOrder) || SCRIPT_SECTIONS[0]
  const progressPercent = Math.round((currentSectionOrder / SCRIPT_SECTIONS.length) * 100)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isActive = callStatus === 'active'
  const isConnecting = callStatus === 'connecting'
  const isAnalyzing = callStatus === 'analyzing' || callStatus === 'ended'

  // Get last few messages for context
  const recentMessages = transcript.slice(-3)

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#5eead4]/20 to-[#5eead4]/5 flex items-center justify-center">
            <Phone className={`w-7 h-7 ${isActive ? 'text-[#5eead4]' : 'text-gray-400'}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{challenge.persona}</h2>
            <p className="text-sm text-gray-400">{challenge.name}</p>
          </div>
        </div>

        {/* Timer & Status */}
        <div className="flex items-center gap-8">
          {isConnecting && (
            <div className="flex items-center gap-3 text-[#5eead4]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-medium text-lg">Connecting...</span>
            </div>
          )}
          {isActive && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-sm font-semibold uppercase tracking-wide">Live</span>
              </div>
              <div className="text-5xl font-mono font-bold text-white tabular-nums">
                {formatTime(duration)}
              </div>
            </>
          )}
          {isAnalyzing && (
            <div className="flex items-center gap-3 text-[#5eead4]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-medium text-lg">Analyzing your performance...</span>
            </div>
          )}
        </div>

        {/* Close button */}
        {!isActive && !isConnecting && (
          <button
            onClick={onEndCall}
            className="p-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
        {(isActive || isConnecting) && <div className="w-12" />}
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Objectives */}
        <div className="w-80 border-r border-[rgba(255,255,255,0.1)] p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#5eead4]" />
            Objectives
            <span className="text-xs text-[#5eead4] ml-auto bg-[#5eead4]/10 px-2 py-0.5 rounded-full">
              {liveObjectivesCompleted.length}/{challenge.objectives.length}
            </span>
          </h3>
          <ul className="space-y-3 mb-8">
            {challenge.objectives.map((obj, i) => {
              const isCompleted = liveObjectivesCompleted.includes(obj)
              return (
                <li
                  key={i}
                  className={`flex items-start gap-3 transition-all duration-300 ${
                    isCompleted ? 'text-[#5eead4]' : 'text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-[#5eead4]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-xs text-gray-500 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                  )}
                  <span className={`text-sm leading-relaxed ${isCompleted ? 'font-medium' : ''}`}>{obj}</span>
                </li>
              )
            })}
          </ul>

          {/* Bonus Objectives */}
          {challenge.bonusObjectives.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Bonus
              </h3>
              <ul className="space-y-3">
                {challenge.bonusObjectives.map((bonus) => (
                  <li key={bonus.id} className="flex items-start gap-3 text-gray-400">
                    <span className="text-lg flex-shrink-0">{bonus.icon}</span>
                    <div>
                      <span className="text-sm text-white">{bonus.name}</span>
                      <span className="text-xs text-yellow-500 ml-2">+{bonus.xpBonus} XP</span>
                      <p className="text-xs text-gray-500 mt-0.5">{bonus.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Center Column - Script Progress & Key Info */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Script Progress */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#5eead4]" />
              Call Progress
            </h3>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>Section {currentSectionOrder} of {SCRIPT_SECTIONS.length}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#5eead4] to-[#5eead4]/60 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Section Pills */}
            <div className="flex flex-wrap gap-2">
              {SCRIPT_SECTIONS.map((section) => {
                const isPast = section.order < currentSectionOrder
                const isCurrent = section.order === currentSectionOrder
                return (
                  <div
                    key={section.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isCurrent
                        ? 'bg-[#5eead4] text-[#0a0a0f]'
                        : isPast
                        ? 'bg-[#5eead4]/20 text-[#5eead4]'
                        : 'bg-[rgba(255,255,255,0.05)] text-gray-500'
                    }`}
                  >
                    {section.name}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Key Info Captured */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#5eead4]" />
              Key Info Captured
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Pain Points */}
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pain Points</span>
                </div>
                {keyInfo.painPoints.length > 0 ? (
                  <ul className="space-y-2">
                    {keyInfo.painPoints.map((pain, i) => (
                      <li key={i} className="text-sm text-white flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span className="capitalize">{pain}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">Not yet identified</p>
                )}
              </div>

              {/* Budget */}
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Budget</span>
                </div>
                <p className="text-sm text-gray-500 italic">Not discussed</p>
              </div>

              {/* Timeline */}
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Timeline</span>
                </div>
                <p className="text-sm text-gray-500 italic">Not discussed</p>
              </div>

              {/* Decision Makers */}
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Decision Makers</span>
                </div>
                <p className="text-sm text-gray-500 italic">Unknown</p>
              </div>
            </div>
          </div>

          {/* Last Exchange (minimal transcript view) */}
          <div className="flex-1">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 text-sm font-semibold text-white mb-4 hover:text-[#5eead4] transition-colors"
            >
              <User className="w-4 h-4 text-[#5eead4]" />
              Recent Exchange
              {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTranscript && (
              <div className="space-y-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 max-h-64 overflow-y-auto">
                {recentMessages.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-4">Waiting for conversation to start...</p>
                ) : (
                  recentMessages.map((message, i) => (
                    <div
                      key={i}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-[#5eead4]/20 text-[#5eead4]'
                            : 'bg-[rgba(255,255,255,0.05)] text-gray-300'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Notes */}
        <div className="w-96 border-l border-[rgba(255,255,255,0.1)] flex flex-col">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#5eead4]" />
              Your Notes
            </h3>
          </div>
          <div className="flex-1 p-4">
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Take notes during the call...

• Key objections raised
• Pain points mentioned
• Questions to follow up on
• Commitment level"
              className="w-full h-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-[#5eead4]/50 focus:ring-1 focus:ring-[#5eead4]/20"
              disabled={isAnalyzing}
            />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="border-t border-[rgba(255,255,255,0.1)] px-6 py-6">
        <div className="flex items-center justify-center gap-8">
          {isActive && (
            <>
              <button
                onClick={onToggleMute}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>
              <button
                onClick={onEndCall}
                className="w-24 h-24 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="w-10 h-10" />
              </button>
              <button className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.05)] text-white flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)]">
                <Volume2 className="w-7 h-7" />
              </button>
            </>
          )}
          {isConnecting && (
            <button
              onClick={onEndCall}
              className="px-8 py-4 rounded-xl bg-[rgba(255,255,255,0.05)] text-gray-400 hover:bg-[rgba(255,255,255,0.1)] transition-all flex items-center gap-3 text-lg"
            >
              <X className="w-6 h-6" />
              Cancel
            </button>
          )}
          {isAnalyzing && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-[#5eead4]">
                  <CheckCircle className="w-5 h-5" />
                  Call recorded ({formatTime(duration)})
                </div>
                <div className="flex items-center gap-2 text-sm text-[#5eead4]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing transcript...
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating feedback...
                </div>
              </div>
              <p className="text-xs text-gray-500">This usually takes 10-15 seconds</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
