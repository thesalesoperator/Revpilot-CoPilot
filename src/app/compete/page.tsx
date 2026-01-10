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
  Play,
  ChevronRight,
  Sparkles,
  Shield,
  Star,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Competition sections - monochromatic design
const competeSections = [
  {
    id: 'battle',
    href: '/battle',
    icon: Swords,
    title: 'Battle Mode',
    description: '1v1 competitions against other sales reps',
    onlineNow: 24,
    featured: true,
  },
  {
    id: 'territory',
    href: '/territory-wars',
    icon: Map,
    title: 'Territory Wars',
    description: 'Team vs team weekly competitions',
    teamsActive: 8,
  },
  {
    id: 'achievements',
    href: '/achievements',
    icon: Trophy,
    title: 'Achievements',
    description: 'Unlock badges and track milestones',
    unlocked: 18,
    total: 28,
  },
]

// Live matches happening now
const liveMatches = [
  { player1: 'SalesNinja', player2: 'CloserKing', mode: 'Quick Duel', time: '2:34' },
  { player1: 'QuotaCrusher', player2: 'DealHunter', mode: 'Championship', time: '8:12' },
]

// Leaderboard
const leaderboard = [
  { rank: 1, name: 'QuotaCrusher', xp: 15000, wins: 89, avatar: 'Q', tier: 'Grandmaster' },
  { rank: 2, name: 'CloserKing', xp: 12500, wins: 67, avatar: 'C', tier: 'Master' },
  { rank: 3, name: 'SalesNinja', xp: 9800, wins: 45, avatar: 'S', tier: 'Diamond' },
  { rank: 4, name: 'PitchPerfect', xp: 7200, wins: 34, avatar: 'P', tier: 'Platinum' },
  { rank: 5, name: 'DealHunter', xp: 5100, wins: 23, avatar: 'D', tier: 'Gold' },
]

// Monochromatic tier colors - teal shades only
const tierColors: Record<string, string> = {
  Grandmaster: 'text-[#5eead4]',
  Master: 'text-[#5eead4]',
  Diamond: 'text-[#5eead4]/80',
  Platinum: 'text-gray-300',
  Gold: 'text-gray-400',
}

