'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  Map,
  Users,
  Trophy,
  Sword,
  Shield,
  Target,
  TrendingUp,
  Zap,
  Crown,
  Flag,
  Star,
  ChevronRight,
  Clock,
  Award,
  Flame,
  BarChart3,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Teams data
const teams = [
  {
    id: '1',
    name: 'Deal Destroyers',
    color: 'from-gray-500 to-[#5eead4]',
    members: 8,
    wins: 24,
    losses: 6,
    points: 4850,
    rank: 1,
    territory: 35,
    streak: 5,
    avatar: '🔥',
  },
  {
    id: '2',
    name: 'Quota Crushers',
    color: 'from-[#5eead4] to-[#5eead4]',
    members: 7,
    wins: 22,
    losses: 8,
    points: 4320,
    rank: 2,
    territory: 28,
    streak: 3,
    avatar: '⚡',
  },
  {
    id: '3',
    name: 'Revenue Rockets',
    color: 'from-[#5eead4] to-emerald-500',
    members: 6,
    wins: 19,
    losses: 11,
    points: 3780,
    rank: 3,
    territory: 22,
    streak: 0,
    avatar: '🚀',
  },
  {
    id: '4',
    name: 'Close Kings',
    color: 'from-[#5eead4] to-[#5eead4]',
    members: 8,
    wins: 15,
    losses: 15,
    points: 3100,
    rank: 4,
    territory: 15,
    streak: 2,
    avatar: '👑',
  },
]

// Current week challenges
const weeklyChallenges = [
  {
    id: '1',
    name: 'Discovery Domination',
    description: 'Complete the most discovery calls with 80%+ scores',
    reward: 500,
    progress: 12,
    goal: 20,
    endsIn: '3 days',
    icon: Target,
    color: 'from-[#5eead4] to-[#5eead4]',
  },
  {
    id: '2',
    name: 'Objection Obliterator',
    description: 'Handle 50 objections successfully in practice',
    reward: 750,
    progress: 38,
    goal: 50,
    endsIn: '3 days',
    icon: Shield,
    color: 'from-gray-500 to-[#5eead4]',
  },
  {
    id: '3',
    name: 'Closing Crusade',
    description: 'Close deals worth $100k+ collectively',
    reward: 1000,
    progress: 67000,
    goal: 100000,
    endsIn: '3 days',
    icon: Trophy,
    color: 'from-[#5eead4] to-emerald-500',
    isCurrency: true,
  },
]

// Territory map regions
const territories = [
  { id: 'north', name: 'North Region', owner: 'Deal Destroyers', color: 'from-gray-500 to-[#5eead4]', value: 15 },
  { id: 'south', name: 'South Region', owner: 'Quota Crushers', color: 'from-[#5eead4] to-[#5eead4]', value: 12 },
  { id: 'east', name: 'East Region', owner: 'Deal Destroyers', color: 'from-gray-500 to-[#5eead4]', value: 10 },
  { id: 'west', name: 'West Region', owner: 'Revenue Rockets', color: 'from-[#5eead4] to-emerald-500', value: 14 },
  { id: 'central', name: 'Central Region', owner: 'Close Kings', color: 'from-[#5eead4] to-[#5eead4]', value: 20 },
  { id: 'coastal', name: 'Coastal Region', owner: 'Quota Crushers', color: 'from-[#5eead4] to-[#5eead4]', value: 18 },
]

// Recent battles
const recentBattles = [
  { attacker: 'Deal Destroyers', defender: 'Quota Crushers', result: 'win', region: 'East Region', time: '2 hours ago' },
  { attacker: 'Revenue Rockets', defender: 'Close Kings', result: 'loss', region: 'Central Region', time: '5 hours ago' },
  { attacker: 'Quota Crushers', defender: 'Deal Destroyers', result: 'win', region: 'North Region', time: '1 day ago' },
]

// Your team info (mock)
const yourTeam = {
  id: '1',
  name: 'Deal Destroyers',
  role: 'Captain',
  contribution: 1250,
  weeklyRank: 2,
}

