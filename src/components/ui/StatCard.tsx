'use client'

import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}: StatCardProps) {
  const iconColors = {
    default: 'text-[#5eead4]',
    success: 'text-[#5eead4]',
    warning: 'text-[#ffbe57]',
    danger: 'text-[#ff6b8a]',
  }

  const bgColors = {
    default: 'bg-[rgba(94,234,212,0.1)]',
    success: 'bg-[rgba(94,234,212,0.1)]',
    warning: 'bg-[rgba(255,190,87,0.1)]',
    danger: 'bg-[rgba(255,0,67,0.1)]',
  }

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${bgColors[variant]}`}>
          <Icon className={`w-6 h-6 ${iconColors[variant]}`} />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
