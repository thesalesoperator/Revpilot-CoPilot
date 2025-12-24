'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import {
  Swords,
  Map,
  Trophy,
  ArrowRight,
  Crown,
  Target,
  Users,
  Play,
  ChevronRight,
  TrendingUp,
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
    description: 'Head-to-head competitions against other sales professionals',
    onlineNow: 24,
    featured: true,
  },
  {
    id: 'territory',
    href: '/territory-wars',
    icon: Map,
    title: 'Territory Wars',
    description: 'Team competitions with weekly rankings',
    teamsActive: 8,
  },
  {
    id: 'achievements',
    href: '/achievements',
    icon: Trophy,
    title: 'Achievements',
    description: 'Track your milestones and accomplishments',
    unlocked: 18,
    total: 28,
  },
]

// Live matches happening now
const liveMatches = [
  { player1: 'Sarah M.', player2: 'James K.', mode: 'Quick Match', time: '2:34' },
  { player1: 'Alex T.', player2: 'Maria L.', mode: 'Championship', time: '8:12' },
]

// Leaderboard
const leaderboard = [
  { rank: 1, name: 'Alex Thompson', points: 15000, wins: 89, avatar: 'AT' },
  { rank: 2, name: 'Sarah Miller', points: 12500, wins: 67, avatar: 'SM' },
  { rank: 3, name: 'James Kim', points: 9800, wins: 45, avatar: 'JK' },
  { rank: 4, name: 'Maria Lopez', points: 7200, wins: 34, avatar: 'ML' },
  { rank: 5, name: 'David Chen', points: 5100, wins: 23, avatar: 'DC' },
]

export default function CompetePage() {
  const { user } = useAuth()

  // User competitive stats
  const userStats = {
    rank: 6,
    wins: 28,
    losses: 14,
    winRate: 67,
    points: 6200,
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Arena</h1>
              <p className="text-[var(--text-secondary)]">Compete and benchmark your skills</p>
            </div>
            <Link
              href="/battle"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--bg-base)] font-medium hover:bg-[var(--accent-light)] transition-colors"
            >
              <Swords className="w-4 h-4" />
              Quick Match
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)] mb-1">Your Rank</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">#{userStats.rank}</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)] mb-1">Win Rate</p>
            <p className="text-2xl font-semibold text-[var(--success)]">{userStats.winRate}%</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)] mb-1">Total Wins</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{userStats.wins}</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)] mb-1">Points</p>
            <p className="text-2xl font-semibold text-[var(--accent)]">{userStats.points.toLocaleString()}</p>
          </div>
        </div>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              <h2 className="text-sm font-medium text-[var(--text-secondary)]">Live Matches</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {liveMatches.map((match, index) => (
                <div
                  key={index}
                  className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] text-sm font-medium">
                        {match.player1.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">{match.player1}</span>
                    </div>
                    <div className="text-center px-4">
                      <span className="text-sm font-medium text-[var(--text-muted)]">vs</span>
                      <p className="text-xs text-[var(--text-muted)]">{match.time}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-[var(--text-primary)]">{match.player2}</span>
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] text-sm font-medium">
                        {match.player2.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--text-muted)]">{match.mode}</span>
                    <button className="text-xs text-[var(--accent)] hover:underline">Spectate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Competition Modes */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Competition Modes</h2>

            {/* Featured Battle Mode */}
            <Link
              href="/battle"
              className="block bg-[var(--bg-surface)] rounded-xl p-6 border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-colors group"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center">
                  <Swords className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      Battle Mode
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--success-muted)] text-[var(--success)] text-xs font-medium">
                      24 online
                    </span>
                  </div>
                  <p className="text-[var(--text-secondary)] mb-2">Head-to-head competitions with real-time scoring</p>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <span>Quick Match</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                    <span>Ranked</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                    <span>Championship</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Play className="w-5 h-5 text-[var(--bg-base)] ml-0.5" />
                </div>
              </div>
            </Link>

            {/* Other modes */}
            {competeSections.filter(s => !s.featured).map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className="block bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-[var(--text-secondary)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">{section.description}</p>
                  </div>
                  {section.teamsActive && (
                    <span className="text-sm text-[var(--text-secondary)]">{section.teamsActive} teams</span>
                  )}
                  {section.unlocked !== undefined && (
                    <span className="text-sm text-[var(--text-secondary)]">{section.unlocked}/{section.total}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Season Info */}
            <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-5 h-5 text-[var(--accent)]" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Season 3</p>
                  <p className="text-xs text-[var(--text-muted)]">12 days remaining</p>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-muted)]">Your progress</span>
                  <span className="text-[var(--accent)] font-medium">60%</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full">
                  <div className="h-full w-3/5 bg-[var(--accent)] rounded-full" />
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Top 10 qualify for finals</p>
            </div>

            {/* Leaderboard */}
            <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-[var(--text-primary)]">Leaderboard</h3>
                <Link href="/leaderboard" className="text-xs text-[var(--accent)] hover:underline">
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {leaderboard.map((player) => (
                  <div
                    key={player.rank}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium ${
                        player.rank === 1
                          ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                          : player.rank === 2
                            ? 'bg-zinc-400 text-zinc-900'
                            : player.rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      {player.rank}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] text-xs font-medium">
                      {player.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{player.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{player.wins} wins</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--accent)]">{player.points.toLocaleString()}</p>
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
