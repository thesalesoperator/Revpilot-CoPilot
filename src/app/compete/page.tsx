'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import {
  Swords,
  Map,
  Trophy,
  ArrowRight,
  Flame,
  Crown,
  Medal,
  Target,
  Users,
  Zap,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Competition sections
const competeSections = [
  {
    id: 'battle',
    href: '/battle',
    icon: Swords,
    title: 'Battle Mode',
    description: '1v1 competitions against other sales reps',
    color: 'from-red-500 to-orange-500',
    stats: [
      { label: 'Online Now', value: '24' },
      { label: 'Battle Modes', value: '4' },
    ],
    features: ['Quick Duel', 'Objection Showdown', 'Discovery Race', 'Championship'],
  },
  {
    id: 'territory',
    href: '/territory-wars',
    icon: Map,
    title: 'Territory Wars',
    description: 'Team vs team weekly competitions',
    color: 'from-blue-500 to-purple-500',
    stats: [
      { label: 'Active Teams', value: '8' },
      { label: 'Prize Pool', value: '50K XP' },
    ],
    features: ['Team battles', 'Territory control', 'Weekly challenges', 'Season rewards'],
  },
  {
    id: 'achievements',
    href: '/achievements',
    icon: Trophy,
    title: 'Achievements',
    description: 'Unlock badges and track your progress',
    color: 'from-yellow-500 to-amber-500',
    stats: [
      { label: 'Total Badges', value: '28' },
      { label: 'Categories', value: '6' },
    ],
    features: ['Rarity levels', 'XP rewards', 'Progress tracking', 'Legendary badges'],
  },
]

// Leaderboard preview
const leaderboard = [
  { rank: 1, name: 'QuotaCrusher', xp: 15000, wins: 89, avatar: 'Q' },
  { rank: 2, name: 'CloserKing', xp: 12500, wins: 67, avatar: 'C' },
  { rank: 3, name: 'SalesNinja', xp: 9800, wins: 45, avatar: 'S' },
  { rank: 4, name: 'PitchPerfect', xp: 7200, wins: 34, avatar: 'P' },
  { rank: 5, name: 'DealHunter', xp: 5100, wins: 23, avatar: 'D' },
]

export default function CompetePage() {
  const { user } = useAuth()

  // User competitive stats
  const userStats = {
    rank: 6,
    wins: 28,
    losses: 14,
    winRate: 67,
    currentStreak: 3,
    totalXP: 6200,
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Compete</h1>
          <p className="text-gray-400">Challenge others and prove your sales skills</p>
        </div>

        {/* Your Stats */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-2xl font-bold text-[#00102e]">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {user?.user_metadata?.full_name || 'You'}
                </h3>
                <p className="text-gray-400">Rank #{userStats.rank} • Platinum</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{userStats.wins}</p>
                <p className="text-xs text-gray-400">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{userStats.losses}</p>
                <p className="text-xs text-gray-400">Losses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00ffc1]">{userStats.winRate}%</p>
                <p className="text-xs text-gray-400">Win Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400 flex items-center gap-1">
                  {userStats.currentStreak} <Flame className="w-5 h-5" />
                </p>
                <p className="text-xs text-gray-400">Streak</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{userStats.totalXP.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total XP</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Competition Sections */}
          <div className="lg:col-span-2 space-y-6">
            {competeSections.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className="glass-card p-6 block group hover:scale-[1.01] transition-all duration-300"
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
                    <div className="flex items-center gap-6 mb-4">
                      {section.stats.map((stat) => (
                        <div key={stat.label}>
                          <p className="text-lg font-bold text-white">{stat.value}</p>
                          <p className="text-xs text-gray-500">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2">
                      {section.features.map((feature) => (
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

          {/* Leaderboard Sidebar */}
          <div className="space-y-6">
            {/* Season Info */}
            <div className="glass-card p-4 bg-gradient-to-r from-[rgba(0,255,193,0.1)] to-[rgba(0,217,166,0.05)]">
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-6 h-6 text-yellow-400" />
                <div>
                  <p className="font-semibold text-white">Season 3: Winter</p>
                  <p className="text-xs text-gray-400">12 days remaining</p>
                </div>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2">
                <div className="bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] h-2 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>

            {/* Leaderboard */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Leaderboard</h3>
                <Link href="/battle" className="text-sm text-[#00ffc1] hover:underline">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {leaderboard.map((player) => (
                  <div key={player.rank} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        player.rank === 1
                          ? 'bg-yellow-500 text-black'
                          : player.rank === 2
                            ? 'bg-gray-400 text-black'
                            : player.rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-[rgba(255,255,255,0.1)] text-gray-400'
                      }`}
                    >
                      {player.rank}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                      {player.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{player.name}</p>
                      <p className="text-xs text-gray-500">{player.wins} wins</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-yellow-400">{player.xp.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Battle */}
            <Link
              href="/battle"
              className="glass-card p-4 block bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30 hover:border-red-500/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Swords className="w-8 h-8 text-red-400" />
                <div>
                  <p className="font-semibold text-white">Quick Battle</p>
                  <p className="text-sm text-gray-400">Find an opponent now</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
