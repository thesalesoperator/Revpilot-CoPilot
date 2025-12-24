'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  Calculator,
  Phone,
  Target,
  Swords,
  Users,
  BarChart3,
  Settings,
  Flame,
  Zap,
  Trophy,
  Bell,
  Star,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

// Simplified navigation - 6 main items with enhanced data
const navItems = [
  {
    href: '/calls',
    icon: Phone,
    label: 'Call Coaching',
    notification: 3, // New calls to review
  },
  {
    href: '/training',
    icon: Target,
    label: 'Training',
    progress: 65, // Overall training progress
  },
  {
    href: '/compete',
    icon: Swords,
    label: 'Compete',
    streak: 5, // Current win streak
    hot: true,
  },
  {
    href: '/community',
    icon: Users,
    label: 'Community',
    notification: 2, // Friend requests
  },
  {
    href: '/performance',
    icon: BarChart3,
    label: 'My Performance',
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
  },
]

// Mock user game stats
const userGameStats = {
  level: 12,
  xp: 3250,
  xpToNext: 5000,
  rank: 'Gold',
  streak: 5,
  unlockedAchievements: 18,
  totalAchievements: 28,
}

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut, user } = useAuth()

  // Check if current path starts with nav item href (for hub pages)
  const isActiveRoute = (href: string) => {
    if (href === '/calls') return pathname === '/calls'
    if (href === '/settings') return pathname === '/settings'
    return pathname.startsWith(href)
  }

  const xpProgress = (userGameStats.xp / userGameStats.xpToNext) * 100

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-card rounded-none border-l-0 border-t-0 border-b-0 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(0,255,193,0.1)]">
        <Link href="/calls" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4ee8c7] to-[#3dd4b5] flex items-center justify-center">
            <Calculator className="w-6 h-6 text-[#0a1628]" />
          </div>
          <div>
            <h1 className="font-bold text-lg gradient-text">RevPilot</h1>
            <p className="text-xs text-gray-500">Sales Platform</p>
          </div>
        </Link>
      </div>

      {/* Level & XP Card */}
      <div className="p-4 border-b border-[rgba(0,255,193,0.1)]">
        <div className="glass-card p-3 bg-gradient-to-r from-[rgba(0,255,193,0.1)] to-[rgba(0,217,166,0.05)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{userGameStats.level}</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0a1628] border-2 border-yellow-500 flex items-center justify-center">
                <Star className="w-3 h-3 text-yellow-500" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Level {userGameStats.level}</span>
                <span className="text-xs text-yellow-400">{userGameStats.rank}</span>
              </div>
              <div className="w-full bg-[rgba(0,0,0,0.3)] rounded-full h-2 mt-1">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">{userGameStats.xp.toLocaleString()} XP</span>
                <span className="text-xs text-gray-500">{userGameStats.xpToNext.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-400">{userGameStats.streak}</span>
              <span className="text-xs text-gray-500">streak</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-400">{userGameStats.unlockedAchievements}</span>
              <span className="text-xs text-gray-500">/{userGameStats.totalAchievements}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group',
                    isActive
                      ? 'bg-[rgba(0,255,193,0.1)] text-[#4ee8c7] border border-[rgba(0,255,193,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                  )}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5" />
                    {/* Notification Badge */}
                    {item.notification && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">{item.notification}</span>
                      </div>
                    )}
                  </div>

                  <span className="font-medium flex-1">{item.label}</span>

                  {/* Streak Indicator */}
                  {item.streak && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20">
                      <Flame className="w-3 h-3 text-orange-500" />
                      <span className="text-xs font-bold text-orange-400">{item.streak}</span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {item.progress && (
                    <div className="w-12 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#4ee8c7] to-[#3dd4b5] rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Hot/New Indicator */}
                  {item.hot && !item.streak && (
                    <div className="w-2 h-2 rounded-full bg-[#4ee8c7] animate-pulse" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Daily Challenge Teaser */}
      <div className="p-4 border-t border-[rgba(0,255,193,0.1)]">
        <Link
          href="/training"
          className="block p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-purple-400">DAILY CHALLENGE</span>
          </div>
          <p className="text-sm text-white">Close 3 practice deals</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1 h-1.5 bg-[rgba(0,0,0,0.3)] rounded-full mr-3">
              <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            </div>
            <span className="text-xs text-gray-400">1/3</span>
          </div>
        </Link>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-[rgba(0,255,193,0.1)]">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6b72] to-[#ffc470] flex items-center justify-center text-white font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0a1628]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:text-[#ff6b8a] hover:bg-[rgba(255,0,67,0.1)] transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
