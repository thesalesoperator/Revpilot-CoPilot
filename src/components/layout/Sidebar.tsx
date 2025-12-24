'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  Phone,
  Target,
  Swords,
  Users,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

// Clean, professional navigation
const navItems = [
  {
    href: '/calls',
    icon: Phone,
    label: 'Call Coaching',
  },
  {
    href: '/training',
    icon: Target,
    label: 'Training',
  },
  {
    href: '/compete',
    icon: Swords,
    label: 'Arena',
  },
  {
    href: '/community',
    icon: Users,
    label: 'Community',
  },
  {
    href: '/performance',
    icon: BarChart3,
    label: 'Performance',
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut, user } = useAuth()

  const isActiveRoute = (href: string) => {
    if (href === '/calls') return pathname === '/calls'
    if (href === '/settings') return pathname === '/settings'
    return pathname.startsWith(href)
  }

  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || 'U'
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col z-50">
      {/* Logo */}
      <div className="h-16 px-6 flex items-center border-b border-[var(--border-subtle)]">
        <Link href="/calls" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <Zap className="w-4 h-4 text-[var(--bg-base)]" />
          </div>
          <span className="font-semibold text-[var(--text-primary)] tracking-tight">RevPilot</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium',
                    isActive
                      ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center text-[var(--bg-base)] text-sm font-semibold">
            {getUserInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] transition-all duration-150"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
