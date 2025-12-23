'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Phone,
  Users,
  Clock,
  Brain,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Win/Loss data
const winLossData = {
  totalDeals: 48,
  won: 32,
  lost: 16,
  winRate: 67,
  avgDealSize: 45000,
  avgSalesCycle: 32,
  trends: {
    winRate: +5,
    dealSize: +12,
    salesCycle: -3,
  },
}

// Loss reasons
const lossReasons = [
  { reason: 'Price/Budget', count: 6, percentage: 37.5, trend: 'up' },
  { reason: 'Competitor', count: 4, percentage: 25, trend: 'down' },
  { reason: 'No Decision', count: 3, percentage: 18.75, trend: 'stable' },
  { reason: 'Timing', count: 2, percentage: 12.5, trend: 'up' },
  { reason: 'Other', count: 1, percentage: 6.25, trend: 'stable' },
]

// Win factors
const winFactors = [
  { factor: 'Champion Engaged', correlation: 89, deals: 28 },
  { factor: 'Multi-threaded (3+ contacts)', correlation: 82, deals: 26 },
  { factor: 'Executive Sponsor', correlation: 78, deals: 24 },
  { factor: 'Technical Validation', correlation: 71, deals: 22 },
  { factor: 'ROI Quantified', correlation: 68, deals: 21 },
]

// Recent deals for analysis
const recentDeals = [
  {
    id: '1',
    name: 'Acme Corp',
    value: 125000,
    result: 'won',
    cycle: 28,
    contacts: 4,
    keyFactor: 'Strong champion, executive buy-in',
  },
  {
    id: '2',
    name: 'TechStart',
    value: 35000,
    result: 'lost',
    cycle: 45,
    contacts: 1,
    keyFactor: 'Single-threaded, lost to competitor',
  },
  {
    id: '3',
    name: 'GlobalBank',
    value: 280000,
    result: 'won',
    cycle: 62,
    contacts: 7,
    keyFactor: 'Multiple stakeholders, thorough evaluation',
  },
  {
    id: '4',
    name: 'RetailCo',
    value: 48000,
    result: 'lost',
    cycle: 35,
    contacts: 2,
    keyFactor: 'Budget constraints, timing issue',
  },
  {
    id: '5',
    name: 'HealthTech',
    value: 92000,
    result: 'won',
    cycle: 21,
    contacts: 3,
    keyFactor: 'Urgent need, fast decision maker',
  },
]

// Quota forecast data
const quotaForecast = {
  target: 500000,
  achieved: 285000,
  pipeline: 420000,
  committed: 180000,
  bestCase: 380000,
  forecast: 465000,
  percentToTarget: 57,
  daysRemaining: 38,
}

