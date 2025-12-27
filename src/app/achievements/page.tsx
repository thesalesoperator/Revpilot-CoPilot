'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  Trophy,
  Star,
  Flame,
  Target,
  Zap,
  Crown,
  Medal,
  Award,
  Shield,
  Rocket,
  Heart,
  Clock,
  TrendingUp,
  Users,
  Phone,
  MessageSquare,
  DollarSign,
  CheckCircle,
  Lock,
  Sparkles,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Achievement Categories
const categories = [
  { id: 'all', label: 'All', icon: Trophy },
  { id: 'calls', label: 'Calls', icon: Phone },
  { id: 'closing', label: 'Closing', icon: Target },
  { id: 'practice', label: 'Practice', icon: Flame },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'streaks', label: 'Streaks', icon: Zap },
  { id: 'legendary', label: 'Legendary', icon: Crown },
]

// Achievement definitions
const achievements = [
  // Calls Category
  {
    id: 'first-blood',
    name: 'First Blood',
    description: 'Complete your first call review',
    category: 'calls',
    icon: Phone,
    xp: 50,
    rarity: 'common',
    unlocked: true,
    unlockedAt: '2024-01-15',
    progress: 1,
    maxProgress: 1,
  },
  {
    id: 'call-warrior',
    name: 'Call Warrior',
    description: 'Review 10 calls',
    category: 'calls',
    icon: Shield,
    xp: 100,
    rarity: 'common',
    unlocked: true,
    unlockedAt: '2024-01-20',
    progress: 10,
    maxProgress: 10,
  },
  {
    id: 'call-master',
    name: 'Call Master',
    description: 'Review 50 calls',
    category: 'calls',
    icon: Medal,
    xp: 250,
    rarity: 'rare',
    unlocked: false,
    progress: 23,
    maxProgress: 50,
  },
  {
    id: 'call-legend',
    name: 'Call Legend',
    description: 'Review 100 calls',
    category: 'calls',
    icon: Crown,
    xp: 500,
    rarity: 'epic',
    unlocked: false,
    progress: 23,
    maxProgress: 100,
  },
  {
    id: 'marathon-caller',
    name: 'Marathon Caller',
    description: 'Review calls totaling 10+ hours',
    category: 'calls',
    icon: Clock,
    xp: 300,
    rarity: 'rare',
    unlocked: false,
    progress: 4.5,
    maxProgress: 10,
  },

  // Closing Category
  {
    id: 'first-close',
    name: 'First Close',
    description: 'Close your first deal',
    category: 'closing',
    icon: DollarSign,
    xp: 100,
    rarity: 'common',
    unlocked: true,
    unlockedAt: '2024-01-18',
    progress: 1,
    maxProgress: 1,
  },
  {
    id: 'deal-hunter',
    name: 'Deal Hunter',
    description: 'Close 5 deals',
    category: 'closing',
    icon: Target,
    xp: 200,
    rarity: 'common',
    unlocked: true,
    unlockedAt: '2024-02-01',
    progress: 5,
    maxProgress: 5,
  },
  {
    id: 'quota-crusher',
    name: 'Quota Crusher',
    description: 'Hit 100% of quota in a month',
    category: 'closing',
    icon: Rocket,
    xp: 500,
    rarity: 'epic',
    unlocked: true,
    unlockedAt: '2024-02-28',
    progress: 1,
    maxProgress: 1,
  },
  {
    id: 'overachiever',
    name: 'Overachiever',
    description: 'Hit 150% of quota in a month',
    category: 'closing',
    icon: Star,
    xp: 750,
    rarity: 'legendary',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'big-game-hunter',
    name: 'Big Game Hunter',
    description: 'Close a deal worth $100k+',
    category: 'closing',
    icon: Crown,
    xp: 1000,
    rarity: 'legendary',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },

  // Practice Category
  {
    id: 'practice-makes-perfect',
    name: 'Practice Makes Perfect',
    description: 'Complete your first practice session',
    category: 'practice',
    icon: Flame,
    xp: 50,
    rarity: 'common',
    unlocked: true,
    unlockedAt: '2024-01-16',
    progress: 1,
    maxProgress: 1,
  },
  {
    id: 'sparring-champion',
    name: 'Sparring Champion',
    description: 'Win 10 practice challenges',
    category: 'practice',
    icon: Trophy,
    xp: 200,
    rarity: 'rare',
    unlocked: false,
    progress: 7,
    maxProgress: 10,
  },
  {
    id: 'objection-slayer',
    name: 'Objection Slayer',
    description: 'Successfully handle 25 objections in practice',
    category: 'practice',
    icon: Shield,
    xp: 300,
    rarity: 'rare',
    unlocked: false,
    progress: 18,
    maxProgress: 25,
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Close a practice deal in under 3 minutes',
    category: 'practice',
    icon: Zap,
    xp: 250,
    rarity: 'rare',
    unlocked: true,
    unlockedAt: '2024-02-10',
    progress: 1,
    maxProgress: 1,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Get a perfect score on any challenge',
    category: 'practice',
    icon: Sparkles,
    xp: 400,
    rarity: 'epic',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },

  // Community Category
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Add 5 friends',
    category: 'community',
    icon: Users,
    xp: 100,
    rarity: 'common',
    unlocked: true,
    unlockedAt: '2024-01-22',
    progress: 5,
    maxProgress: 5,
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    description: 'Share 10 call clips to the community',
    category: 'community',
    icon: MessageSquare,
    xp: 200,
    rarity: 'rare',
    unlocked: false,
    progress: 3,
    maxProgress: 10,
  },
  {
    id: 'helpful-hero',
    name: 'Helpful Hero',
    description: 'Get 50 likes on your shared content',
    category: 'community',
    icon: Heart,
    xp: 300,
    rarity: 'rare',
    unlocked: false,
    progress: 27,
    maxProgress: 50,
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Help 5 reps improve their scores',
    category: 'community',
    icon: Award,
    xp: 400,
    rarity: 'epic',
    unlocked: false,
    progress: 2,
    maxProgress: 5,
  },
  {
    id: 'influencer',
    name: 'Influencer',
    description: 'Reach 100 followers',
    category: 'community',
    icon: TrendingUp,
    xp: 500,
    rarity: 'epic',
    unlocked: false,
    progress: 34,
    maxProgress: 100,
  },

  // Streaks Category
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Log in 3 days in a row',
    category: 'streaks',
    icon: Flame,
    xp: 50,
    rarity: 'common',
    unlocked: true,
    unlockedAt: '2024-01-17',
    progress: 3,
    maxProgress: 3,
  },
  {
    id: 'weekly-warrior',
    name: 'Weekly Warrior',
    description: 'Maintain a 7-day streak',
    category: 'streaks',
    icon: Zap,
    xp: 150,
    rarity: 'common',
    unlocked: true,
    unlockedAt: '2024-01-21',
    progress: 7,
    maxProgress: 7,
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Maintain a 30-day streak',
    category: 'streaks',
    icon: Shield,
    xp: 500,
    rarity: 'epic',
    unlocked: false,
    progress: 18,
    maxProgress: 30,
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Maintain a 100-day streak',
    category: 'streaks',
    icon: Rocket,
    xp: 1000,
    rarity: 'legendary',
    unlocked: false,
    progress: 18,
    maxProgress: 100,
  },

  // Legendary Category
  {
    id: 'triple-threat',
    name: 'Triple Threat',
    description: 'Win 3 battles in a row',
    category: 'legendary',
    icon: Trophy,
    xp: 500,
    rarity: 'legendary',
    unlocked: false,
    progress: 1,
    maxProgress: 3,
  },
  {
    id: 'grand-master',
    name: 'Grand Master',
    description: 'Reach max level in any skill tree',
    category: 'legendary',
    icon: Crown,
    xp: 1000,
    rarity: 'legendary',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'hall-of-fame',
    name: 'Hall of Fame',
    description: 'Win Call of the Week',
    category: 'legendary',
    icon: Star,
    xp: 750,
    rarity: 'legendary',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'millionaire',
    name: 'Millionaire',
    description: 'Earn $1M in total commissions',
    category: 'legendary',
    icon: DollarSign,
    xp: 2000,
    rarity: 'legendary',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
]

