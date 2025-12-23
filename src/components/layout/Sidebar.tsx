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
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

// Simplified navigation - 6 main items
const navItems = [
  { href: '/calls', icon: Phone, label: 'Call Coaching' },
  { href: '/training', icon: Target, label: 'Training' },
  { href: '/compete', icon: Swords, label: 'Compete' },
  { href: '/community', icon: Users, label: 'Community' },
  { href: '/performance', icon: BarChart3, label: 'My Performance' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut, user } = useAuth()

  // Check if current path starts with nav item href (for hub pages)
  const isActiveRoute = (href: string) => {
    if (href === '/calls') return pathname === '/calls'
    if (href === '/settings') return pathname === '/settings'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-card rounded-none border-l-0 border-t-0 border-b-0 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(0,255,193,0.1)]">
        <Link href="/calls" className="flex items-center gap-3">
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
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-[rgba(0,255,193,0.1)] text-[#00ffc1] border border-[rgba(0,255,193,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-[rgba(0,255,193,0.1)]">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff0043] to-[#ffbe57] flex items-center justify-center text-white font-semibold">
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
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:text-[#ff6b8a] hover:bg-[rgba(255,0,67,0.1)] transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