export default function TerritoryWarsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'challenges' | 'history'>('overview')
  const [selectedTeam, setSelectedTeam] = useState(teams[0])

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Territory Wars</h1>
          <p className="text-gray-400">Compete with your team to conquer territories</p>
        </div>

        {/* Season Banner */}
        <div className="glass-card p-6 mb-8 bg-gradient-to-r from-[rgba(94,234,212,0.1)] to-[rgba(0,217,166,0.05)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center">
                <Crown className="w-8 h-8 text-[#0a0a0f]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Season 3: Winter Conquest</h2>
                <p className="text-gray-400">12 days remaining</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Season Prize Pool</p>
              <p className="text-3xl font-bold gradient-text">50,000 XP</p>
            </div>
          </div>
        </div>

        {/* Your Team Card */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-500 to-[#5eead4] flex items-center justify-center text-3xl">
                🔥
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{yourTeam.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#5eead4]/20 text-[#5eead4] text-xs font-medium">
                    {yourTeam.role}
                  </span>
                </div>
                <p className="text-gray-400">Rank #{teams.find((t) => t.id === yourTeam.id)?.rank}</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#5eead4]">{yourTeam.contribution}</p>
                <p className="text-xs text-gray-400">Your Contribution</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#5eead4]">#{yourTeam.weeklyRank}</p>
                <p className="text-xs text-gray-400">Team Rank</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                  5 <Flame className="w-5 h-5 text-[#5eead4]" />
                </p>
                <p className="text-xs text-gray-400">Win Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {['overview', 'map', 'challenges', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-6 py-2 rounded-xl transition-all capitalize ${
                activeTab === tab
                  ? 'bg-[rgba(94,234,212,0.2)] text-[#5eead4] border border-[rgba(94,234,212,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Leaderboard */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">Team Standings</h3>
              <div className="space-y-4">
                {teams.map((team, index) => (
                  <div
                    key={team.id}
                    className={`glass-card p-4 cursor-pointer transition-all hover:scale-[1.01] ${
                      team.id === yourTeam.id ? 'border-[rgba(94,234,212,0.3)]' : ''
                    }`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          team.rank === 1
                            ? 'bg-[#5eead4] text-black'
                            : team.rank === 2
                              ? 'bg-gray-400 text-black'
                              : team.rank === 3
                                ? 'bg-gray-500 text-white'
                                : 'bg-[rgba(255,255,255,0.1)] text-gray-400'
                        }`}
                      >
                        {team.rank}
                      </div>

                      {/* Team Info */}
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${team.color} flex items-center justify-center text-2xl`}
                      >
                        {team.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white">{team.name}</h4>
                          {team.id === yourTeam.id && (
                            <span className="text-xs text-[#5eead4]">(Your Team)</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{team.members} members</p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">
                            {team.wins}-{team.losses}
                          </p>
                          <p className="text-xs text-gray-500">W-L</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-[#5eead4]">{team.territory}%</p>
                          <p className="text-xs text-gray-500">Territory</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-[#5eead4]">
                            {team.points.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Points</p>
                        </div>
                        {team.streak > 0 && (
                          <div className="flex items-center gap-1 text-[#5eead4]">
                            <Flame className="w-4 h-4" />
                            <span className="font-bold">{team.streak}</span>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4">This Week&apos;s Battle</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Battles Won</span>
                    <span className="text-[#5eead4] font-semibold">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Battles Lost</span>
                    <span className="text-gray-400 font-semibold">2</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Territory Gained</span>
                    <span className="text-[#5eead4] font-semibold">+12%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Points Earned</span>
                    <span className="text-[#5eead4] font-semibold">+1,250</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4">Recent Battles</h3>
                <div className="space-y-3">
                  {recentBattles.map((battle, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">{battle.attacker}</span>
                        <span
                          className={`text-xs font-semibold ${
                            battle.result === 'win' ? 'text-[#5eead4]' : 'text-gray-400'
                          }`}
                        >
                          {battle.result === 'win' ? 'VICTORY' : 'DEFEAT'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">vs {battle.defender}</span>
                        <span className="text-xs text-gray-500">{battle.time}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        <Flag className="w-3 h-3 inline mr-1" />
                        {battle.region}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="glass-card p-8">
            <h3 className="text-lg font-semibold text-white mb-6">Territory Map</h3>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {territories.map((territory) => (
                <div
                  key={territory.id}
                  className={`p-6 rounded-xl bg-gradient-to-br ${territory.color} bg-opacity-20 border border-[rgba(255,255,255,0.1)] hover:scale-105 transition-transform cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{territory.name}</h4>
                    <span className="text-lg font-bold text-white">{territory.value}%</span>
                  </div>
                  <p className="text-sm text-gray-300">Controlled by {territory.owner}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button className="flex-1 py-2 rounded-lg bg-[rgba(0,0,0,0.3)] text-white text-sm hover:bg-[rgba(0,0,0,0.5)] transition-colors">
                      <Sword className="w-4 h-4 inline mr-1" />
                      Attack
                    </button>
                    <button className="flex-1 py-2 rounded-lg bg-[rgba(255,255,255,0.1)] text-white text-sm hover:bg-[rgba(255,255,255,0.2)] transition-colors">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Defend
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Territory Legend */}
            <div className="flex items-center justify-center gap-8">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded bg-gradient-to-r ${team.color}`} />
                  <span className="text-sm text-gray-400">{team.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Weekly Team Challenges</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {weeklyChallenges.map((challenge) => {
                const progressPercent = challenge.isCurrency
                  ? ((challenge.progress as number) / (challenge.goal as number)) * 100
                  : ((challenge.progress as number) / (challenge.goal as number)) * 100
                return (
                  <div key={challenge.id} className="glass-card p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${challenge.color} flex items-center justify-center`}
                      >
                        <challenge.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{challenge.name}</h4>
                        <p className="text-sm text-gray-400">{challenge.description}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white">
                          {challenge.isCurrency
                            ? `$${(challenge.progress as number).toLocaleString()} / $${(challenge.goal as number).toLocaleString()}`
                            : `${challenge.progress} / ${challenge.goal}`}
                        </span>
                      </div>
                      <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-3">
                        <div
                          className={`bg-gradient-to-r ${challenge.color} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[#5eead4]">
                        <Zap className="w-4 h-4" />
                        <span className="font-semibold">+{challenge.reward} XP</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{challenge.endsIn}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left p-4 text-gray-400 font-medium">Battle</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Territory</th>
                  <th className="text-center p-4 text-gray-400 font-medium">Result</th>
                  <th className="text-center p-4 text-gray-400 font-medium">Score</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {[...recentBattles, ...recentBattles, ...recentBattles].map((battle, index) => (
                  <tr
                    key={index}
                    className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">{battle.attacker}</p>
                        <p className="text-sm text-gray-500">vs {battle.defender}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Flag className="w-4 h-4" />
                        {battle.region}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          battle.result === 'win'
                            ? 'bg-[#5eead4]/20 text-[#5eead4]'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {battle.result.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-center text-white font-semibold">3-1</td>
                    <td className="p-4 text-right text-gray-500">{battle.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
