'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  Calendar,
  Sparkles,
  Sun,
  Cloud,
  CloudRain,
  Zap,
  Heart,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import type { JournalEntry } from '@/types/database'

const MOOD_OPTIONS = [
  { value: 1, emoji: '😫', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Challenging' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'Crushing It' },
]

const JOURNAL_PROMPTS = {
  what_went_well: {
    icon: Sun,
    title: 'What went well today?',
    placeholder: 'Celebrate your wins, big or small. What calls did you nail? What deals moved forward? What made you proud?',
    color: '#00ffc1',
  },
  what_didnt_go_well: {
    icon: CloudRain,
    title: "What didn't go as planned?",
    placeholder: "Be honest with yourself. What objections stumped you? Which prospects went cold? What felt frustrating?",
    color: '#ff6b8a',
  },
  what_to_improve: {
    icon: Zap,
    title: 'What can I improve tomorrow?',
    placeholder: 'One specific thing to focus on. A script tweak? Better discovery questions? More follow-ups?',
    color: '#ff9855',
  },
  where_need_support: {
    icon: Heart,
    title: 'Where do I need support?',
    placeholder: 'What resources, training, or help from others would make a difference? What are you struggling with?',
    color: '#a78bfa',
  },
}

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [entry, setEntry] = useState<Partial<JournalEntry>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [entries, setEntries] = useState<JournalEntry[]>([])

  const { user } = useAuth()
  const { showToast } = useToast()
  const supabase = createClient()

  const formatDateForDB = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const fetchEntry = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const dateStr = formatDateForDB(selectedDate)
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching entry:', error)
      }

      setEntry(data || {})
      setHasChanges(false)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase, selectedDate])

  const fetchRecentEntries = useCallback(async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(30)

      if (data) setEntries(data)
    } catch (error) {
      console.error('Error fetching entries:', error)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchEntry()
    fetchRecentEntries()
  }, [fetchEntry, fetchRecentEntries])

  const handleFieldChange = (field: keyof JournalEntry, value: string | number) => {
    setEntry((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const dateStr = formatDateForDB(selectedDate)
      const entryData = {
        user_id: user.id,
        entry_date: dateStr,
        what_went_well: entry.what_went_well || null,
        what_didnt_go_well: entry.what_didnt_go_well || null,
        what_to_improve: entry.what_to_improve || null,
        where_need_support: entry.where_need_support || null,
        additional_notes: entry.additional_notes || null,
        mood_rating: entry.mood_rating || null,
      }

      const { error } = await supabase
        .from('journal_entries')
        .upsert(entryData, { onConflict: 'user_id,entry_date' })

      if (error) {
        console.error('Error saving:', error)
        showToast('error', `Failed to save: ${error.message}`)
        return
      }

      showToast('success', 'Journal entry saved!')
      setHasChanges(false)
      fetchRecentEntries()

      // Update streak
      await updateStreak()
    } catch (error) {
      console.error('Error saving:', error)
      showToast('error', 'Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const updateStreak = async () => {
    if (!user) return

    try {
      const today = formatDateForDB(new Date())

      // Get current streak
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .eq('streak_type', 'journal')
        .single()

      if (streakData) {
        const lastDate = streakData.last_activity_date
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = formatDateForDB(yesterday)

        let newStreak = streakData.current_streak

        if (lastDate === today) {
          // Already logged today, no change
          return
        } else if (lastDate === yesterdayStr) {
          // Consecutive day
          newStreak += 1
        } else {
          // Streak broken
          newStreak = 1
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
        // Create new streak
        await supabase.from('user_streaks').insert({
          user_id: user.id,
          streak_type: 'journal',
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
        })
      }
    } catch (error) {
      console.error('Error updating streak:', error)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))

    // Don't allow future dates
    if (newDate > new Date()) return

    setSelectedDate(newDate)
  }

  const getEntriesForMonth = () => {
    const daysWithEntries = entries.map((e) => e.entry_date)
    return daysWithEntries
  }

  const hasEntryForDate = (date: Date) => {
    const dateStr = formatDateForDB(date)
    return entries.some((e) => e.entry_date === dateStr)
  }

  if (loading && !entry.id) {
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
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ffc1]/20 to-[#ff9855]/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#00ffc1]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Daily Journal</h1>
              <p className="text-gray-400">Reflect, learn, and grow every day</p>
            </div>
          </div>

          {/* Streak Display */}
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span className="text-2xl animate-fire">🔥</span>
            <div>
              <p className="text-sm text-gray-400">Journal Streak</p>
              <p className="text-xl font-bold text-[#00ffc1]">
                {entries.length > 0 ? `${entries.length} entries` : '0 days'}
              </p>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-400" />
            </button>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#00ffc1]" />
              <span className="text-lg font-medium text-white">
                {isToday(selectedDate) ? "Today's Reflection" : formatDisplayDate(selectedDate)}
              </span>
              {hasEntryForDate(selectedDate) && (
                <span className="text-xs bg-[#00ffc1]/20 text-[#00ffc1] px-2 py-1 rounded-full">
                  Completed
                </span>
              )}
            </div>

            <button
              onClick={() => navigateDate('next')}
              disabled={isToday(selectedDate)}
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Mood Rating */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How are you feeling today?</h3>
          <div className="mood-rating justify-center">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleFieldChange('mood_rating', mood.value)}
                className={`mood-btn ${entry.mood_rating === mood.value ? 'selected' : ''}`}
                title={mood.label}
              >
                {mood.emoji}
              </button>
            ))}
          </div>
          {entry.mood_rating && (
            <p className="text-center text-gray-400 mt-3">
              {MOOD_OPTIONS.find((m) => m.value === entry.mood_rating)?.label}
            </p>
          )}
        </div>

        {/* Journal Prompts */}
        <div className="space-y-6">
          {Object.entries(JOURNAL_PROMPTS).map(([key, prompt]) => {
            const Icon = prompt.icon
            return (
              <div key={key} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${prompt.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: prompt.color }} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{prompt.title}</h3>
                </div>
                <textarea
                  value={(entry[key as keyof JournalEntry] as string) || ''}
                  onChange={(e) => handleFieldChange(key as keyof JournalEntry, e.target.value)}
                  placeholder={prompt.placeholder}
                  className="textarea-field"
                  rows={4}
                />
              </div>
            )
          })}

          {/* Additional Notes */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[rgba(255,255,255,0.05)]">
                <Sparkles className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Additional Notes</h3>
            </div>
            <textarea
              value={entry.additional_notes || ''}
              onChange={(e) => handleFieldChange('additional_notes', e.target.value)}
              placeholder="Anything else on your mind? Ideas, goals, gratitude..."
              className="textarea-field"
              rows={3}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-primary flex items-center gap-2 px-8"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-[#00102e] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Entry
              </>
            )}
          </button>
        </div>

        {/* Recent Entries Preview */}
        {entries.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Entries</h3>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, i) => {
                const date = new Date()
                date.setDate(date.getDate() - (27 - i))
                const hasEntry = hasEntryForDate(date)
                const isSelected = date.toDateString() === selectedDate.toDateString()

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${
                      isSelected
                        ? 'bg-[#00ffc1] text-[#00102e] font-bold'
                        : hasEntry
                        ? 'bg-[#00ffc1]/20 text-[#00ffc1]'
                        : 'bg-[rgba(255,255,255,0.05)] text-gray-500 hover:bg-[rgba(255,255,255,0.1)]'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            <p className="text-center text-gray-500 text-sm mt-4">Last 4 weeks</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
