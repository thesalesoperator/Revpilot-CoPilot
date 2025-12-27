'use client'

import { useState, useEffect } from 'react'
import { X, Trophy } from 'lucide-react'

interface CelebrationProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  icon?: string
  badgeName?: string
}

// Confetti particle component
const ConfettiParticle = ({ delay, left }: { delay: number; left: number }) => {
  const colors = ['#5eead4', '#ff9855', '#ff6b8a', '#a78bfa', '#60a5fa', '#fbbf24']
  const color = colors[Math.floor(Math.random() * colors.length)]
  const size = Math.random() * 10 + 5
  const duration = Math.random() * 2 + 2

  return (
    <div
      className="absolute animate-confetti"
      style={{
        left: `${left}%`,
        top: '-20px',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  )
}

export default function Celebration({
  isOpen,
  onClose,
  title,
  message,
  icon = '🎉',
  badgeName,
}: CelebrationProps) {
  const [particles, setParticles] = useState<{ delay: number; left: number }[]>([])

  useEffect(() => {
    if (isOpen) {
      // Generate confetti particles
      const newParticles = Array.from({ length: 50 }, () => ({
        delay: Math.random() * 0.5,
        left: Math.random() * 100,
      }))
      setParticles(newParticles)

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        onClose()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      {/* Confetti container */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle, i) => (
          <ConfettiParticle key={i} delay={particle.delay} left={particle.left} />
        ))}
      </div>

      {/* Modal */}
      <div className="pointer-events-auto relative w-full max-w-md animate-celebration-bounce">
        <div className="glass-card p-8 relative overflow-hidden text-center">
          {/* Gradient border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5eead4] via-[#ff9855] to-[#ff6b8a]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Big emoji with pulse */}
          <div className="text-7xl mb-6 animate-pulse">{icon}</div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>

          {/* Message */}
          <p className="text-lg text-gray-300 mb-4">{message}</p>

          {/* Badge earned */}
          {badgeName && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#5eead4]/20 to-[#ff9855]/20 border border-[#5eead4]/30">
              <Trophy className="w-5 h-5 text-[#5eead4]" />
              <span className="text-[#5eead4] font-medium">Badge Earned: {badgeName}</span>
            </div>
          )}

          {/* Close CTA */}
          <button
            onClick={onClose}
            className="btn-primary mt-6 px-8"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for managing celebrations
export function useCelebration() {
  const [celebration, setCelebration] = useState<{
    isOpen: boolean
    title: string
    message: string
    icon?: string
    badgeName?: string
  }>({
    isOpen: false,
    title: '',
    message: '',
  })

  const showCelebration = (
    title: string,
    message: string,
    icon?: string,
    badgeName?: string
  ) => {
    setCelebration({
      isOpen: true,
      title,
      message,
      icon,
      badgeName,
    })
  }

  const hideCelebration = () => {
    setCelebration((prev) => ({ ...prev, isOpen: false }))
  }

  return {
    celebration,
    showCelebration,
    hideCelebration,
  }
}
