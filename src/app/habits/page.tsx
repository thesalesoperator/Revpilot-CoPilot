'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Check,
  Target,
  Briefcase,
  User,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import Celebration, { useCelebration } from '@/components/ui/Celebration'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { isStreakMilestone, getStreakCelebrationMessage, getBadgeById } from '@/data/badges'
import type { Habit, HabitCompletion } from '@/types/database'

const DEFAULT_HABITS = [
  { name: 'Make 10 cold calls', category: 'professional' },
  { name: 'Send 5 follow-up emails', category: 'professional' },
  { name: 'Update CRM notes', category: 'professional' },
  { name: 'Review daily goals', category: 'professional' },
  { name: 'Practice pitch/script', category: 'professional' },
  { name: 'Exercise', category: 'personal' },
  { name: 'Read for 20 minutes', category: 'personal' },
  { name: 'Meditate', category: 'personal' },
  { name: 'Get 8 hours of sleep', category: 'personal' },
  { name: 'Drink water (8 glasses)', category: 'personal' },
]

interface HabitWithCompletions extends Habit {
  completions?: HabitCompletion[]
  completedToday?: boolean
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithCompletions[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [streak, setStreak] = useState(0)

  const { user } = useAuth()
  const { showToast } = useToast()
  const { celebration, showCelebration, hideCelebration } = useCelebration()
  const supabase = createClient()

  const getWeekDates = (offset: number = 0) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek + (offset * 7))

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return date
    })
  }

  const formatDateForDB = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
  }

  const isFuture = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate > today
  }

  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      const weekDates = getWeekDates(weekOffset)
      const startDate = formatDateForDB(weekDates[0])
      const endDate = formatDateForDB(weekDates[6])

      const [habitsRes, completionsRes, streakRes] = await Promise.all([
        supabase
          .from('habits')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('habit_completions')
          .select('*')
          .eq('user_id', user.id)
          .gte('completed_date', startDate)
          .lte('completed_date', endDate),
        supabase
          .from('user_streaks')
          .select('*')
          .eq('user_id', user.id)
          .eq('streak_type', 'habits')
          .single(),
      ])

      if (habitsRes.data) {
        const today = formatDateForDB(new Date())
        const habitsWithStatus = habitsRes.data.map((habit) => ({
          ...habit,
          completedToday: completionsRes.data?.some(
            (c) => c.habit_id === habit.id && c.completed_date === today
          ),
        }))
        setHabits(habitsWithStatus)
      }

      if (completionsRes.data) setCompletions(completionsRes.data)
      if (streakRes.data) setStreak(streakRes.data.current_streak)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase, weekOffset])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddHabit = async (name: string, category: 'personal' | 'professional') => {
    if (!user) return

    try {
      const { error } = await supabase.from('habits').insert({
        user_id: user.id,
        name,
        category,
        frequency: 'daily',
      })

      if (error) {
        showToast('error', `Failed to add habit: ${error.message}`)
        return
      }

      showToast('success', 'Habit added!')
      setIsAddModalOpen(false)
      fetchData()

      // Check for first habit badge
      if (habits.length === 0) {
        await awardBadge('first_habit')
      }
    } catch (error) {
      showToast('error', 'Failed to add habit')
    }
  }

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm('Delete this habit?')) return

    try {
      const { error } = await supabase.from('habits').delete().eq('id', habitId)
      if (error) throw error
      showToast('success', 'Habit deleted')
      fetchData()
    } catch (error) {
      showToast('error', 'Failed to delete habit')
    }
  }

  const handleToggleCompletion = async (habitId: string, date: Date) => {
    if (!user || isFuture(date)) return

    const dateStr = formatDateForDB(date)
    const existing = completions.find(
      (c) => c.habit_id === habitId && c.completed_date === dateStr
    )

    try {
      if (existing) {
        // Remove completion
        await supabase.from('habit_completions').delete().eq('id', existing.id)
      } else {
        // Add completion
        await supabase.from('habit_completions').insert({
          habit_id: habitId,
          user_id: user.id,
          completed_date: dateStr,
        })
      }

      fetchData()

      // Check for all habits completed today
      if (!existing && isToday(date)) {
        const todayStr = formatDateForDB(new Date())
        const todayCompletions = completions.filter((c) => c.completed_date === todayStr)
        if (todayCompletions.length + 1 === habits.length) {
          await updateStreak()
        }
      }
    } catch (error) {
      showToast('error', 'Failed to update habit')
    }
  }

  const updateStreak = async () => {
    if (!user) return

    try {
      const today = formatDateForDB(new Date())

      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .eq('streak_type', 'habits')
        .single()

      let newStreak = 1

      if (streakData) {
        const lastDate = streakData.last_activity_date
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = formatDateForDB(yesterday)

        if (lastDate === today) return
        if (lastDate === yesterdayStr) {
          newStreak = streakData.current_streak + 1
        }

        await supabase
          .from('user_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, streakData.longest_streak),
            last_activity_date: today,
          })
          .eq('id', streakData.id)
      } else {
        await supabase.from('user_streaks').insert({
          user_id: user.id,
          streak_type: 'habits',
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
        })
      }

      setStreak(newStreak)

      // Check for streak milestone
      if (isStreakMilestone(newStreak)) {
        const badgeId = `streak_${newStreak}`
        const badge = getBadgeById(badgeId)
        if (badge) {
          await awardBadge(badgeId)
          showCelebration(
            getStreakCelebrationMessage(newStreak),
            `You've completed all habits for ${newStreak} days straight!`,
            badge.icon,
            badge.name
          )
        }
      }
    } catch (error) {
      console.error('Error updating streak:', error)
    }
  }

  const awardBadge = async (badgeId: string) => {
    if (!user) return

    try {
      await supabase.from('user_badges').insert({
        user_id: user.id,
        badge_id: badgeId,
      })
    } catch (error) {
      // Badge might already exist
      console.error('Error awarding badge:', error)
    }
  }

  const weekDates = getWeekDates(weekOffset)
  const todayCompletedCount = habits.filter((h) => h.completedToday).length
  const todayProgress = habits.length > 0 ? (todayCompletedCount / habits.length) * 100 : 0

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Celebration {...celebration} onClose={hideCelebration} />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ffc1]/20 to-[#a78bfa]/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-[#00ffc1]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Daily Habits</h1>
              <p className="text-gray-400">Build consistency, build success</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Habit
          </button>
        </div>

        {/* Today's Progress & Streak */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Today's Progress */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Today&apos;s Progress</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] transition-all duration-500"
                    style={{ width: `${todayProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  {todayCompletedCount} of {habits.length} completed
                </p>
              </div>
              <div className="text-4xl font-bold text-[#00ffc1]">
                {Math.round(todayProgress)}%
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Habit Streak</h3>
            <div className="flex items-center gap-4">
              <div className="text-5xl animate-fire">
                <Flame className="w-12 h-12 text-orange-500" />
              </div>
              <div>
                <p className="text-4xl font-bold text-white">{streak}</p>
                <p className="text-gray-400">days in a row</p>
              </div>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-400" />
            </button>

            <div className="flex items-center gap-8">
              {weekDates.map((date, i) => (
                <div
                  key={i}
                  className={`text-center ${isToday(date) ? 'text-[#00ffc1]' : 'text-gray-400'}`}
                >
                  <p className="text-xs uppercase">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className={`text-lg font-bold ${isToday(date) ? 'text-[#00ffc1]' : 'text-white'}`}>
                    {date.getDate()}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setWeekOffset((prev) => Math.min(prev + 1, 0))}
              disabled={weekOffset >= 0}
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Habits List */}
        {habits.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No habits yet</h3>
            <p className="text-gray-400 mb-6">Add habits to start building your daily routine</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Your First Habit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="glass-card p-4 flex items-center gap-4"
              >
                {/* Habit Info */}
                <div className="flex items-center gap-3 w-64">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      habit.category === 'professional'
                        ? 'bg-[#00ffc1]/20'
                        : 'bg-[#a78bfa]/20'
                    }`}
                  >
                    {habit.category === 'professional' ? (
                      <Briefcase className="w-5 h-5 text-[#00ffc1]" />
                    ) : (
                      <User className="w-5 h-5 text-[#a78bfa]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{habit.name}</h4>
                    <p className="text-xs text-gray-500 capitalize">{habit.category}</p>
                  </div>
                </div>

                {/* Week Checkboxes */}
                <div className="flex-1 flex items-center justify-center gap-4">
                  {weekDates.map((date, i) => {
                    const dateStr = formatDateForDB(date)
                    const isCompleted = completions.some(
                      (c) => c.habit_id === habit.id && c.completed_date === dateStr
                    )
                    const isDisabled = isFuture(date)

                    return (
                      <button
                        key={i}
                        onClick={() => handleToggleCompletion(habit.id, date)}
                        disabled={isDisabled}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-[#00ffc1] text-[#00102e]'
                            : isDisabled
                            ? 'bg-[rgba(255,255,255,0.03)] text-gray-600 cursor-not-allowed'
                            : 'bg-[rgba(255,255,255,0.05)] text-gray-500 hover:bg-[rgba(255,255,255,0.1)]'
                        }`}
                      >
                        {isCompleted && <Check className="w-5 h-5" />}
                      </button>
                    )
                  })}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="p-2 rounded-lg text-gray-500 hover:text-[#ff6b8a] hover:bg-[rgba(255,0,67,0.1)] transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Habit Modal */}
      <AddHabitModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddHabit}
        existingHabits={habits.map((h) => h.name)}
      />
    </DashboardLayout>
  )
}

// Add Habit Modal
interface AddHabitModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, category: 'personal' | 'professional') => void
  existingHabits: string[]
}

function AddHabitModal({ isOpen, onClose, onAdd, existingHabits }: AddHabitModalProps) {
  const [selectedHabit, setSelectedHabit] = useState('')
  const [customName, setCustomName] = useState('')
  const [category, setCategory] = useState<'personal' | 'professional'>('professional')

  const availableDefaults = DEFAULT_HABITS.filter(
    (h) => !existingHabits.includes(h.name)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = selectedHabit === 'custom' ? customName : selectedHabit
    const cat = selectedHabit === 'custom'
      ? category
      : (DEFAULT_HABITS.find((h) => h.name === selectedHabit)?.category as 'personal' | 'professional') || 'professional'
    onAdd(name, cat)
    setSelectedHabit('')
    setCustomName('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Habit">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select a Habit</label>
          <select
            value={selectedHabit}
            onChange={(e) => setSelectedHabit(e.target.value)}
            className="select-field"
            required
          >
            <option value="">Choose a habit...</option>
            <optgroup label="Professional">
              {availableDefaults
                .filter((h) => h.category === 'professional')
                .map((h) => (
                  <option key={h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Personal">
              {availableDefaults
                .filter((h) => h.category === 'personal')
                .map((h) => (
                  <option key={h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
            </optgroup>
            <option value="custom">+ Custom Habit</option>
          </select>
        </div>

        {selectedHabit === 'custom' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Habit Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="input-field"
                placeholder="e.g., Practice objection handling"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'personal' | 'professional')}
                className="select-field"
              >
                <option value="professional">Professional</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedHabit || (selectedHabit === 'custom' && !customName)}
            className="btn-primary"
          >
            Add Habit
          </button>
        </div>
      </form>
    </Modal>
  )
}