// Monthly performance
const monthlyPerformance = [
  { month: 'Jul', won: 45000, target: 40000 },
  { month: 'Aug', won: 52000, target: 45000 },
  { month: 'Sep', won: 38000, target: 45000 },
  { month: 'Oct', won: 61000, target: 50000 },
  { month: 'Nov', won: 48000, target: 50000 },
  { month: 'Dec', won: 41000, target: 45000 },
]

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'winloss' | 'forecast' | 'patterns'>('winloss')
  const [timeRange, setTimeRange] = useState('90d')

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics & AI Insights</h1>
            <p className="text-gray-400">Win/Loss analysis and quota forecasting</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#00ffc1]"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="180d">Last 6 months</option>
              <option value="365d">Last year</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'winloss', label: 'Win/Loss Analysis', icon: PieChart },
            { id: 'forecast', label: 'Quota Forecast', icon: Target },
            { id: 'patterns', label: 'AI Patterns', icon: Brain },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-[rgba(0,255,193,0.2)] text-[#00ffc1] border border-[rgba(0,255,193,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'winloss' && (
          <>
            {/* Win/Loss Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Win Rate</span>
                  <span className={`flex items-center gap-1 text-sm ${
                    winLossData.trends.winRate > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {winLossData.trends.winRate > 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {Math.abs(winLossData.trends.winRate)}%
                  </span>
                </div>
                <p className="text-3xl font-bold text-[#00ffc1]">{winLossData.winRate}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  {winLossData.won} won / {winLossData.lost} lost
                </p>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Avg Deal Size</span>
                  <span className="flex items-center gap-1 text-sm text-green-400">
                    <ArrowUpRight className="w-4 h-4" />
                    {winLossData.trends.dealSize}%
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">
                  ${(winLossData.avgDealSize / 1000).toFixed(0)}k
                </p>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Avg Sales Cycle</span>
                  <span className="flex items-center gap-1 text-sm text-green-400">
                    <ArrowDownRight className="w-4 h-4" />
                    {Math.abs(winLossData.trends.salesCycle)} days
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">{winLossData.avgSalesCycle} days</p>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Deals</span>
                </div>
                <p className="text-3xl font-bold text-white">{winLossData.totalDeals}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(winLossData.won / winLossData.totalDeals) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Loss Reasons */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Loss Reasons</h3>
                <div className="space-y-4">
                  {lossReasons.map((reason) => (
                    <div key={reason.reason} className="flex items-center gap-4">
                      <div className="w-32 text-sm text-gray-400">{reason.reason}</div>
                      <div className="flex-1">
                        <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all"
                            style={{ width: `${reason.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm text-white font-medium">
                        {reason.count}
                      </div>
                      <div className="w-6">
                        {reason.trend === 'up' && (
                          <TrendingUp className="w-4 h-4 text-red-400" />
                        )}
                        {reason.trend === 'down' && (
                          <TrendingDown className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Win Factors */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Win Success Factors</h3>
                <div className="space-y-4">
                  {winFactors.map((factor) => (
                    <div key={factor.factor} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-400">{factor.factor}</span>
                          <span className="text-sm text-[#00ffc1] font-medium">
                            {factor.correlation}% correlation
                          </span>
                        </div>
                        <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] rounded-full"
                            style={{ width: `${factor.correlation}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Deals Analysis */}
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
                <h3 className="text-lg font-semibold text-white">Recent Deals Analysis</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <th className="text-left p-4 text-gray-400 font-medium">Deal</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Value</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Result</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Cycle</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Contacts</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Key Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeals.map((deal) => (
                    <tr
                      key={deal.id}
                      className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <td className="p-4 text-white font-medium">{deal.name}</td>
                      <td className="p-4 text-right text-green-400">
                        ${(deal.value / 1000).toFixed(0)}k
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            deal.result === 'won'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {deal.result === 'won' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {deal.result}
                        </span>
                      </td>
                      <td className="p-4 text-center text-gray-400">{deal.cycle} days</td>
                      <td className="p-4 text-center text-gray-400">{deal.contacts}</td>
                      <td className="p-4 text-sm text-gray-400">{deal.keyFactor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'forecast' && (
          <>
            {/* Quota Progress */}
            <div className="glass-card p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">Q4 Quota Progress</h3>
                  <p className="text-gray-400">{quotaForecast.daysRemaining} days remaining</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">AI Forecast</p>
                  <p className="text-3xl font-bold text-[#00ffc1]">
                    ${(quotaForecast.forecast / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-8 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden mb-4">
                <div
                  className="absolute h-full bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] rounded-full"
                  style={{ width: `${quotaForecast.percentToTarget}%` }}
                />
                <div
                  className="absolute h-full bg-[rgba(0,255,193,0.3)] rounded-full"
                  style={{ width: `${(quotaForecast.forecast / quotaForecast.target) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {quotaForecast.percentToTarget}% of quota
                  </span>
                </div>
              </div>

              {/* Quota Breakdown */}
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-4 bg-[rgba(255,255,255,0.02)] rounded-xl">
                  <p className="text-2xl font-bold text-white">
                    ${(quotaForecast.target / 1000).toFixed(0)}k
                  </p>
                  <p className="text-sm text-gray-400">Target</p>
                </div>
                <div className="text-center p-4 bg-[rgba(255,255,255,0.02)] rounded-xl">
                  <p className="text-2xl font-bold text-green-400">
                    ${(quotaForecast.achieved / 1000).toFixed(0)}k
                  </p>
                  <p className="text-sm text-gray-400">Achieved</p>
                </div>
                <div className="text-center p-4 bg-[rgba(255,255,255,0.02)] rounded-xl">
                  <p className="text-2xl font-bold text-blue-400">
                    ${(quotaForecast.committed / 1000).toFixed(0)}k
                  </p>
                  <p className="text-sm text-gray-400">Committed</p>
                </div>
                <div className="text-center p-4 bg-[rgba(255,255,255,0.02)] rounded-xl">
                  <p className="text-2xl font-bold text-yellow-400">
                    ${(quotaForecast.bestCase / 1000).toFixed(0)}k
                  </p>
                  <p className="text-sm text-gray-400">Best Case</p>
                </div>
                <div className="text-center p-4 bg-[rgba(255,255,255,0.02)] rounded-xl">
                  <p className="text-2xl font-bold text-gray-400">
                    ${(quotaForecast.pipeline / 1000).toFixed(0)}k
                  </p>
                  <p className="text-sm text-gray-400">Pipeline</p>
                </div>
              </div>
            </div>

            {/* AI Forecast Insight */}
            <div className="glass-card p-6 mb-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-2">AI Forecast Analysis</h4>
                  <p className="text-gray-300 mb-4">
                    Based on your current pipeline velocity and historical win rates, you&apos;re projected to hit{' '}
                    <span className="text-[#00ffc1] font-semibold">93%</span> of quota. To hit 100%, you need to:
                  </p>
                  <ul className="space-y-2 text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                      Close the GlobalBank deal ($280k) - 60% probability
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      Accelerate TechCorp evaluation - stalled for 2 weeks
                    </li>
                    <li className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      Add 2 more qualified opportunities to pipeline
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Monthly Performance Chart Placeholder */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Monthly Performance</h3>
              <div className="flex items-end justify-between gap-4 h-48">
                {monthlyPerformance.map((month) => {
                  const maxValue = Math.max(...monthlyPerformance.map((m) => Math.max(m.won, m.target)))
                  const wonHeight = (month.won / maxValue) * 100
                  const targetHeight = (month.target / maxValue) * 100
                  const hitTarget = month.won >= month.target

                  return (
                    <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex items-end justify-center gap-1 h-40">
                        <div
                          className={`w-6 rounded-t transition-all ${
                            hitTarget ? 'bg-green-500' : 'bg-red-400'
                          }`}
                          style={{ height: `${wonHeight}%` }}
                        />
                        <div
                          className="w-6 rounded-t bg-[rgba(255,255,255,0.1)]"
                          style={{ height: `${targetHeight}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">{month.month}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="text-sm text-gray-400">Achieved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[rgba(255,255,255,0.1)]" />
                  <span className="text-sm text-gray-400">Target</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'patterns' && (
          <div className="space-y-8">
            {/* AI Detected Patterns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <h4 className="font-semibold text-white">Winning Patterns</h4>
                </div>
                <ul className="space-y-3">
                  {[
                    'Deals with 3+ contacts win 82% more often',
                    'First call within 24h of inquiry = 45% higher win rate',
                    'Demos scheduled within 1 week convert 3x better',
                    'Proposals with ROI calculator close 28% faster',
                  ].map((pattern, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <h4 className="font-semibold text-white">Loss Indicators</h4>
                </div>
                <ul className="space-y-3">
                  {[
                    'Single-threaded deals lose 65% of the time',
                    'No activity for 14+ days = 78% loss rate',
                    'Competitor mentioned = 40% lower win rate',
                    'Budget objection late in cycle = 55% loss',
                  ].map((pattern, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-400">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendations */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <h4 className="font-semibold text-white">AI Recommendations for You</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Multi-thread Your Deals',
                    description: 'Your average contacts per deal is 2.1 vs top performers at 4.2. Add more stakeholders.',
                    impact: '+35% win rate',
                  },
                  {
                    title: 'Faster Discovery Calls',
                    description: 'Your avg time to first call is 3.2 days. Aim for under 24 hours.',
                    impact: '+22% conversion',
                  },
                  {
                    title: 'Quantify ROI Earlier',
                    description: 'Only 40% of your deals have quantified ROI. Top closers do this 85% of the time.',
                    impact: '+28% close rate',
                  },
                ].map((rec, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(0,255,193,0.3)] transition-colors cursor-pointer"
                  >
                    <h5 className="font-medium text-white mb-2">{rec.title}</h5>
                    <p className="text-sm text-gray-400 mb-3">{rec.description}</p>
                    <span className="text-sm font-semibold text-[#00ffc1]">{rec.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
