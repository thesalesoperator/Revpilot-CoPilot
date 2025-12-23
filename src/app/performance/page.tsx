'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  ArrowRight,
  DollarSign,
  Target,
  Calendar,
  Zap,
  CheckCircle,
  Clock,
  Activity,
  PieChart,
  Briefcase,
  Brain,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Performance sections
const performanceSections = [
  {
    id: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Your sales overview and commission tracking',
    color: 'from-blue-500 to-cyan-500',
    features: ['Commission tracking', 'Activity feed', 'Quick stats', 'Recent deals'],
  },
  {
    id: 'projections',
    href: '/projections',
    icon: TrendingUp,
    title: 'Projections',
    description: 'Forecast your earnings and quota attainment',
    color: 'from-green-500 to-emerald-500',
    features: ['Quota forecast', 'Earnings projection', 'Trend analysis', 'Goal tracking'],
  },
  {
    id: 'metrics',
    href: '/metrics',
    icon: BarChart3,
    title: 'Metrics',
    description: 'Deep dive into your performance data',
    color: 'from-purple-500 to-pink-500',
    features: ['Activity metrics', 'Conversion rates', 'Pipeline analysis', 'Historical data'],
  },
]

// Coming soon features
const comingSoonSections = [
  {
    id: 'deals',
    href: '/deals',
    icon: Briefcase,
    title: 'Deal Rooms',
    description: 'Collaborative workspace for team selling',
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'analytics',
    href: '/analytics',
    icon: Brain,
    title: 'AI Analytics',
    description: 'Win/Loss analysis and AI insights',
    color: 'from-indigo-500 to-purple-500',
  },
]

export default function PerformancePage() {
  const { user } = useAuth()

  // Quick stats
  const quickStats = {
    mtdRevenue: 127500,
    quota: 200000,
    quotaPercent: 64,
    dealsWon: 8,
    avgDealSize: 15937,
    daysLeft: 12,
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Performance</h1>
          <p className="text-gray-400">Track your sales metrics and earnings</p>
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">This Month</h3>
            <span className="text-sm text-gray-400">{quickStats.daysLeft} days remaining</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-white">${(quickStats.mtdRevenue / 1000).toFixed(1)}k</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-[#00ffc1]" />
                <span className="text-sm text-gray-400">Quota</span>
              </div>
              <p className="text-2xl font-bold text-white">{quickStats.quotaPercent}%</p>
              <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2 mt-1">
                <div
                  className="bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] h-2 rounded-full"
                  style={{ width: `${quickStats.quotaPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Deals Won</span>
              </div>
              <p className="text-2xl font-bold text-white">{quickStats.dealsWon}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-400">Avg Deal Size</span>
              </div>
              <p className="text-2xl font-bold text-white">${(quickStats.avgDealSize / 1000).toFixed(1)}k</p>
            </div>
          </div>
        </div>

        {/* Performance Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {performanceSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="glass-card p-6 group hover:scale-[1.02] transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4`}
              >
                <section.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white group-hover:text-[#00ffc1] transition-colors">
                  {section.title}
                </h3>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-[#00ffc1] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-gray-400 text-sm mb-4">{section.description}</p>
              <div className="flex flex-wrap gap-2">
                {section.features.map((feature) => (
                  <span
                    key={feature}
                    className="px-2 py-1 rounded-full text-xs bg-[rgba(255,255,255,0.05)] text-gray-400"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-4">Coming Soon</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comingSoonSections.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className="glass-card p-4 opacity-70 hover:opacity-90 transition-opacity"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}
                  >
                    <section.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white">{section.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{section.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <LayoutDashboard className="w-6 h-6 text-blue-400" />
              <div>
                <p className="font-medium text-white">View Dashboard</p>
                <p className="text-xs text-gray-400">Check your daily progress</p>
              </div>
            </Link>
            <Link
              href="/projections"
              className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <TrendingUp className="w-6 h-6 text-green-400" />
              <div>
                <p className="font-medium text-white">Update Projections</p>
                <p className="text-xs text-gray-400">Forecast your month-end</p>
              </div>
            </Link>
            <Link
              href="/metrics"
              className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <BarChart3 className="w-6 h-6 text-purple-400" />
              <div>
                <p className="font-medium text-white">Analyze Metrics</p>
                <p className="text-xs text-gray-400">Deep dive into your data</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
