'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  Zap,
  MessageSquare,
  BarChart3,
  Shield,
  Eye,
  EyeOff,
  Download,
  Chrome,
  CheckCircle,
  ArrowRight,
  Play,
  Volume2,
  Target,
  Lightbulb,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

const features = [
  {
    icon: MessageSquare,
    title: 'Real-Time Suggestions',
    description: 'Get coaching tips and discovery questions as you talk - AI analyzes the conversation and suggests your next move.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Objection Handling',
    description: 'AI detects objections instantly and suggests proven responses to keep the deal moving forward.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: BarChart3,
    title: 'Talk Ratio Tracking',
    description: 'Monitor your talk/listen balance in real-time. Great salespeople listen more than they talk.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: EyeOff,
    title: 'Private Overlay',
    description: 'Only you can see the coaching panel - completely invisible to other participants and screen shares.',
    color: 'from-purple-500 to-pink-500',
  },
]

const steps = [
  {
    number: 1,
    title: 'Download Extension',
    description: 'Get the Chrome extension from your Settings page',
  },
  {
    number: 2,
    title: 'Install in Chrome',
    description: 'Load the extension in Chrome Developer Mode',
  },
  {
    number: 3,
    title: 'Join Zoom Web',
    description: 'Open your Zoom meeting in Chrome browser',
  },
  {
    number: 4,
    title: 'Start Coaching',
    description: 'Click Start Coaching and get real-time AI tips',
  },
]

const coachingTips = [
  { icon: Lightbulb, text: 'Ask about their biggest challenge with...' },
  { icon: Target, text: 'Dig deeper: What happens if this problem isn\'t solved?' },
  { icon: TrendingUp, text: 'Good discovery question! Keep exploring the impact.' },
  { icon: MessageSquare, text: 'Objection detected: Try reframing the value...' },
]

export default function CoachingPage() {
  const [activeDemo, setActiveDemo] = useState(0)

  return (
    <DashboardLayout>
      <div className="space-y-12 max-w-6xl">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,255,193,0.1)] via-transparent to-[rgba(139,92,246,0.1)] rounded-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00ffc1]/10 rounded-full blur-3xl" />

          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-6 h-6 text-[#00ffc1]" />
                  <span className="text-sm font-semibold text-[#00ffc1] uppercase tracking-wide">Live Coaching</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  AI in Your Ear.
                  <br />
                  <span className="gradient-text">During Every Call.</span>
                </h1>
                <p className="text-lg text-gray-400 mb-8">
                  Get real-time coaching during your Zoom calls. Our Chrome extension analyzes the conversation
                  and gives you suggestions, objection handlers, and discovery questions - all in a private overlay
                  only you can see.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a href="/downloads/revpilot-extension.zip" download className="btn-primary flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Extension
                  </a>
                  <a href="/settings#coaching" className="btn-secondary flex items-center gap-2">
                    <Chrome className="w-5 h-5" />
                    Installation Guide
                  </a>
                </div>
              </div>

              {/* Demo Preview */}
              <div className="flex-1 w-full max-w-md">
                <div className="glass-card p-4 bg-gradient-to-br from-[rgba(0,0,0,0.6)] to-[rgba(0,0,0,0.3)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-[#00ffc1]" />
                      <span className="text-sm font-semibold text-white">RevPilot Coach</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-400">Live</span>
                    </div>
                  </div>

                  {/* Simulated coaching tips */}
                  <div className="space-y-3 mb-4">
                    {coachingTips.map((tip, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] transition-all duration-500 ${
                          activeDemo === i ? 'border-[#00ffc1] bg-[rgba(0,255,193,0.1)]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <tip.icon className={`w-4 h-4 mt-0.5 ${activeDemo === i ? 'text-[#00ffc1]' : 'text-gray-400'}`} />
                          <span className={`text-sm ${activeDemo === i ? 'text-white' : 'text-gray-400'}`}>
                            {tip.text}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Talk Ratio */}
                  <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Talk Ratio</span>
                      <span>You: 35% | Prospect: 65%</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 rounded-full bg-[#00ffc1]" style={{ width: '35%' }} />
                      <div className="h-2 rounded-full bg-orange-400" style={{ width: '65%' }} />
                    </div>
                    <p className="text-xs text-green-400 mt-2">Great balance! Keep letting them talk.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your Secret Weapon on Every Call</h2>
            <p className="text-gray-400">Powered by AI. Invisible to prospects. Game-changing for your close rate.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="glass-card p-6 group hover:scale-[1.02] transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#00ffc1] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Get Started in Minutes</h2>
            <p className="text-gray-400">Four simple steps to AI-powered sales coaching</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-[#00102e]">{step.number}</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-400">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-6 -right-3 w-6 h-6 text-gray-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Chrome className="w-6 h-6 text-[#00ffc1]" />
              <h3 className="text-lg font-semibold text-white">Requirements</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-[#00ffc1]" />
                Google Chrome browser
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-[#00ffc1]" />
                Zoom Web (not desktop app)
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-[#00ffc1]" />
                Active RevPilot account
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-[#00ffc1]" />
                Microphone access
              </li>
            </ul>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-[#00ffc1]" />
              <h3 className="text-lg font-semibold text-white">Privacy & Security</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-[#00ffc1]" />
                Audio processed in real-time, not stored
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-[#00ffc1]" />
                Overlay invisible to other participants
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-[#00ffc1]" />
                Never visible in screen shares
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-[#00ffc1]" />
                Only activates on zoom.us
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="glass-card p-8 bg-gradient-to-r from-[rgba(0,255,193,0.1)] to-[rgba(139,92,246,0.1)] text-center">
          <Sparkles className="w-12 h-12 text-[#00ffc1] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Close More Deals?</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Join sales pros who are crushing their quotas with AI-powered real-time coaching.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/downloads/revpilot-extension.zip" download className="btn-primary inline-flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download Extension
            </a>
            <a href="/settings#coaching" className="btn-secondary inline-flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              View Installation Guide
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
