'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import {
  Swords,
  Trophy,
  Users,
  Clock,
  Zap,
  Crown,
  Shield,
  Target,
  Play,
  Pause,
  Mic,
  MicOff,
  Star,
  TrendingUp,
  Award,
  ChevronRight,
  Search,
  UserPlus,
  RotateCcw,
  Volume2,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'

// Battle modes
const battleModes = [
  {
    id: 'quick-duel',
    name: 'Quick Duel',
    description: '1v1 - First to close wins',
    duration: '5 min',
    icon: Swords,
    color: 'from-red-500 to-orange-500',
    xpReward: 100,
  },
  {
    id: 'objection-showdown',
    name: 'Objection Showdown',
    description: 'Handle objections back-to-back',
    duration: '3 min',
    icon: Shield,
    color: 'from-blue-500 to-cyan-500',
    xpReward: 75,
  },
  {
    id: 'discovery-race',
    name: 'Discovery Race',
    description: 'Who can uncover more needs?',
    duration: '4 min',
    icon: Target,
    color: 'from-green-500 to-emerald-500',
    xpReward: 80,
  },
  {
    id: 'championship',
    name: 'Championship',
    description: 'Full sales cycle competition',
    duration: '15 min',
    icon: Crown,
    color: 'from-yellow-500 to-amber-500',
    xpReward: 250,
  },
]

// Mock online players
const onlinePlayers = [
  { id: '1', name: 'SalesNinja', level: 12, wins: 45, avatar: 'S', status: 'online', rank: 'Diamond' },
  { id: '2', name: 'CloserKing', level: 15, wins: 67, avatar: 'C', status: 'online', rank: 'Master' },
  { id: '3', name: 'DealHunter', level: 8, wins: 23, avatar: 'D', status: 'in-battle', rank: 'Gold' },
  { id: '4', name: 'QuotaCrusher', level: 20, wins: 89, avatar: 'Q', status: 'online', rank: 'Grandmaster' },
  { id: '5', name: 'PitchPerfect', level: 10, wins: 34, avatar: 'P', status: 'online', rank: 'Platinum' },
  { id: '6', name: 'RevRocket', level: 6, wins: 12, avatar: 'R', status: 'online', rank: 'Silver' },
]

// Mock leaderboard
const leaderboard = [
  { rank: 1, name: 'QuotaCrusher', wins: 89, losses: 12, winRate: 88, xp: 15000, tier: 'Grandmaster' },
  { rank: 2, name: 'CloserKing', wins: 67, losses: 15, winRate: 82, xp: 12500, tier: 'Master' },
  { rank: 3, name: 'SalesNinja', wins: 45, losses: 18, winRate: 71, xp: 9800, tier: 'Diamond' },
  { rank: 4, name: 'PitchPerfect', wins: 34, losses: 20, winRate: 63, xp: 7200, tier: 'Platinum' },
  { rank: 5, name: 'DealHunter', wins: 23, losses: 15, winRate: 60, xp: 5100, tier: 'Gold' },
]

// Match history
const matchHistory = [
  { opponent: 'SalesNinja', mode: 'Quick Duel', result: 'win', score: '2-1', xpGained: 100, date: '2 hours ago' },
  { opponent: 'CloserKing', mode: 'Championship', result: 'loss', score: '1-3', xpGained: 50, date: '5 hours ago' },
  { opponent: 'DealHunter', mode: 'Objection Showdown', result: 'win', score: '5-2', xpGained: 75, date: '1 day ago' },
  { opponent: 'RevRocket', mode: 'Discovery Race', result: 'win', score: '8-4', xpGained: 80, date: '2 days ago' },
]

const rankColors: Record<string, string> = {
  Bronze: 'text-amber-700',
  Silver: 'text-gray-400',
  Gold: 'text-yellow-500',
  Platinum: 'text-cyan-400',
  Diamond: 'text-blue-400',
  Master: 'text-purple-400',
  Grandmaster: 'text-red-400',
}

