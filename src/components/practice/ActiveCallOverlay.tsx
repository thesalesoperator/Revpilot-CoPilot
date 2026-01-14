'use client'

import { useEffect, useRef } from 'react'
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
  MessageSquare,
  X,
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
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcript])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isActive = callStatus === 'active'
  const isConnecting = callStatus === 'connecting'
  const isAnalyzing = callStatus === 'analyzing' || callStatus === 'ended'

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5eead4]/20 to-[#5eead4]/5 flex items-center justify-center">
            <Phone className={`w-6 h-6 ${isActive ? 'text-[#5eead4]' : 'text-gray-400'}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{challenge.persona}</h2>
            <p className="text-sm text-gray-400">{challenge.name}</p>
          </div>
        </div>

        {/* Timer & Status */}
        <div className="flex items-center gap-6">
          {isConnecting && (
            <div className="flex items-center gap-2 text-[#5eead4]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Connecting...</span>
            </div>
          )}
          {isActive && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse" />
                <span className="text-gray-400 text-sm font-medium">LIVE</span>
              </div>
              <div className="text-4xl font-mono font-bold text-white">
                {formatTime(duration)}
              </div>
            </>
          )}
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-[#5eead4]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Analyzing call...</span>
            </div>
          )}
        </div>

        {/* Close button (only when not in active call) */}
        {!isActive && !isConnecting && (
          <button
            onClick={onEndCall}
            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
        {(isActive || isConnecting) && <div className="w-10" />}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Objectives */}
        <div className="w-80 border-r border-[rgba(255,255,255,0.1)] p-6 overflow-y-auto">
          {/* Objectives */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#5eead4]" />
              Objectives
              {liveObjectivesCompleted.length > 0 && (
                <span className="text-xs text-[#5eead4] ml-auto bg-[#5eead4]/10 px-2 py-0.5 rounded-full">
                  {liveObjectivesCompleted.length}/{challenge.objectives.length}
                </span>
              )}
            </h3>
            <ul className="space-y-3">
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
                    <span className={`text-sm ${isCompleted ? 'font-medium' : ''}`}>{obj}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Bonus Objectives */}
          {challenge.bonusObjectives.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#5eead4]" />
                Bonus
              </h3>
              <ul className="space-y-3">
                {challenge.bonusObjectives.map((bonus) => (
                  <li key={bonus.id} className="flex items-start gap-3 text-gray-400">
                    <span className="text-lg flex-shrink-0">{bonus.icon}</span>
                    <div>
                      <span className="text-sm text-white">{bonus.name}</span>
                      <span className="text-xs text-[#5eead4] ml-2">+{bonus.xpBonus} XP</span>
                      <p className="text-xs text-gray-500 mt-0.5">{bonus.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Center - Transcript */}
        <div className="flex-1 flex flex-col border-r border-[rgba(255,255,255,0.1)]">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#5eead4]" />
              Live Transcript
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isConnecting && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-full bg-[rgba(94,234,212,0.1)] flex items-center justify-center mb-4 animate-pulse">
                  <Phone className="w-10 h-10 text-[#5eead4]" />
                </div>
                <p className="text-white font-medium text-lg">Connecting to {challenge.persona}...</p>
                <p className="text-gray-400 text-sm mt-2">Preparing your AI prospect</p>
              </div>
            )}
            {!isConnecting && transcript.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p>Waiting for conversation to start...</p>
              </div>
            )}
            {transcript.map((message, i) => (
              <div
                key={i}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#5eead4] text-[#0a0a0f]'
                      : 'bg-[rgba(255,255,255,0.05)] text-white'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Right Panel - Notes */}
        <div className="w-96 flex flex-col">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#5eead4]" />
              Call Notes
            </h3>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Take notes during the call...

• Key objections raised
• Pain points mentioned
• Next steps discussed
• Questions to follow up on"
              className="w-full h-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-[#5eead4]/50 focus:ring-1 focus:ring-[#5eead4]/20"
            />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="border-t border-[rgba(255,255,255,0.1)] px-6 py-4">
        <div className="flex items-center justify-center gap-6">
          {isActive && (
            <>
              <button
                onClick={onToggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted
                    ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    : 'bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={onEndCall}
                className="w-20 h-20 rounded-full bg-gray-500 text-white flex items-center justify-center hover:bg-gray-600 transition-all shadow-lg shadow-gray-500/20"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              <button className="w-14 h-14 rounded-full bg-[rgba(255,255,255,0.05)] text-white flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)]">
                <Volume2 className="w-6 h-6" />
              </button>
            </>
          )}
          {isConnecting && (
            <button
              onClick={onEndCall}
              className="px-6 py-3 rounded-xl bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-all flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          )}
          {isAnalyzing && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                  Call recorded ({formatTime(duration)})
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 text-[#5eead4] animate-spin" />
                  Processing transcript...
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating feedback...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
