'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export default function MetricsReminder() {
  const [overdueMetrics, setOverdueMetrics] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkOverdueMetrics = async () => {
      if (!user) return

      // Check if reminder was dismissed this session
      const dismissedKey = `metrics_reminder_dismissed_${new Date().toISOString().split('T')[0]}`
      if (sessionStorage.getItem(dismissedKey)) {
        setDismissed(true)
        return
      }

      try {
        // Get metrics with reminders enabled
        const { data: metrics } = await supabase
          .from('tracked_metrics')
          .select('id, metric_name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('reminder_enabled', true)

        if (!metrics || metrics.length === 0) return

        // Get current week bounds
        const now = new Date()
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - dayOfWeek)
        const weekStart = startOfWeek.toISOString().split('T')[0]

        // Check which metrics don't have entries for this week
        const overdue: string[] = []

        for (const metric of metrics) {
          const { data: entries } = await supabase
            .from('metric_entries')
            .select('id')
            .eq('metric_id', metric.id)
            .eq('period_start', weekStart)
            .limit(1)

          if (!entries || entries.length === 0) {
            overdue.push(metric.metric_name)
          }
        }

        setOverdueMetrics(overdue)
      } catch (error) {
        console.error('Error checking overdue metrics:', error)
      }
    }

    checkOverdueMetrics()
  }, [user, supabase])

  const handleDismiss = () => {
    const dismissedKey = `metrics_reminder_dismissed_${new Date().toISOString().split('T')[0]}`
    sessionStorage.setItem(dismissedKey, 'true')
    setDismissed(true)
  }

  const handleLogMetrics = () => {
    router.push('/metrics')
  }

  if (dismissed || overdueMetrics.length === 0) return null

  return (
    <div className="mb-6 bg-gradient-to-r from-[rgba(255,152,85,0.15)] to-[rgba(255,190,87,0.1)] border border-[rgba(255,190,87,0.3)] rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-[rgba(255,190,87,0.2)] flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-[#ffbe57]" />
        </div>
        <div className="flex-1">
          <h3 className="text-[#ffbe57] font-semibold mb-1">Metrics Reminder</h3>
          <p className="text-gray-300 text-sm mb-3">
            You haven&apos;t logged this week&apos;s data for:{' '}
            <span className="text-white font-medium">{overdueMetrics.join(', ')}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogMetrics}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Log Metrics Now
            </button>
            <button
              onClick={handleDismiss}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Remind me later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
