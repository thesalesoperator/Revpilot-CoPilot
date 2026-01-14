import type { BadgeDefinition } from '@/types/database'

// All available badges
export const BADGES: BadgeDefinition[] = [
  // Streak badges
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: '3-day streak',
    icon: '🔥',
    category: 'streak',
    requirement: 'Maintain any activity for 3 consecutive days',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day streak',
    icon: '⚡',
    category: 'streak',
    requirement: 'Maintain any activity for 7 consecutive days',
  },
  {
    id: 'streak_14',
    name: 'Two Week Champion',
    description: '14-day streak',
    icon: '💪',
    category: 'streak',
    requirement: 'Maintain any activity for 14 consecutive days',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day streak',
    icon: '🏆',
    category: 'streak',
    requirement: 'Maintain any activity for 30 consecutive days',
  },
  {
    id: 'streak_60',
    name: 'Unstoppable',
    description: '60-day streak',
    icon: '🌟',
    category: 'streak',
    requirement: 'Maintain any activity for 60 consecutive days',
  },
  {
    id: 'streak_90',
    name: 'Legendary',
    description: '90-day streak',
    icon: '👑',
    category: 'streak',
    requirement: 'Maintain any activity for 90 consecutive days',
  },
  {
    id: 'streak_365',
    name: 'Year of Excellence',
    description: '365-day streak',
    icon: '🎯',
    category: 'streak',
    requirement: 'Maintain any activity for a full year',
  },

  // Achievement badges
  {
    id: 'first_sale',
    name: 'First Blood',
    description: 'Logged your first sale',
    icon: '💰',
    category: 'achievement',
    requirement: 'Log your first sale in the dashboard',
  },
  {
    id: 'first_journal',
    name: 'Self Reflection',
    description: 'Wrote your first journal entry',
    icon: '📝',
    category: 'achievement',
    requirement: 'Complete your first daily journal entry',
  },
  {
    id: 'first_habit',
    name: 'Habit Builder',
    description: 'Created your first habit',
    icon: '✅',
    category: 'achievement',
    requirement: 'Create your first habit to track',
  },
  {
    id: 'habit_week',
    name: 'Consistency King',
    description: 'Completed all habits for 7 days',
    icon: '🎖️',
    category: 'achievement',
    requirement: 'Complete all your habits for 7 consecutive days',
  },
  {
    id: 'metrics_month',
    name: 'Data Driven',
    description: 'Logged metrics for 4 weeks straight',
    icon: '📊',
    category: 'achievement',
    requirement: 'Log your weekly metrics for a full month',
  },

  // Milestone badges
  {
    id: 'sales_10',
    name: 'Getting Traction',
    description: '10 sales logged',
    icon: '📈',
    category: 'milestone',
    requirement: 'Log 10 total sales',
  },
  {
    id: 'sales_50',
    name: 'Sales Machine',
    description: '50 sales logged',
    icon: '🚀',
    category: 'milestone',
    requirement: 'Log 50 total sales',
  },
  {
    id: 'sales_100',
    name: 'Century Club',
    description: '100 sales logged',
    icon: '💎',
    category: 'milestone',
    requirement: 'Log 100 total sales',
  },
  {
    id: 'commission_10k',
    name: 'Five Figure Earner',
    description: 'Earned $10,000 in commission',
    icon: '💵',
    category: 'milestone',
    requirement: 'Earn $10,000 in total commission',
  },
  {
    id: 'commission_50k',
    name: 'Top Performer',
    description: 'Earned $50,000 in commission',
    icon: '🏅',
    category: 'milestone',
    requirement: 'Earn $50,000 in total commission',
  },
  {
    id: 'commission_100k',
    name: 'Six Figure Closer',
    description: 'Earned $100,000 in commission',
    icon: '🏰',
    category: 'milestone',
    requirement: 'Earn $100,000 in total commission',
  },
]

// Get badge by ID
export const getBadgeById = (badgeId: string): BadgeDefinition | undefined => {
  return BADGES.find((b) => b.id === badgeId)
}

// Get badges by category
export const getBadgesByCategory = (category: BadgeDefinition['category']): BadgeDefinition[] => {
  return BADGES.filter((b) => b.category === category)
}

// Streak milestones that trigger celebrations
export const STREAK_CELEBRATION_MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365]

// Check if streak milestone was just reached
export const isStreakMilestone = (streak: number): boolean => {
  return STREAK_CELEBRATION_MILESTONES.includes(streak)
}

// Get celebration message for streak
export const getStreakCelebrationMessage = (streak: number): string => {
  if (streak >= 365) return "ONE YEAR! You're absolutely legendary! 🎯"
  if (streak >= 90) return "90 DAYS! You're in the top 1%! 👑"
  if (streak >= 60) return "60 DAYS! Unstoppable momentum! 🌟"
  if (streak >= 30) return "30 DAYS! A full month of excellence! 🏆"
  if (streak >= 14) return "2 WEEKS! You're building real habits! 💪"
  if (streak >= 7) return "1 WEEK! You're on fire! ⚡"
  if (streak >= 3) return "3 DAYS! Great start, keep going! 🔥"
  return `${streak} day streak! Keep it up!`
}