export default function CompetePage() {
  const { user } = useAuth()

  // User competitive stats
  const userStats = {
    rank: 6,
    wins: 28,
    losses: 14,
    winRate: 67,
    currentStreak: 5,
    bestStreak: 12,
    totalXP: 6200,
    tier: 'Platinum',
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(94,234,212,0.1)] via-transparent to-[rgba(94,234,212,0.1)]" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">Arena</h1>
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[rgba(94,234,212,0.15)] border border-[rgba(94,234,212,0.3)]">
                    <div className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse" />
                    <span className="text-sm text-[#5eead4]">24 Online</span>
                  </div>
                </div>
                <p className="text-gray-400">Challenge others and prove your sales skills</p>
              </div>
              <Link
                href="/battle"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5eead4] text-[#0a0a0f] font-bold hover:bg-[#4fd1c5] hover:scale-105 transition-all"
              >
                <Swords className="w-5 h-5" />
                Quick Battle
              </Link>
            </div>
          </div>
        </div>

        {/* Your Battle Card */}
        <div className="glass-card p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[rgba(94,234,212,0.05)] to-transparent rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center text-3xl font-bold text-[#0a0a0f]">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[#5eead4] text-[#0a0a0f] text-xs font-bold">
                  #{userStats.rank}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {user?.user_metadata?.full_name || 'You'}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${tierColors[userStats.tier]}`}>
                    {userStats.tier}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{userStats.totalXP.toLocaleString()} XP</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#5eead4]">{userStats.wins}</p>
                <p className="text-xs text-gray-400">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-400">{userStats.losses}</p>
                <p className="text-xs text-gray-400">Losses</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#5eead4]">{userStats.winRate}%</p>
                <p className="text-xs text-gray-400">Win Rate</p>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-[rgba(94,234,212,0.1)] border border-[rgba(94,234,212,0.3)]">
                <div className="flex items-center gap-1 justify-center">
                  <Flame className="w-6 h-6 text-[#5eead4]" />
                  <p className="text-3xl font-bold text-[#5eead4]">{userStats.currentStreak}</p>
                </div>
                <p className="text-xs text-[#5eead4]">Win Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse" />
              <h2 className="text-lg font-semibold text-white">Live Battles</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {liveMatches.map((match, index) => (
                <div
                  key={index}
                  className="glass-card p-4 border-[rgba(94,234,212,0.2)] bg-gradient-to-r from-[rgba(94,234,212,0.05)] to-transparent"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[rgba(94,234,212,0.2)] flex items-center justify-center text-[#5eead4] font-bold">
                        {match.player1[0]}
                      </div>
                      <span className="font-semibold text-white">{match.player1}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl font-bold text-[#5eead4]">VS</span>
                      <p className="text-xs text-gray-400">{match.time}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white">{match.player2}</span>
                      <div className="w-10 h-10 rounded-full bg-[rgba(94,234,212,0.2)] flex items-center justify-center text-[#5eead4] font-bold">
                        {match.player2[0]}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="text-xs text-gray-400">{match.mode}</span>
                    <button className="text-xs text-[#5eead4] hover:underline">Watch</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Competition Modes */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-white">Competition Modes</h2>

            {/* Featured Battle Mode */}
            <Link
              href="/battle"
              className="block glass-card p-6 group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[rgba(94,234,212,0.05)] to-transparent" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-[rgba(94,234,212,0.1)] rounded-full blur-3xl" />

              <div className="relative flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#5eead4] flex items-center justify-center">
                  <Swords className="w-8 h-8 text-[#0a0a0f]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#5eead4] transition-colors">
                      Battle Mode
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[rgba(94,234,212,0.15)] text-[#5eead4] text-xs">
                      24 online
                    </span>
                  </div>
                  <p className="text-gray-400 mb-3">1v1 competitions with matchmaking and XP rewards</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">Quick Duel</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">Objection Showdown</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">Championship</span>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-[#5eead4] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-[#0a0a0f] ml-1" />
                </div>
              </div>
            </Link>

            {/* Other modes */}
            {competeSections.filter(s => !s.featured).map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className="block glass-card p-5 group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(94,234,212,0.05)] rounded-full blur-2xl opacity-50" />

                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(94,234,212,0.15)] border border-[rgba(94,234,212,0.3)] flex items-center justify-center">
                    <section.icon className="w-6 h-6 text-[#5eead4]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-[#5eead4] transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-400">{section.description}</p>
                  </div>
                  {section.teamsActive && (
                    <span className="text-sm text-[#5eead4]">{section.teamsActive} teams</span>
                  )}
                  {section.unlocked !== undefined && (
                    <span className="text-sm text-[#5eead4]">{section.unlocked}/{section.total}</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#5eead4] group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>

          {/* Leaderboard Sidebar */}
          <div className="space-y-6">
            {/* Season Banner */}
            <div className="glass-card p-4 bg-gradient-to-r from-[rgba(94,234,212,0.1)] to-transparent border-[rgba(94,234,212,0.3)]">
              <div className="flex items-center gap-3 mb-3">
                <Crown className="w-8 h-8 text-[#5eead4]" />
                <div>
                  <p className="font-bold text-white">Season 3</p>
                  <p className="text-xs text-gray-400">Winter Conquest</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">12 days remaining</span>
                <span className="text-sm font-bold text-[#5eead4]">50K XP Prize</span>
              </div>
              <div className="w-full h-2 bg-[rgba(0,0,0,0.3)] rounded-full">
                <div className="h-full w-3/5 bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] rounded-full" />
              </div>
            </div>

            {/* Leaderboard */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Top Players</h3>
                <Link href="/battle" className="text-sm text-[#5eead4] hover:underline">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {leaderboard.map((player) => (
                  <div key={player.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        player.rank === 1
                          ? 'bg-[#5eead4] text-[#0a0a0f]'
                          : player.rank === 2
                            ? 'bg-gray-400 text-[#0a0a0f]'
                            : player.rank === 3
                              ? 'bg-gray-500 text-white'
                              : 'bg-[rgba(255,255,255,0.1)] text-gray-400'
                      }`}
                    >
                      {player.rank}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[rgba(94,234,212,0.2)] flex items-center justify-center text-[#5eead4] text-sm font-semibold">
                      {player.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{player.name}</p>
                      <p className={`text-xs ${tierColors[player.tier]}`}>{player.tier}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#5eead4]">{player.xp.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{player.wins}W</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
