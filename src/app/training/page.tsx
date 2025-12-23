'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Flame,
  UserCircle,
  TrendingUp,
  Shield,
  GraduationCap,
  ArrowRight,
  Star,
  Clock,
  Zap,
  Trophy,
  Target,
  Users,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Training sections
const trainingSections = [
  {
    id: 'practice',
    href: '/practice',
    icon: Flame,
    title: 'Practice Arena',
    description: 'AI-powered sales sparring with gamified challenges',
    color: 'from-orange-500 to-red-500',
    stats: [
      { label: 'Challenges', value: '8' },
      { label: 'XP Available', value: '2,500' },
    ],
    features: ['Voice AI calls', 'Bonus objectives', 'Difficulty levels', 'Real-time feedback'],
  },
  {
    id: 'personas',
    href: '/personas',
    icon: UserCircle,
    title: 'AI Personas',
    description: 'Practice with custom buyer personas',
    color: 'from-purple-500 to-pink-500',
    stats: [
      { label: 'Personas', value: '12' },
      { label: 'Difficulty Levels', value: '4' },
    ],
    features: ['Custom creation', 'Personality traits', 'Common objections', 'Community sharing'],
  },
  {
    id: 'skills',
    href: '/skills',
    icon: TrendingUp,
    title: 'Skill Trees',
    description: 'Level up your sales abilities',
    color: 'from-green-500 to-emerald-500',
    stats: [
      { label: 'Skill Paths', value: '6' },
      { label: 'Total Levels', value: '60' },
    ],
    features: ['Discovery', 'Objection handling', 'Closing', 'Presentation', 'Relationship', 'Prospecting'],
  },
  {
    id: 'objections',
    href: '/objections',
    icon: Shield,
    title: 'Objection Library',
    description: 'Crowdsourced responses to common objections',
    color: 'from-red-500 to-orange-500',
    stats: [
      { label: 'Objections', value: '156' },
      { label: 'Responses', value: '500+' },
    ],
    features: ['Community voting', 'Copy responses', 'Practice mode', 'Categories'],
  },
  {
    id: 'mentorship',
    href: '/mentorship',
    icon: GraduationCap,
    title: 'Mentorship',
    description: 'Connect with top performers',
    color: 'from-blue-500 to-cyan-500',
    stats: [
      { label: 'Mentors', value: '24' },
      { label: 'Programs', value: '8' },
    ],
    features: ['1-on-1 sessions', 'Group programs', 'Expert coaches', 'Skill-specific training'],
  },
]

export default function TrainingPage() {
  const { user } = useAuth()

  // Quick stats
  const userProgress = {
    totalXP: 3250,
    level: 7,
    skillsUnlocked: 18,
    practiceHours: 12.5,
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Training Center</h1>
          <p className="text-gray-400">Level up your sales skills with AI-powered practice</p>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{userProgress.totalXP.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total XP</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Level {userProgress.level}</p>
                <p className="text-xs text-gray-400">Current Level</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{userProgress.skillsUnlocked}</p>
                <p className="text-xs text-gray-400">Skills Unlocked</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{userProgress.practiceHours}h</p>
                <p className="text-xs text-gray-400">Practice Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Training Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {trainingSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="glass-card p-6 group hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center flex-shrink-0`}
                >
                  <section.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-white group-hover:text-[#00ffc1] transition-colors">
                      {section.title}
                    </h3>
                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-[#00ffc1] group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-gray-400 mb-4">{section.description}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    {section.stats.map((stat) => (
                      <div key={stat.label} className="text-center">
                        <p className="text-lg font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {section.features.slice(0, 4).map((feature) => (
                      <span
                        key={feature}
                        className="px-2 py-1 rounded-full text-xs bg-[rgba(255,255,255,0.05)] text-gray-400"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Start</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/practice"
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 hover:border-orange-500/50 transition-colors"
            >
              <Flame className="w-6 h-6 text-orange-400" />
              <div>
                <p className="font-medium text-white">Start Practice Session</p>
                <p className="text-xs text-gray-400">Jump into a quick challenge</p>
              </div>
            </Link>
            <Link
              href="/skills"
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-500/50 transition-colors"
            >
              <TrendingUp className="w-6 h-6 text-green-400" />
              <div>
                <p className="font-medium text-white">Continue Skill Tree</p>
                <p className="text-xs text-gray-400">Level up your next skill</p>
              </div>
            </Link>
            <Link
              href="/mentorship"
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 hover:border-blue-500/50 transition-colors"
            >
              <GraduationCap className="w-6 h-6 text-blue-400" />
              <div>
                <p className="font-medium text-white">Find a Mentor</p>
                <p className="text-xs text-gray-400">Book a coaching session</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