export default function BattlePage() {
  const { user } = useAuth()
  const [selectedMode, setSelectedMode] = useState(battleModes[0])
  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [showBattle, setShowBattle] = useState(false)
  const [matchFound, setMatchFound] = useState(false)
  const [opponent, setOpponent] = useState<typeof onlinePlayers[0] | null>(null)
  const [battleTime, setBattleTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'battle' | 'leaderboard' | 'history'>('battle')

  // Matchmaking simulation
  useEffect(() => {
    if (showMatchmaking && !matchFound) {
      const timer = setTimeout(() => {
        const randomOpponent = onlinePlayers.filter((p) => p.status === 'online')[
          Math.floor(Math.random() * onlinePlayers.filter((p) => p.status === 'online').length)
        ]
        setOpponent(randomOpponent)
        setMatchFound(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showMatchmaking, matchFound])

  // Battle timer
  useEffect(() => {
    if (showBattle) {
      const timer = setInterval(() => {
        setBattleTime((t) => t + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [showBattle])

  const startMatchmaking = () => {
    setShowMatchmaking(true)
    setMatchFound(false)
    setOpponent(null)
  }

  const startBattle = () => {
    setShowMatchmaking(false)
    setShowBattle(true)
    setBattleTime(0)
  }

  const endBattle = () => {
    setShowBattle(false)
    setBattleTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // User stats (mock)
  const userStats = {
    rank: 'Platinum',
    wins: 28,
    losses: 14,
    winRate: 67,
    currentStreak: 3,
    bestStreak: 7,
    totalXP: 6200,
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Battle Mode</h1>
          <p className="text-gray-400">Challenge other sales reps in 1v1 competitions</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {['battle', 'leaderboard', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-6 py-2 rounded-xl transition-all capitalize ${
                activeTab === tab
                  ? 'bg-[rgba(0,255,193,0.2)] text-[#00ffc1] border border-[rgba(0,255,193,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'battle' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Your Stats */}
            <div className="space-y-6">
              {/* Player Card */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-2xl font-bold text-[#00102e]">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {user?.user_metadata?.full_name || 'You'}
                    </h3>
                    <p className={`font-semibold ${rankColors[userStats.rank]}`}>
                      {userStats.rank}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[rgba(255,255,255,0.05)] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{userStats.wins}</p>
                    <p className="text-xs text-gray-400">Wins</p>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.05)] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{userStats.losses}</p>
                    <p className="text-xs text-gray-400">Losses</p>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.05)] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-[#00ffc1]">{userStats.winRate}%</p>
                    <p className="text-xs text-gray-400">Win Rate</p>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.05)] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{userStats.currentStreak}</p>
                    <p className="text-xs text-gray-400">Streak 🔥</p>
                  </div>
                </div>
              </div>

              {/* Online Players */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Online Players</h3>
                  <span className="text-sm text-[#00ffc1]">
                    {onlinePlayers.filter((p) => p.status === 'online').length} online
                  </span>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffc1]"
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {onlinePlayers
                    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {player.avatar}
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#00102e] ${
                              player.status === 'online'
                                ? 'bg-green-500'
                                : player.status === 'in-battle'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-500'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{player.name}</p>
                          <p className={`text-xs ${rankColors[player.rank]}`}>
                            {player.rank} • Lv.{player.level}
                          </p>
                        </div>
                        {player.status === 'online' && (
                          <button className="p-2 rounded-lg bg-[rgba(0,255,193,0.1)] text-[#00ffc1] hover:bg-[rgba(0,255,193,0.2)] transition-colors">
                            <Swords className="w-4 h-4" />
                          </button>
                        )}
                        {player.status === 'in-battle' && (
                          <span className="text-xs text-yellow-500">In Battle</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Center Column - Battle Modes */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-semibold text-white">Select Battle Mode</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {battleModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode)}
                    className={`p-6 rounded-xl text-left transition-all ${
                      selectedMode.id === mode.id
                        ? 'glass-card border-[rgba(0,255,193,0.3)] scale-[1.02]'
                        : 'bg-[rgba(255,255,255,0.02)] border border-transparent hover:bg-[rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center`}
                      >
                        <mode.icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">{mode.name}</h4>
                        <p className="text-sm text-gray-400 mb-2">{mode.description}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3 h-3" />
                            {mode.duration}
                          </span>
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Zap className="w-3 h-3" />
                            +{mode.xpReward} XP
                          </span>
                        </div>
                      </div>
                      {selectedMode.id === mode.id && (
                        <div className="w-6 h-6 rounded-full bg-[#00ffc1] flex items-center justify-center">
                          <Star className="w-4 h-4 text-[#00102e]" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Start Battle Button */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-white">{selectedMode.name}</h4>
                    <p className="text-sm text-gray-400">{selectedMode.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Reward</p>
                    <p className="text-lg font-bold text-yellow-400">+{selectedMode.xpReward} XP</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={startMatchmaking}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Swords className="w-5 h-5" />
                    Find Opponent
                  </button>
                  <button className="px-6 py-4 rounded-xl bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Invite Friend
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left p-4 text-gray-400 font-medium">Rank</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Player</th>
                  <th className="text-center p-4 text-gray-400 font-medium">W/L</th>
                  <th className="text-center p-4 text-gray-400 font-medium">Win Rate</th>
                  <th className="text-right p-4 text-gray-400 font-medium">XP</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((player, index) => (
                  <tr
                    key={player.rank}
                    className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {player.rank <= 3 ? (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              player.rank === 1
                                ? 'bg-yellow-500'
                                : player.rank === 2
                                  ? 'bg-gray-400'
                                  : 'bg-amber-700'
                            }`}
                          >
                            <Trophy className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <span className="w-8 h-8 flex items-center justify-center text-gray-400 font-bold">
                            #{player.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {player.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{player.name}</p>
                          <p className={`text-xs ${rankColors[player.tier]}`}>{player.tier}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-green-400">{player.wins}</span>
                      <span className="text-gray-500"> / </span>
                      <span className="text-red-400">{player.losses}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-[#00ffc1] font-semibold">{player.winRate}%</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-yellow-400 font-semibold">
                        {player.xp.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {matchHistory.map((match, index) => (
              <div
                key={index}
                className={`glass-card p-4 border-l-4 ${
                  match.result === 'win' ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        match.result === 'win' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}
                    >
                      {match.result === 'win' ? (
                        <Trophy className="w-6 h-6 text-green-400" />
                      ) : (
                        <Shield className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">vs {match.opponent}</p>
                      <p className="text-sm text-gray-400">{match.mode}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{match.score}</p>
                    <p
                      className={`text-sm font-semibold ${
                        match.result === 'win' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {match.result.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-semibold">+{match.xpGained} XP</p>
                    <p className="text-sm text-gray-500">{match.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matchmaking Modal */}
      <Modal isOpen={showMatchmaking} onClose={() => setShowMatchmaking(false)} title="">
        <div className="text-center py-8">
          {!matchFound ? (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-[#00ffc1] border-t-transparent animate-spin" />
              <h3 className="text-xl font-bold text-white mb-2">Finding Opponent...</h3>
              <p className="text-gray-400 mb-4">{selectedMode.name}</p>
              <p className="text-sm text-gray-500">Searching for players at your skill level</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-8 mb-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-3xl font-bold text-[#00102e]">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <p className="font-medium text-white">You</p>
                  <p className={`text-sm ${rankColors[userStats.rank]}`}>{userStats.rank}</p>
                </div>
                <div className="text-4xl font-bold text-[#00ffc1]">VS</div>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white">
                    {opponent?.avatar}
                  </div>
                  <p className="font-medium text-white">{opponent?.name}</p>
                  <p className={`text-sm ${rankColors[opponent?.rank || 'Gold']}`}>
                    {opponent?.rank}
                  </p>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Match Found!</h3>
              <p className="text-gray-400 mb-6">{selectedMode.name}</p>
              <button
                onClick={startBattle}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] text-[#00102e] font-bold hover:opacity-90 transition-opacity"
              >
                Start Battle
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Battle Modal */}
      <Modal isOpen={showBattle} onClose={() => {}} title="">
        <div className="py-4">
          {/* Battle Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center text-xl font-bold text-[#00102e]">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-medium text-white">You</p>
                <p className="text-sm text-[#00ffc1]">Score: 0</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{formatTime(battleTime)}</div>
              <p className="text-sm text-gray-400">{selectedMode.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium text-white">{opponent?.name}</p>
                <p className="text-sm text-purple-400">Score: 0</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white">
                {opponent?.avatar}
              </div>
            </div>
          </div>

          {/* Battle Arena */}
          <div className="bg-[rgba(0,0,0,0.3)] rounded-2xl p-8 mb-6">
            <div className="text-center mb-6">
              <p className="text-gray-400 mb-2">AI Prospect: Sarah Chen, VP of Sales</p>
              <p className="text-lg text-white">
                &ldquo;We&apos;re currently evaluating several solutions. What makes yours different?&rdquo;
              </p>
            </div>

            {/* Audio Visualization */}
            <div className="flex items-center justify-center gap-1 h-16 mb-6">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-[#00ffc1] rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full transition-all ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)]'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={endBattle}
                className="px-8 py-4 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                End Battle
              </button>
              <button className="p-4 rounded-full bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)] transition-all">
                <Volume2 className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Battle Tips */}
          <div className="bg-[rgba(0,255,193,0.1)] rounded-xl p-4">
            <p className="text-sm text-[#00ffc1] font-medium mb-1">💡 Battle Tip</p>
            <p className="text-sm text-gray-400">
              Focus on differentiating value, not features. Lead with outcomes and ROI.
            </p>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
