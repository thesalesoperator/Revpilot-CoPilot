'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  Phone,
  Target,
  Settings,
  Flame,
  Zap,
  Trophy,
  Star,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import OrganizationSwitcher from '@/components/organization/OrganizationSwitcher'

// Core navigation - focused on 3 key features
const navItems = [
  {
    href: '/practice',
    icon: Target,
    label: 'Practice Arena',
    description: 'AI-powered sales sparring',
    hot: true,
  },
  {
    href: '/calls',
    icon: Phone,
    label: 'Call Review',
    description: 'Upload & analyze calls',
  },
  {
    href: '/coaching',
    icon: Zap,
    label: 'Live Coaching',
    description: 'Real-time Zoom coaching',
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
  const { theme, toggleTheme } = useTheme()

  const isActiveRoute = (href: string) => {
    if (href === '/practice') return pathname === '/practice'
    if (href === '/calls') return pathname === '/calls'
    if (href === '/coaching') return pathname === '/coaching'
    if (href === '/settings') return pathname.startsWith('/settings')
    return pathname === href
  }

  const xpProgress = (userGameStats.xp / userGameStats.xpToNext) * 100

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-card sidebar-container rounded-none border-l-0 border-t-0 border-b-0 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--glass-border)]">
        <div className="flex items-center justify-between">
          <Link href="/practice" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
              <Zap className="w-6 h-6 text-white dark:text-[#0f172a]" />
            </div>
            <div>
              <h1 className="font-bold text-lg gradient-text">RevPilot</h1>
              <p className="text-xs text-[var(--foreground-dim)]">AI Sales Coach</p>
            </div>
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[var(--glass-bg)] border border-transparent hover:border-[var(--glass-border)] transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-[var(--foreground-muted)]" />
            ) : (
              <Moon className="w-5 h-5 text-[var(--foreground-muted)]" />
            )}
          </button>
        </div>
      </div>

      {/* Level & XP Card */}
      <div className="p-4 border-b border-[var(--glass-border)]">
        <div className="glass-card p-3 bg-gradient-to-r from-[var(--accent-light-bg)] to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
                <span className="text-lg font-bold text-white dark:text-[#0a0a0f]">{userGameStats.level}</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--background)] border-2 border-[var(--accent)] flex items-center justify-center">
                <Star className="w-3 h-3 text-[var(--accent)]" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--foreground)]">Level {userGameStats.level}</span>
                <span className="text-xs text-[var(--accent)]">{userGameStats.rank}</span>
              </div>
              <div className="w-full bg-[var(--background-tertiary)] rounded-full h-2 mt-1">
                <div
                  className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-[var(--foreground-muted)]">{userGameStats.xp.toLocaleString()} XP</span>
                <span className="text-xs text-[var(--foreground-dim)]">{userGameStats.xpToNext.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm font-semibold text-[var(--accent)]">{userGameStats.streak}</span>
              <span className="text-xs text-[var(--foreground-dim)]">streak</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm font-semibold text-[var(--accent)]">{userGameStats.unlockedAchievements}</span>
              <span className="text-xs text-[var(--foreground-dim)]">/{userGameStats.totalAchievements}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Switcher */}
      <div className="px-4 py-3 border-b border-[var(--glass-border)]">
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
                      ? 'bg-[var(--accent-light-bg)] text-[var(--accent)] border border-[var(--accent-border)]'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
                  )}
                >
                  <item.icon className="w-5 h-5" />

                  <div className="flex-1">
                    <span className="font-medium">{item.label}</span>
                    {'description' in item && item.description && (
                      <p className="text-xs text-[var(--foreground-dim)] mt-0.5">{item.description}</p>
                    )}
                  </div>

                  {'hot' in item && item.hot && (
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Daily Challenge Teaser */}
      <div className="p-4 border-t border-[var(--glass-border)]">
        <Link
          href="/practice"
          className="block p-3 rounded-xl bg-[var(--accent-light-bg)] border border-[var(--accent-border)] hover:border-[var(--accent)] transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--accent)]">DAILY CHALLENGE</span>
          </div>
          <p className="text-sm text-[var(--foreground)]">Complete 3 practice calls</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1 h-1.5 bg-[var(--background-tertiary)] rounded-full mr-3">
              <div className="h-full w-1/3 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full" />
            </div>
            <span className="text-xs text-[var(--foreground-muted)]">1/3</span>
          </div>
        </Link>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-white dark:text-[#0f172a] font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent)] border-2 border-[var(--background)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-[var(--foreground-dim)] truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)] transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
