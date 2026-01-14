'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, X, MessageSquare, AlertTriangle, CheckCircle, Zap } from 'lucide-react'

export type CoachingTipType = 'tip' | 'question' | 'alert' | 'positive' | 'objection'

export interface CoachingTip {
  id: string
  content: string
  type: CoachingTipType
  timestamp?: Date
}

interface CoachingTipsProps {
  tip: CoachingTip | null
  onDismiss: () => void
  autoDismissMs?: number // Default 5000ms (5 seconds)
  position?: 'top-right' | 'bottom-right' | 'top-center' | 'bottom-center'
}

const TIP_ICONS: Record<CoachingTipType, typeof Lightbulb> = {
  tip: Lightbulb,
  question: MessageSquare,
  alert: AlertTriangle,
  positive: CheckCircle,
  objection: Zap,
}

const TIP_STYLES: Record<CoachingTipType, { bg: string; border: string; icon: string; text: string }> = {
  tip: {
    bg: 'bg-[#5eead4]/10',
    border: 'border-[#5eead4]/30',
    icon: 'text-[#5eead4]',
    text: 'text-[#5eead4]',
  },
  question: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    text: 'text-blue-400',
  },
  alert: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: 'text-orange-400',
    text: 'text-orange-400',
  },
  positive: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    text: 'text-green-400',
  },
  objection: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    text: 'text-red-400',
  },
}

const TIP_LABELS: Record<CoachingTipType, string> = {
  tip: 'Coaching Tip',
  question: 'Try Asking',
  alert: 'Watch Out',
  positive: 'Nice Work!',
  objection: 'Objection Detected',
}

const POSITION_CLASSES: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'bottom-right': 'bottom-24 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-24 left-1/2 -translate-x-1/2',
}

export default function CoachingTips({
  tip,
  onDismiss,
  autoDismissMs = 5000,
  position = 'bottom-right',
}: CoachingTipsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (tip) {
      // Reset states for new tip
      setIsExiting(false)
      setIsVisible(true)

      // Set up auto-dismiss timer
      const dismissTimer = setTimeout(() => {
        handleDismiss()
      }, autoDismissMs)

      return () => {
        clearTimeout(dismissTimer)
      }
    } else {
      setIsVisible(false)
    }
  }, [tip, autoDismissMs])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 300) // Match exit animation duration
  }

  if (!tip || !isVisible) return null

  const style = TIP_STYLES[tip.type]
  const Icon = TIP_ICONS[tip.type]
  const label = TIP_LABELS[tip.type]

  return (
    <div
      className={`fixed ${POSITION_CLASSES[position]} z-50 max-w-sm transition-all duration-300 ${
        isExiting
          ? 'opacity-0 translate-y-2 scale-95'
          : 'opacity-100 translate-y-0 scale-100'
      }`}
      style={{
        animation: !isExiting ? 'slideIn 0.3s ease-out' : undefined,
      }}
    >
      <div
        className={`${style.bg} ${style.border} border rounded-xl p-4 shadow-lg backdrop-blur-sm`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${style.icon}`} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
              {label}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-white text-sm leading-relaxed">{tip.content}</p>

        {/* Progress bar for auto-dismiss */}
        <div className="mt-3 h-1 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
          <div
            className={`h-full ${style.bg.replace('/10', '')} rounded-full`}
            style={{
              animation: `shrink ${autoDismissMs}ms linear forwards`,
            }}
          />
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  )
}

// Helper hook for managing coaching tips with queue
export function useCoachingTips() {
  const [currentTip, setCurrentTip] = useState<CoachingTip | null>(null)
  const [tipQueue, setTipQueue] = useState<CoachingTip[]>([])

  // Process queue when current tip is dismissed
  useEffect(() => {
    if (!currentTip && tipQueue.length > 0) {
      const [nextTip, ...remainingTips] = tipQueue
      setCurrentTip(nextTip)
      setTipQueue(remainingTips)
    }
  }, [currentTip, tipQueue])

  const showTip = (content: string, type: CoachingTipType = 'tip') => {
    const newTip: CoachingTip = {
      id: crypto.randomUUID(),
      content,
      type,
      timestamp: new Date(),
    }

    if (currentTip) {
      // Queue the tip if one is already showing
      setTipQueue(prev => [...prev, newTip])
    } else {
      setCurrentTip(newTip)
    }
  }

  const dismissTip = () => {
    setCurrentTip(null)
  }

  const clearAllTips = () => {
    setCurrentTip(null)
    setTipQueue([])
  }

  return {
    currentTip,
    showTip,
    dismissTip,
    clearAllTips,
    queueLength: tipQueue.length,
  }
}
