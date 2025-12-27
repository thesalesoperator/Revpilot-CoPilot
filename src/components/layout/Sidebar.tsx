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
  Star,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import OrganizationSwitcher from '@/components/organization/OrganizationSwitcher'

// Simplified navigation - 6 main items with enhanced data
const navItems = [
  {
    href: '/calls',
    icon: Phone,
    label: 'Call Coaching',
    notification: 3,
  },
  {
    href: '/training',
    icon: Target,
    label: 'Training',
    progress: 65,
  },
  {
    href: '/compete',
    icon: Swords,
    label: 'Compete',
    streak: 5,
    hot: true,
  },
  {
    href: '/community',
    icon: Users,
    label: 'Community',
    notification: 2,
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

  const isActiveRoute = (href: string) => {
    if (href === '/calls') return pathname === '/calls'
    if (href === '/settings') return pathname === '/settings'
    return pathname.startsWith(href)
  }

  const xpProgress = (userGameStats.xp / userGameStats.xpToNext) * 100

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-card rounded-none border-l-0 border-t-0 border-b-0 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(94,234,212,0.1)]">
        <Link href="/calls" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#2dd4bf] flex items-center justify-center">
            <Calculator className="w-6 h-6 text-[#0f172a]" />
          </div>
          <div>
            <h1 className="font-bold text-lg gradient-text">RevPilot</h1>
            <p className="text-xs text-slate-500">Sales Platform</p>
          </div>
        </Link>
      </div>

      {/* Level & XP Card - Monochromatic teal */}
      <div className="p-4 border-b border-[rgba(94,234,212,0.1)]">
        <div className="glass-card p-3 bg-gradient-to-r from-[rgba(94,234,212,0.08)] to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center">
                <span className="text-lg font-bold text-[#0a0a0f]">{userGameStats.level}</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0f172a] border-2 border-[#5eead4] flex items-center justify-center">
                <Star className="w-3 h-3 text-[#5eead4]" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">Level {userGameStats.level}</span>
                <span className="text-xs text-[#5eead4]">{userGameStats.rank}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mt-1">
                <div
                  className="bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-400">{userGameStats.xp.toLocaleString()} XP</span>
                <span className="text-xs text-slate-500">{userGameStats.xpToNext.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-[#5eead4]" />
              <span className="text-sm font-semibold text-[#5eead4]">{userGameStats.streak}</span>
              <span className="text-xs text-slate-500">streak</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-[#5eead4]" />
              <span className="text-sm font-semibold text-[#5eead4]">{userGameStats.unlockedAchievements}</span>
              <span className="text-xs text-slate-500">/{userGameStats.totalAchievements}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Switcher */}
      <div className="px-4 py-3 border-b border-[rgba(94,234,212,0.1)]">
        <OrganizationSwitcher />
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
                      ? 'bg-[rgba(94,234,212,0.1)] text-[#5eead4] border border-[rgba(94,234,212,0.25)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  )}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5" />
                    {item.notification && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#5eead4] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#0f172a]">{item.notification}</span>
                      </div>
                    )}
                  </div>

                  <span className="font-medium flex-1">{item.label}</span>

                  {item.streak && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(94,234,212,0.15)]">
                      <Flame className="w-3 h-3 text-[#5eead4]" />
                      <span className="text-xs font-bold text-[#5eead4]">{item.streak}</span>
                    </div>
                  )}

                  {item.progress && (
                    <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#5eead4] to-[#2dd4bf] rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.hot && !item.streak && (
                    <div className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Daily Challenge Teaser */}
      <div className="p-4 border-t border-[rgba(94,234,212,0.1)]">
        <Link
          href="/training"
          className="block p-3 rounded-xl bg-[rgba(94,234,212,0.05)] border border-[rgba(94,234,212,0.15)] hover:border-[rgba(94,234,212,0.3)] transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-[#5eead4]" />
            <span className="text-xs font-semibold text-[#5eead4]">DAILY CHALLENGE</span>
          </div>
          <p className="text-sm text-slate-200">Close 3 practice deals</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full mr-3">
              <div className="h-full w-1/3 bg-gradient-to-r from-[#5eead4] to-[#2dd4bf] rounded-full" />
            </div>
            <span className="text-xs text-slate-400">1/3</span>
          </div>
        </Link>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-[rgba(94,234,212,0.1)]">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5eead4] to-[#2dd4bf] flex items-center justify-center text-[#0f172a] font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#5eead4] border-2 border-[#0f172a]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:text-gray-300 hover:bg-[rgba(255,255,255,0.05)] transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
