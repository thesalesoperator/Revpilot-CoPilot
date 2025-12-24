'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import {
  Target,
  UserCircle,
  TrendingUp,
  Shield,
  GraduationCap,
  ArrowRight,
  Clock,
  Play,
  ChevronRight,
  Phone,
  BookOpen,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

// Training sections
const trainingSections = [
  {
    id: 'practice',
    href: '/practice',
    icon: Target,
    title: 'Practice Sessions',
    description: 'AI-powered sales conversations with realistic scenarios',
    sessions: 8,
    completed: 5,
    featured: true,
  },
  {
    id: 'personas',
    href: '/personas',
    icon: UserCircle,
    title: 'Buyer Personas',
    description: 'Train with different customer profiles',
    available: 12,
    completed: 3,
  },
  {
    id: 'skills',
    href: '/skills',
    icon: TrendingUp,
    title: 'Skill Development',
    description: 'Structured learning paths for core competencies',
    modules: 60,
    completed: 18,
  },
  {
    id: 'objections',
    href: '/objections',
    icon: Shield,
    title: 'Objection Handling',
    description: 'Library of responses to common objections',
    isReference: true,
  },
  {
    id: 'mentorship',
    href: '/mentorship',
    icon: GraduationCap,
    title: 'Mentorship',
    description: 'Connect with experienced professionals',
    isPremium: true,
  },
]

// Daily focus areas
const dailyFocus = [
  { id: 1, title: 'Complete 3 practice calls', progress: 1, total: 3 },
  { id: 2, title: 'Handle 5 objections', progress: 3, total: 5 },
  { id: 3, title: 'Review call feedback', progress: 0, total: 1 },
]

export default function TrainingPage() {
  const { user } = useAuth()

  const userProgress = {
    totalSessions: 47,
    hoursLogged: 12.5,
    streak: 5,
    improvement: 23,
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Training</h1>
          <p className="text-[var(--text-secondary)]">Develop your skills with targeted practice</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)] mb-1">Sessions Completed</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{userProgress.totalSessions}</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)] mb-1">Hours Logged</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{userProgress.hoursLogged}</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)] mb-1">Day Streak</p>
            <p className="text-2xl font-semibold text-[var(--accent)]">{userProgress.streak}</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)] mb-1">Improvement</p>
            <p className="text-2xl font-semibold text-[var(--success)]">+{userProgress.improvement}%</p>
          </div>
        </div>

        {/* Daily Focus */}
        <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)] mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
              <h2 className="font-medium text-[var(--text-primary)]">Today's Focus</h2>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Resets in 14h</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {dailyFocus.map((item) => {
              const isComplete = item.progress >= item.total
              const progressPercent = (item.progress / item.total) * 100
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border ${
                    isComplete
                      ? 'bg-[var(--success-muted)] border-[var(--success)]'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)]'
                  }`}
                >
                  <p className={`text-sm font-medium mb-2 ${isComplete ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--bg-base)] rounded-full">
                      <div
                        className={`h-full rounded-full transition-all ${isComplete ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {item.progress}/{item.total}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Featured - Practice Sessions */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Start Training</h2>
          <Link
            href="/practice"
            className="block bg-[var(--bg-surface)] rounded-xl p-6 border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-colors group"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center">
                <Target className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-1">
                  Practice Sessions
                </h3>
                <p className="text-[var(--text-secondary)] mb-2">
                  Engage in AI-powered sales conversations with realistic buyer scenarios
                </p>
                <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                  <span>8 scenarios</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                  <span>4 difficulty levels</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                  <span>5 completed</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-[var(--text-muted)]">Progress</p>
                  <p className="text-xl font-semibold text-[var(--text-primary)]">5/8</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Play className="w-5 h-5 text-[var(--bg-base)] ml-0.5" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Training Modules */}
        <div>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-4">All Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainingSections.filter(s => !s.featured).map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className="block bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-5 h-5 text-[var(--text-secondary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {section.title}
                      </h3>
                      {section.isPremium && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--accent-muted)] text-[var(--accent)]">
                          Pro
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mb-3">{section.description}</p>
                    <div className="flex items-center justify-between">
                      {section.isReference ? (
                        <span className="text-xs text-[var(--text-muted)]">Reference library</span>
                      ) : section.modules ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-[var(--bg-elevated)] rounded-full">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{ width: `${(section.completed! / section.modules) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            {section.completed}/{section.modules}
                          </span>
                        </div>
                      ) : section.available ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          {section.completed} of {section.available} completed
                        </span>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
