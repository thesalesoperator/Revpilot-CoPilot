'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  Calculator,
  BookOpen,
  CheckSquare,
  Phone,
  Flame,
  Users,
  Trophy,
  Swords,
  Map,
  Shield,
  Briefcase,
  UserCircle,
  Brain,
  GraduationCap,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

// Navigation sections
const navSections = [
  {
    title: 'Main',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/projections', icon: TrendingUp, label: 'Projections' },
      { href: '/metrics', icon: BarChart3, label: 'Metrics' },
    ],
  },
  {
    title: 'Sales Tools',
    items: [
      { href: '/calls', icon: Phone, label: 'Call Review' },
      { href: '/objections', icon: Shield, label: 'Objection Library' },
    ],
  },
  {
    title: 'Training',
    items: [
      { href: '/practice', icon: Flame, label: 'Practice Arena' },
      { href: '/personas', icon: UserCircle, label: 'AI Personas' },
      { href: '/skills', icon: TrendingUp, label: 'Skill Trees' },
      { href: '/mentorship', icon: GraduationCap, label: 'Mentorship' },
    ],
  },
  {
    title: 'Compete',
    items: [
      { href: '/battle', icon: Swords, label: 'Battle Mode' },
      { href: '/territory-wars', icon: Map, label: 'Territory Wars' },
      { href: '/achievements', icon: Trophy, label: 'Achievements' },
    ],
  },
  {
    title: 'Social',
    items: [
      { href: '/community', icon: Users, label: 'Community' },
    ],
  },
  {
    title: 'Personal',
    items: [
      { href: '/journal', icon: BookOpen, label: 'Journal' },
      { href: '/habits', icon: CheckSquare, label: 'Habits' },
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
  {
    title: 'Coming Soon',
    items: [
      { href: '/deals', icon: Briefcase, label: 'Deal Rooms' },
      { href: '/analytics', icon: Brain, label: 'AI Analytics' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut, user } = useAuth()
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(title)) {
        newSet.delete(title)
      } else {
        newSet.add(title)
      }
      return newSet
    })
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-card rounded-none border-l-0 border-t-0 border-b-0 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(0,255,193,0.1)]">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ffc1] to-[#00d9a6] flex items-center justify-center">
            <Calculator className="w-6 h-6 text-[#00102e]" />
          </div>
          <div>
            <h1 className="font-bold text-lg gradient-text">RevPilot</h1>
            <p className="text-xs text-gray-500">Sales Platform</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {navSections.map((section) => {
          const isCollapsed = collapsedSections.has(section.title)
          const hasActiveItem = section.items.some((item) => pathname === item.href)

          return (
            <div key={section.title} className="mb-2">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
              >
                <span>{section.title}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {!isCollapsed && (
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                            isActive
                              ? 'bg-[rgba(0,255,193,0.1)] text-[#00ffc1] border border-[rgba(0,255,193,0.3)]'
                              : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-[rgba(0,255,193,0.1)]">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff0043] to-[#ffbe57] flex items-center justify-center text-white font-semibold text-sm">
            {user?.email?.[0]?.toUpperCase() || 'U'}
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
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-400 hover:text-[#ff6b8a] hover:bg-[rgba(255,0,67,0.1)] transition-all duration-200 text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