const rarityColors = {
  common: { bg: 'from-gray-500 to-gray-600', border: 'border-gray-500', text: 'text-gray-400' },
  rare: { bg: 'from-blue-500 to-blue-600', border: 'border-blue-500', text: 'text-blue-400' },
  epic: { bg: 'from-purple-500 to-purple-600', border: 'border-purple-500', text: 'text-purple-400' },
  legendary: { bg: 'from-yellow-500 to-orange-500', border: 'border-yellow-500', text: 'text-yellow-400' },
}

export default function AchievementsPage() {
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false)

  const filteredAchievements = achievements.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false
    if (showUnlockedOnly && !a.unlocked) return false
    return true
  })

  const totalXP = achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + a.xp, 0)
  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const totalCount = achievements.length
  const completionPercentage = Math.round((unlockedCount / totalCount) * 100)

  // Calculate current level based on XP
  const level = Math.floor(totalXP / 500) + 1
  const currentLevelXP = totalXP % 500
  const nextLevelXP = 500

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Achievements</h1>
          <p className="text-gray-400">Track your progress and unlock rewards</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Level Card */}
          <div className="glass-card p-6 col-span-2">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center">
                <span className="text-3xl font-bold text-[#0a0a0f]">{level}</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-sm mb-1">Current Level</p>
                <p className="text-2xl font-bold text-white mb-2">Sales Champion</p>
                <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(currentLevelXP / nextLevelXP) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {currentLevelXP} / {nextLevelXP} XP to Level {level + 1}
                </p>
              </div>
            </div>
          </div>

          {/* Total XP */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Total XP</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalXP.toLocaleString()}</p>
          </div>

          {/* Completion */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-[#5eead4]" />
              <span className="text-gray-400 text-sm">Unlocked</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {unlockedCount}/{totalCount}
            </p>
            <p className="text-sm text-gray-500">{completionPercentage}% complete</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-[rgba(94,234,212,0.2)] text-[#5eead4] border border-[rgba(94,234,212,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowUnlockedOnly(!showUnlockedOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                showUnlockedOnly
                  ? 'bg-[rgba(94,234,212,0.2)] text-[#5eead4]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Unlocked Only
            </button>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((achievement) => {
            const colors = rarityColors[achievement.rarity as keyof typeof rarityColors]
            const progressPercent = (achievement.progress / achievement.maxProgress) * 100

            return (
              <div
                key={achievement.id}
                className={`glass-card p-6 relative overflow-hidden transition-all duration-300 ${
                  achievement.unlocked
                    ? 'border-l-4 ' + colors.border
                    : 'opacity-60 grayscale hover:opacity-80 hover:grayscale-0'
                }`}
              >
                {/* Rarity indicator */}
                {achievement.unlocked && (
                  <div
                    className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${colors.bg} opacity-10 rounded-bl-full`}
                  />
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      achievement.unlocked
                        ? `bg-gradient-to-br ${colors.bg}`
                        : 'bg-[rgba(255,255,255,0.1)]'
                    }`}
                  >
                    {achievement.unlocked ? (
                      <achievement.icon className="w-7 h-7 text-white" />
                    ) : (
                      <Lock className="w-7 h-7 text-gray-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{achievement.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full capitalize ${colors.text} bg-[rgba(255,255,255,0.1)]`}
                      >
                        {achievement.rarity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{achievement.description}</p>

                    {/* Progress bar */}
                    {!achievement.unlocked && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>
                            {achievement.progress}/{achievement.maxProgress}
                          </span>
                        </div>
                        <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2">
                          <div
                            className={`bg-gradient-to-r ${colors.bg} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* XP and unlock date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-medium">+{achievement.xp} XP</span>
                      </div>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <span className="text-xs text-gray-500">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No achievements found in this category</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
