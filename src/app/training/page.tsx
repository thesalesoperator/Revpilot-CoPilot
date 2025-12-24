'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
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
  Play,
  ChevronRight,
  Sparkles,
  Lock,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Training sections with more game-like data
const trainingSections = [
  {
    id: 'practice',
    href: '/practice',
    icon: Flame,
    title: 'Practice Arena',
    description: 'AI-powered sales sparring with gamified challenges',
    color: 'from-orange-500 to-red-500',
    bgGlow: 'bg-orange-500/20',
    xpReward: '+150 XP',
    difficulty: 'All Levels',
    completedChallenges: 5,
    totalChallenges: 8,
    featured: true,
  },
  {
    id: 'personas',
    href: '/personas',
    icon: UserCircle,
    title: 'AI Personas',
    description: 'Practice with custom buyer personas',
    color: 'from-purple-500 to-pink-500',
    bgGlow: 'bg-purple-500/20',
    xpReward: '+100 XP',
    difficulty: 'Intermediate',
    completedChallenges: 3,
    totalChallenges: 12,
  },
  {
    id: 'skills',
    href: '/skills',
    icon: TrendingUp,
    title: 'Skill Trees',
    description: 'Level up your sales abilities',
    color: 'from-green-500 to-emerald-500',
    bgGlow: 'bg-green-500/20',
    xpReward: '+200 XP',
    difficulty: 'Progressive',
    completedChallenges: 18,
    totalChallenges: 60,
  },
  {
    id: 'objections',
    href: '/objections',
    icon: Shield,
    title: 'Objection Library',
    description: 'Crowdsourced responses to common objections',
    color: 'from-red-500 to-orange-500',
    bgGlow: 'bg-red-500/20',
    xpReward: '+50 XP',
    difficulty: 'Reference',
    completedChallenges: 0,
    totalChallenges: 0,
    isLibrary: true,
  },
  {
    id: 'mentorship',
    href: '/mentorship',
    icon: GraduationCap,
    title: 'Mentorship',
    description: 'Connect with top performers',
    color: 'from-blue-500 to-cyan-500',
    bgGlow: 'bg-blue-500/20',
    xpReward: '+300 XP',
    difficulty: 'Expert',
    completedChallenges: 2,
    totalChallenges: 5,
    premium: true,
  },
]

// Daily challenges
const dailyChallenges = [
  { id: 1, title: 'Complete 3 practice calls', xp: 150, progress: 1, total: 3, icon: Phone },
  { id: 2, title: 'Handle 5 objections', xp: 100, progress: 3, total: 5, icon: Shield },
  { id: 3, title: 'Win a battle', xp: 200, progress: 0, total: 1, icon: Trophy },
]

// Import Phone for daily challenges
import { Phone } from 'lucide-react'

export default function TrainingPage() {
  const { user } = useAuth()

  // User progress with more game elements
  const userProgress = {
    totalXP: 3250,
    level: 12,
    skillsUnlocked: 18,
    practiceHours: 12.5,
    currentStreak: 5,
    longestStreak: 14,
    rank: 'Gold III',
    nextRank: 'Platinum I',
    xpToNextRank: 1750,
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header with animated gradient */}
        <div className="relative mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-cyan-500/10 rounded-2xl" />
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">Training Center</h1>
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold">
                    {userProgress.rank}
                  </div>
                </div>
                <p className="text-gray-400">Master your sales skills and level up</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-1 justify-center">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="text-2xl font-bold text-orange-400">{userProgress.currentStreak}</span>
                  </div>
                  <p className="text-xs text-gray-500">Day Streak</p>
                </div>
                <div className="text-center px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-1 justify-center">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span className="text-2xl font-bold text-yellow-400">{userProgress.totalXP.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500">Total XP</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Challenges Banner */}
        <div className="glass-card p-4 mb-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Daily Challenges</h3>
              <span className="text-xs text-gray-400">Resets in 14h 23m</span>
            </div>
            <div className="flex items-center gap-1 text-yellow-400">
              <Zap className="w-4 h-4" />
              <span className="font-bold">+450 XP</span>
              <span className="text-gray-400 text-sm">available</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {dailyChallenges.map((challenge) => {
              const isComplete = challenge.progress >= challenge.total
              return (
                <div
                  key={challenge.id}
                  className={`p-3 rounded-xl ${
                    isComplete
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-[rgba(0,0,0,0.2)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <challenge.icon className={`w-4 h-4 ${isComplete ? 'text-green-400' : 'text-gray-400'}`} />
                    <span className={`text-xs font-bold ${isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                      {isComplete ? 'COMPLETE' : `+${challenge.xp} XP`}
                    </span>
                  </div>
                  <p className={`text-sm ${isComplete ? 'text-green-300' : 'text-white'}`}>{challenge.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full">
                      <div
                        className={`h-full rounded-full ${
                          isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}
                        style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {challenge.progress}/{challenge.total}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Featured Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Featured</h2>
          </div>
          <Link
            href="/practice"
            className="block glass-card p-6 group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 animate-pulse" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />

            <div className="relative flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Flame className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-white group-hover:text-[#00ffc1] transition-colors">
                    Practice Arena
                  </h3>
                  <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold animate-pulse">
                    HOT
                  </span>
                </div>
                <p className="text-gray-400 mb-3">Jump into AI-powered sales sparring with gamified challenges</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold">+150 XP</span>
                  </div>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">8 Challenges</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">4 Difficulty Levels</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <p className="text-sm text-gray-400">Progress</p>
                  <p className="text-2xl font-bold text-white">5/8</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-[#00102e] ml-1" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Training Modules Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Training Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainingSections.filter(s => !s.featured).map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className="glass-card p-5 group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
              >
                {/* Background glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${section.bgGlow} rounded-full blur-2xl opacity-50`} />

                <div className="relative flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <section.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white group-hover:text-[#00ffc1] transition-colors">
                        {section.title}
                      </h3>
                      {section.premium && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{section.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-yellow-400 font-semibold">{section.xpReward}</span>
                        <span className="text-xs text-gray-500">{section.difficulty}</span>
                      </div>
                      {!section.isLibrary && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${section.color}`}
                              style={{
                                width: `${(section.completedChallenges / section.totalChallenges) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">
                            {section.completedChallenges}/{section.totalChallenges}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#00ffc1] group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Rank Progress */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <div>
                <h3 className="font-semibold text-white">Rank Progress</h3>
                <p className="text-sm text-gray-400">
                  {userProgress.xpToNextRank.toLocaleString()} XP to {userProgress.nextRank}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-sm font-bold">
                {userProgress.rank}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500" />
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold opacity-50">
                {userProgress.nextRank}
              </div>
            </div>
          </div>
          <div className="w-full h-3 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 via-amber-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: '65%' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-gray-400">3,250 XP</span>
            <span className="text-gray-400">5,000 XP</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
