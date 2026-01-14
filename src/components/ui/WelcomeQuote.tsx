'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Quote } from 'lucide-react'
import { getRandomQuote } from '@/data/salesQuotes'

interface WelcomeQuoteProps {
  userName?: string
}

export default function WelcomeQuote({ userName }: WelcomeQuoteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [quote, setQuote] = useState<{ quote: string; author: string } | null>(null)

  useEffect(() => {
    // Check if we've shown the quote this session
    const hasSeenQuote = sessionStorage.getItem('hasSeenWelcomeQuote')

    if (!hasSeenQuote) {
      // Get a random quote and show the modal
      setQuote(getRandomQuote())
      setIsOpen(true)
      // Mark as seen for this session
      sessionStorage.setItem('hasSeenWelcomeQuote', 'true')
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
  }

  if (!isOpen || !quote) return null

  const firstName = userName?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-in fade-in zoom-in duration-300">
        <div className="glass-card p-8 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5eead4] via-[#5eead4] to-[#5eead4]" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#5eead4]/20 to-[#5eead4]/20 mb-6">
              <Sparkles className="w-8 h-8 text-[#5eead4]" />
            </div>

            {/* Greeting */}
            <h2 className="text-2xl font-bold text-white mb-2">
              {greeting}, {firstName}!
            </h2>
            <p className="text-gray-400 mb-6">Here&apos;s your daily inspiration</p>

            {/* Quote */}
            <div className="relative py-6 px-4">
              <Quote className="absolute top-0 left-0 w-8 h-8 text-[#5eead4]/20 transform -scale-x-100" />
              <p className="text-lg text-white leading-relaxed italic">
                {quote.quote}
              </p>
              <Quote className="absolute bottom-0 right-0 w-8 h-8 text-[#5eead4]/20" />
            </div>

            {/* Author */}
            <p className="text-[#5eead4] font-medium mt-4">
              — {quote.author}
            </p>

            {/* CTA Button */}
            <button
              onClick={handleClose}
              className="btn-primary mt-8 px-8"
            >
              Let&apos;s Crush It!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
