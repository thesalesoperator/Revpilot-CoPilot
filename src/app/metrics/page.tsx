'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Bell,
  BellOff,
  Calendar,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Hash,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { TrackedMetric, MetricEntry } from '@/types/database'

// Default metric templates
const DEFAULT_METRICS = [
  { name: 'Close Rate', type: 'percentage' },
  { name: 'Show Rate', type: 'percentage' },
  { name: 'Deals Closed', type: 'number' },
  { name: 'Cash Collected', type: 'currency' },
  { name: 'Total Deal Value', type: 'currency' },
]

// Chart colors for different metrics
const CHART_COLORS = [
  '#00ffc1',
  '#ff9855',
  '#ff6b8a',
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
]

interface MetricWithEntries extends TrackedMetric {
  entries?: MetricEntry[]
}

// Generate list of weeks for dropdown
const generateWeekOptions = (numWeeks: number) => {
  const weeks: { start: string; end: string; label: string }[] = []
  const now = new Date()
  const dayOfWeek = now.getDay()

  for (let i = 0; i < numWeeks; i++) {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek - (i * 7))
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const startStr = startOfWeek.toISOString().split('T')[0]
    const endStr = endOfWeek.toISOString().split('T')[0]

    const formatWeekDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const label = i === 0
      ? `This Week (${formatWeekDate(startOfWeek)} - ${formatWeekDate(endOfWeek)})`
      : i === 1
      ? `Last Week (${formatWeekDate(startOfWeek)} - ${formatWeekDate(endOfWeek)})`
      : `${formatWeekDate(startOfWeek)} - ${formatWeekDate(endOfWeek)}`

    weeks.push({ start: startStr, end: endStr, label })
  }

  return weeks
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricWithEntries[]>([])
  const [entries, setEntries] = useState<MetricEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddMetricModalOpen, setIsAddMetricModalOpen] = useState(false)
  const [isLogMetricsModalOpen, setIsLogMetricsModalOpen] = useState(false)
  const [weeksToShow, setWeeksToShow] = useState<string>('12')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (12 * 7)) // 12 weeks back
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  })

  const { user } = useAuth()
  const { showToast } = useToast()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      const [metricsRes, entriesRes] = await Promise.all([
        supabase
          .from('tracked_metrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('metric_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('period_start', dateRange.start)
          .lte('period_start', dateRange.end)
          .order('period_start', { ascending: true }),
      ])

      if (metricsRes.error) {
        console.error('Error fetching metrics:', metricsRes.error)
        showToast('error', `Error loading metrics: ${metricsRes.error.message}`)
      } else if (metricsRes.data) {
        setMetrics(metricsRes.data)
      }

      if (entriesRes.error) {
        console.error('Error fetching entries:', entriesRes.error)
      } else if (entriesRes.data) {
        setEntries(entriesRes.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase, dateRange, showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Update date range when weeks selection changes
  const handleWeeksChange = (weeks: string) => {
    setWeeksToShow(weeks)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (parseInt(weeks) * 7))
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    })
  }

  const handleAddMetric = async (metricName: string, metricType: string, reminderEnabled: boolean) => {
    if (!user) return

    try {
      const { error } = await supabase.from('tracked_metrics').insert({
        user_id: user.id,
        metric_name: metricName,
        metric_type: metricType,
        tracking_frequency: 'weekly',
        reminder_enabled: reminderEnabled,
      })

      if (error) {
        console.error('Error adding metric:', error)
        showToast('error', `Failed to add metric: ${error.message}`)
        return
      }

      showToast('success', 'Metric added successfully')
      fetchData()
      setIsAddMetricModalOpen(false)
    } catch (error) {
      console.error('Error adding metric:', error)
      showToast('error', 'Failed to add metric')
    }
  }

  const handleDeleteMetric = async (metricId: string) => {
    if (!confirm('Are you sure you want to delete this metric and all its data?')) return

    try {
      const { error } = await supabase.from('tracked_metrics').delete().eq('id', metricId)
      if (error) {
        console.error('Error deleting metric:', error)
        showToast('error', `Failed to delete metric: ${error.message}`)
        return
      }
      showToast('success', 'Metric deleted')
      fetchData()
    } catch (error) {
      console.error('Error deleting metric:', error)
      showToast('error', 'Failed to delete metric')
    }
  }

  const handleToggleReminder = async (metric: TrackedMetric) => {
    try {
      const { error } = await supabase
        .from('tracked_metrics')
        .update({ reminder_enabled: !metric.reminder_enabled })
        .eq('id', metric.id)

      if (error) {
        console.error('Error updating reminder:', error)
        showToast('error', `Failed to update reminder: ${error.message}`)
        return
      }

      showToast('success', `Reminders ${metric.reminder_enabled ? 'disabled' : 'enabled'}`)
      fetchData()
    } catch (error) {
      console.error('Error updating reminder:', error)
      showToast('error', 'Failed to update reminder setting')
    }
  }

  // Get current week date range
  const getCurrentWeek = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0],
    }
  }

  // Prepare chart data
  const getChartData = () => {
    const weekMap = new Map<string, Record<string, number>>()

    entries.forEach((entry) => {
      const weekKey = entry.period_start
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { week: new Date(weekKey).getTime() })
      }
      const metric = metrics.find((m) => m.id === entry.metric_id)
      if (metric) {
        weekMap.get(weekKey)![metric.metric_name] = entry.value
      }
    })

    return Array.from(weekMap.values()).sort((a, b) => a.week - b.week).map((data) => ({
      ...data,
      weekLabel: formatDate(new Date(data.week).toISOString()),
    }))
  }

  const formatValue = (value: number, type: string) => {
    if (type === 'currency') return formatCurrency(value)
    if (type === 'percentage') return `${value}%`
    return value.toString()
  }

  const getMetricIcon = (type: string) => {
    if (type === 'currency') return DollarSign
    if (type === 'percentage') return Percent
    return Hash
  }

  // Calculate month-over-month comparison for a metric
  const getMonthComparison = (metricId: string) => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const metricEntries = entries.filter((e) => e.metric_id === metricId)

    const thisMonthEntries = metricEntries.filter((e) => {
      const date = new Date(e.period_start)
      return date >= thisMonthStart
    })

    const lastMonthEntries = metricEntries.filter((e) => {
      const date = new Date(e.period_start)
      return date >= lastMonthStart && date <= lastMonthEnd
    })

    const thisMonthAvg = thisMonthEntries.length > 0
      ? thisMonthEntries.reduce((sum, e) => sum + e.value, 0) / thisMonthEntries.length
      : null

    const lastMonthAvg = lastMonthEntries.length > 0
      ? lastMonthEntries.reduce((sum, e) => sum + e.value, 0) / lastMonthEntries.length
      : null

    let percentChange: number | null = null
    if (thisMonthAvg !== null && lastMonthAvg !== null && lastMonthAvg !== 0) {
      percentChange = ((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100
    }

    return {
      thisMonth: thisMonthAvg,
      lastMonth: lastMonthAvg,
      percentChange,
      thisMonthLabel: now.toLocaleDateString('en-US', { month: 'short' }),
      lastMonthLabel: new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
    }
  }

  // Group metrics by type for separate charts
  const percentageMetrics = metrics.filter((m) => m.metric_type === 'percentage')
  const currencyMetrics = metrics.filter((m) => m.metric_type === 'currency')
  const numberMetrics = metrics.filter((m) => m.metric_type === 'number')

  // Get chart data for specific metric types
  const getChartDataForMetrics = (metricList: TrackedMetric[]) => {
    const weekMap = new Map<string, Record<string, number>>()

    entries.forEach((entry) => {
      const metric = metricList.find((m) => m.id === entry.metric_id)
      if (!metric) return

      const weekKey = entry.period_start
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { week: new Date(weekKey).getTime() })
      }
      weekMap.get(weekKey)![metric.metric_name] = entry.value
    })

    return Array.from(weekMap.values()).sort((a, b) => a.week - b.week).map((data) => ({
      ...data,
      weekLabel: formatDate(new Date(data.week).toISOString()),
    }))
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    )
  }

  const chartData = getChartData()

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Metrics Tracking</h1>
            <p className="text-gray-400">Track your key performance metrics weekly</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLogMetricsModalOpen(true)}
              className="btn-primary flex items-center gap-2"
              disabled={metrics.length === 0}
            >
              <Calendar className="w-5 h-5" />
              Log This Week
            </button>
            <button
              onClick={() => setIsAddMetricModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Metric
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-[#00ffc1]" />
            <span className="text-sm text-gray-400">Show:</span>
            <select
              value={weeksToShow}
              onChange={(e) => handleWeeksChange(e.target.value)}
              className="select-field py-2 px-3 w-auto"
            >
              <option value="4">Last 4 weeks</option>
              <option value="8">Last 8 weeks</option>
              <option value="12">Last 12 weeks</option>
              <option value="26">Last 6 months</option>
              <option value="52">Last year</option>
            </select>
          </div>
        </div>

        {/* Tracked Metrics List */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold gradient-text mb-4">Your Metrics</h2>

          {metrics.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No metrics yet</h3>
              <p className="text-gray-400 mb-6">Add metrics to start tracking your performance</p>
              <button
                onClick={() => setIsAddMetricModalOpen(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Your First Metric
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((metric, index) => {
                const Icon = getMetricIcon(metric.metric_type)
                const latestEntry = entries
                  .filter((e) => e.metric_id === metric.id)
                  .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime())[0]
                const comparison = getMonthComparison(metric.id)

                return (
                  <div
                    key={metric.id}
                    className="bg-[rgba(0,0,0,0.2)] rounded-xl p-4 border border-[rgba(255,255,255,0.05)]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20` }}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{metric.metric_name}</h3>
                          <p className="text-xs text-gray-500 capitalize">{metric.tracking_frequency}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleReminder(metric)}
                          className={`p-2 rounded-lg transition-colors ${
                            metric.reminder_enabled
                              ? 'text-[#00ffc1] hover:bg-[rgba(0,255,193,0.1)]'
                              : 'text-gray-500 hover:bg-[rgba(255,255,255,0.05)]'
                          }`}
                          title={metric.reminder_enabled ? 'Disable reminders' : 'Enable reminders'}
                        >
                          {metric.reminder_enabled ? (
                            <Bell className="w-4 h-4" />
                          ) : (
                            <BellOff className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteMetric(metric.id)}
                          className="p-2 rounded-lg text-gray-500 hover:text-[#ff6b8a] hover:bg-[rgba(255,0,67,0.1)] transition-colors"
                          title="Delete metric"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-bold" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                        {latestEntry ? formatValue(latestEntry.value, metric.metric_type) : '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {latestEntry ? `Week of ${formatDate(latestEntry.period_start)}` : 'No data yet'}
                      </p>
                    </div>

                    {/* Month-over-Month Comparison */}
                    {(comparison.thisMonth !== null || comparison.lastMonth !== null) && (
                      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">Month Comparison</span>
                          {comparison.percentChange !== null && (
                            <div className={`flex items-center gap-1 text-xs font-medium ${
                              comparison.percentChange > 0 ? 'text-[#00ffc1]' : comparison.percentChange < 0 ? 'text-[#ff6b8a]' : 'text-gray-400'
                            }`}>
                              {comparison.percentChange > 0 ? (
                                <ArrowUp className="w-3 h-3" />
                              ) : comparison.percentChange < 0 ? (
                                <ArrowDown className="w-3 h-3" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                              {Math.abs(comparison.percentChange).toFixed(1)}%
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {/* Last Month Bar */}
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">{comparison.lastMonthLabel}</div>
                            <div className="h-8 bg-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden relative">
                              {comparison.lastMonth !== null && comparison.thisMonth !== null && (
                                <div
                                  className="h-full bg-gray-600 rounded-lg transition-all"
                                  style={{
                                    width: `${Math.min(100, (comparison.lastMonth / Math.max(comparison.lastMonth, comparison.thisMonth)) * 100)}%`,
                                  }}
                                />
                              )}
                              <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                                {comparison.lastMonth !== null ? formatValue(comparison.lastMonth, metric.metric_type) : '—'}
                              </span>
                            </div>
                          </div>
                          {/* This Month Bar */}
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">{comparison.thisMonthLabel}</div>
                            <div className="h-8 bg-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden relative">
                              {comparison.thisMonth !== null && comparison.lastMonth !== null && (
                                <div
                                  className="h-full rounded-lg transition-all"
                                  style={{
                                    width: `${Math.min(100, (comparison.thisMonth / Math.max(comparison.lastMonth, comparison.thisMonth)) * 100)}%`,
                                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                                  }}
                                />
                              )}
                              {comparison.thisMonth !== null && comparison.lastMonth === null && (
                                <div
                                  className="h-full rounded-lg transition-all w-full"
                                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                />
                              )}
                              <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                                {comparison.thisMonth !== null ? formatValue(comparison.thisMonth, metric.metric_type) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Percentage Metrics Chart */}
        {percentageMetrics.length > 0 && getChartDataForMetrics(percentageMetrics).length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Percent className="w-5 h-5 text-[#00ffc1]" />
              <h2 className="text-xl font-semibold gradient-text">Rate Metrics Over Time</h2>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartDataForMetrics(percentageMetrics)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="weekLabel"
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 16, 46, 0.95)',
                      border: '1px solid rgba(0, 255, 193, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                    }}
                    formatter={(value) => [`${value ?? 0}%`, '']}
                  />
                  <Legend />
                  {percentageMetrics.map((metric) => {
                    const originalIndex = metrics.findIndex((m) => m.id === metric.id)
                    return (
                      <Line
                        key={metric.id}
                        type="monotone"
                        dataKey={metric.metric_name}
                        stroke={CHART_COLORS[originalIndex % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS[originalIndex % CHART_COLORS.length], strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: CHART_COLORS[originalIndex % CHART_COLORS.length], strokeWidth: 2 }}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Currency Metrics Chart */}
        {currencyMetrics.length > 0 && getChartDataForMetrics(currencyMetrics).length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-5 h-5 text-[#ff9855]" />
              <h2 className="text-xl font-semibold gradient-text">Financial Metrics Over Time</h2>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartDataForMetrics(currencyMetrics)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="weekLabel"
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 16, 46, 0.95)',
                      border: '1px solid rgba(0, 255, 193, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                    }}
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), '']}
                  />
                  <Legend />
                  {currencyMetrics.map((metric) => {
                    const originalIndex = metrics.findIndex((m) => m.id === metric.id)
                    return (
                      <Line
                        key={metric.id}
                        type="monotone"
                        dataKey={metric.metric_name}
                        stroke={CHART_COLORS[originalIndex % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS[originalIndex % CHART_COLORS.length], strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: CHART_COLORS[originalIndex % CHART_COLORS.length], strokeWidth: 2 }}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Number Metrics Chart */}
        {numberMetrics.length > 0 && getChartDataForMetrics(numberMetrics).length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Hash className="w-5 h-5 text-[#a78bfa]" />
              <h2 className="text-xl font-semibold gradient-text">Count Metrics Over Time</h2>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartDataForMetrics(numberMetrics)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="weekLabel"
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 16, 46, 0.95)',
                      border: '1px solid rgba(0, 255, 193, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                    }}
                    formatter={(value) => [Math.round(Number(value ?? 0)), '']}
                  />
                  <Legend />
                  {numberMetrics.map((metric) => {
                    const originalIndex = metrics.findIndex((m) => m.id === metric.id)
                    return (
                      <Line
                        key={metric.id}
                        type="monotone"
                        dataKey={metric.metric_name}
                        stroke={CHART_COLORS[originalIndex % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS[originalIndex % CHART_COLORS.length], strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: CHART_COLORS[originalIndex % CHART_COLORS.length], strokeWidth: 2 }}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Empty chart state */}
        {metrics.length > 0 && chartData.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No data in selected range</h3>
            <p className="text-gray-400 mb-6">Log your metrics to see them visualized here</p>
            <button
              onClick={() => setIsLogMetricsModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Log This Week&apos;s Metrics
            </button>
          </div>
        )}
      </div>

      {/* Add Metric Modal */}
      <AddMetricModal
        isOpen={isAddMetricModalOpen}
        onClose={() => setIsAddMetricModalOpen(false)}
        onAdd={handleAddMetric}
        existingMetrics={metrics.map((m) => m.metric_name)}
      />

      {/* Log Metrics Modal */}
      <LogMetricsModal
        isOpen={isLogMetricsModalOpen}
        onClose={() => setIsLogMetricsModalOpen(false)}
        metrics={metrics}
        userId={user?.id || ''}
        currentWeek={getCurrentWeek()}
        onSuccess={() => {
          fetchData()
          setIsLogMetricsModalOpen(false)
        }}
      />
    </DashboardLayout>
  )
}

// Add Metric Modal
interface AddMetricModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, type: string, reminder: boolean) => void
  existingMetrics: string[]
}

function AddMetricModal({ isOpen, onClose, onAdd, existingMetrics }: AddMetricModalProps) {
  const [selectedMetric, setSelectedMetric] = useState('')
  const [customName, setCustomName] = useState('')
  const [metricType, setMetricType] = useState('number')
  const [reminderEnabled, setReminderEnabled] = useState(true)

  const availableDefaults = DEFAULT_METRICS.filter(
    (m) => !existingMetrics.includes(m.name)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = selectedMetric === 'custom' ? customName : selectedMetric
    const type = selectedMetric === 'custom'
      ? metricType
      : DEFAULT_METRICS.find((m) => m.name === selectedMetric)?.type || 'number'
    onAdd(name, type, reminderEnabled)
    setSelectedMetric('')
    setCustomName('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Metric to Track">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Metric</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="select-field"
            required
          >
            <option value="">Choose a metric...</option>
            {availableDefaults.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
            <option value="custom">+ Custom Metric</option>
          </select>
        </div>

        {selectedMetric === 'custom' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Custom Metric Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="input-field"
                placeholder="e.g., Calls Made"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Metric Type</label>
              <select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
                className="select-field"
              >
                <option value="number">Number (e.g., 42)</option>
                <option value="percentage">Percentage (e.g., 75%)</option>
                <option value="currency">Currency (e.g., $5,000)</option>
              </select>
            </div>
          </>
        )}

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="reminder"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#00ffc1] focus:ring-[#00ffc1]"
          />
          <label htmlFor="reminder" className="text-sm text-gray-300">
            Remind me to log this metric weekly
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedMetric || (selectedMetric === 'custom' && !customName)}
            className="btn-primary"
          >
            Add Metric
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Log Metrics Modal
interface LogMetricsModalProps {
  isOpen: boolean
  onClose: () => void
  metrics: TrackedMetric[]
  userId: string
  currentWeek: { start: string; end: string }
  onSuccess: () => void
}

function LogMetricsModal({
  isOpen,
  onClose,
  metrics,
  userId,
  currentWeek,
  onSuccess,
}: LogMetricsModalProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const weekOptions = generateWeekOptions(12) // Show last 12 weeks

  const { showToast } = useToast()
  const supabase = createClient()

  const selectedWeek = weekOptions[selectedWeekIndex]
  const weekStart = selectedWeek?.start || currentWeek.start
  const weekEnd = selectedWeek?.end || currentWeek.end

  useEffect(() => {
    if (isOpen) {
      setSelectedWeekIndex(0) // Reset to current week
      setValues({})
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const entriesToInsert = metrics
        .filter((m) => values[m.id] && values[m.id] !== '')
        .map((m) => ({
          user_id: userId,
          metric_id: m.id,
          value: parseFloat(values[m.id]),
          period_start: weekStart,
          period_end: weekEnd,
        }))

      if (entriesToInsert.length === 0) {
        showToast('error', 'Please enter at least one metric value')
        setLoading(false)
        return
      }

      // Delete existing entries for this week and metrics
      for (const entry of entriesToInsert) {
        const { error: deleteError } = await supabase
          .from('metric_entries')
          .delete()
          .eq('metric_id', entry.metric_id)
          .eq('period_start', entry.period_start)

        if (deleteError) {
          console.error('Error deleting existing entry:', deleteError)
        }
      }

      // Insert new entries
      const { error: insertError } = await supabase.from('metric_entries').insert(entriesToInsert)

      if (insertError) {
        console.error('Error inserting entries:', insertError)
        showToast('error', `Failed to log metrics: ${insertError.message}`)
        return
      }

      showToast('success', 'Metrics logged successfully')
      onSuccess()
    } catch (error) {
      console.error('Error logging metrics:', error)
      showToast('error', 'Failed to log metrics')
    } finally {
      setLoading(false)
    }
  }

  const formatPlaceholder = (type: string) => {
    if (type === 'currency') return '5000'
    if (type === 'percentage') return '75'
    return '42'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Weekly Metrics" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Week Selector */}
        <div className="bg-[rgba(0,255,193,0.05)] border border-[rgba(0,255,193,0.2)] rounded-xl p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-[#00ffc1]" />
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm text-gray-400">Week:</span>
              <select
                value={selectedWeekIndex}
                onChange={(e) => setSelectedWeekIndex(parseInt(e.target.value))}
                className="select-field py-2 px-3 flex-1"
              >
                {weekOptions.map((week, index) => (
                  <option key={week.start} value={index}>
                    {week.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Metric Inputs */}
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={metric.id} className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20` }}
              >
                {metric.metric_type === 'currency' ? (
                  <DollarSign className="w-5 h-5" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }} />
                ) : metric.metric_type === 'percentage' ? (
                  <Percent className="w-5 h-5" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }} />
                ) : (
                  <Hash className="w-5 h-5" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }} />
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {metric.metric_name}
                </label>
                <div className="relative">
                  {metric.metric_type === 'currency' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  )}
                  <input
                    type="number"
                    value={values[metric.id] || ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [metric.id]: e.target.value }))}
                    className={`input-field ${metric.metric_type === 'currency' ? 'pl-7' : ''} ${
                      metric.metric_type === 'percentage' ? 'pr-8' : ''
                    }`}
                    placeholder={formatPlaceholder(metric.metric_type)}
                    step={metric.metric_type === 'percentage' ? '0.1' : '0.01'}
                  />
                  {metric.metric_type === 'percentage' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#00102e] border-t-transparent rounded-full animate-spin" />
            ) : (
              'Log Metrics'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
